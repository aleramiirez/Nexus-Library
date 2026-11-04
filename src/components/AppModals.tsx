import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import {
  Book,
  Saga,
  UserProfile,
  StarRating,
  BookRecommendationPayload
} from '../types/models';
import { ReadingStatus } from '../constants/catalogs';
import { SyncMigrationResult } from '../db/database';
import { UseLibraryModalsReturn } from '../hooks/useLibraryModals';
import { ToastType, ToastOptions } from '../hooks/useAppNotifications';
import { PwaInstallModal } from './PwaInstallModal';
import { NavigationSection } from './BookSidebar';

const BookDetailModal = React.lazy(() =>
  import('./BookDetailModal').then((m) => ({ default: m.BookDetailModal }))
);
const AddEditBookModal = React.lazy(() =>
  import('./AddEditBookModal').then((m) => ({ default: m.AddEditBookModal }))
);
const ImportModal = React.lazy(() =>
  import('./ImportModal').then((m) => ({ default: m.ImportModal }))
);
const EpubImportModal = React.lazy(() =>
  import('./EpubImportModal').then((m) => ({ default: m.EpubImportModal }))
);
const AuthSyncModal = React.lazy(() =>
  import('./AuthSyncModal').then((m) => ({ default: m.AuthSyncModal }))
);
const BookInboxModal = React.lazy(() =>
  import('./BookInboxModal').then((m) => ({ default: m.BookInboxModal }))
);
const FirstLoginProfileModal = React.lazy(() =>
  import('./FirstLoginProfileModal').then((m) => ({ default: m.FirstLoginProfileModal }))
);
const BookFinishedCelebrationModal = React.lazy(() =>
  import('./BookFinishedCelebrationModal').then((m) => ({ default: m.BookFinishedCelebrationModal }))
);
const ShareBookCardModal = React.lazy(() =>
  import('./ShareBookCardModal').then((m) => ({ default: m.ShareBookCardModal }))
);
const NexusOrderCodexModal = React.lazy(() =>
  import('./NexusOrderCodexModal').then((m) => ({ default: m.NexusOrderCodexModal }))
);

export interface AppModalsProps {
  modals: UseLibraryModalsReturn;
  books: Book[];
  sagas: Saga[];
  currentUser: User | null;
  currentUserProfile: UserProfile | null;
  guestAlias: string;
  guestAvatar: string | null;
  readerLevelInfo: ReturnType<typeof import('../services/levelingService').calculateReaderLevel>;
  syncResult: SyncMigrationResult | null;
  isSyncing: boolean;
  runCloudSync: () => Promise<void>;
  refreshInboxCount: () => void;
  showToast: (message: string, optionsOrType?: ToastType | ToastOptions) => void;
  onOpenEditBook: (book: Book) => void;
  onBookStatusChange: (bookId: string, status: ReadingStatus) => void;
  onUpdateBookReadingProgress?: (bookId: string, paginaActual: number, totalPaginas?: number) => Promise<void>;
  updateBookQuickRating: (bookId: string, rating: StarRating | null) => void;
  updateBookQuickDates: (bookId: string, fechaInicio: string, fechaFin: string) => Promise<void> | void;
  saveBookRecord: (bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<Book>;
  handleAddRecommendedBook: (payload: BookRecommendationPayload) => Promise<void>;
  handleUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  handleNavigateToSettingsAccount: () => void;
  handleNavigate: (section: NavigationSection) => void;
  confirmDeleteBook: () => void;
  confirmDeleteSaga: () => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  modals,
  books,
  sagas,
  currentUser,
  currentUserProfile,
  guestAlias,
  guestAvatar,
  readerLevelInfo,
  syncResult,
  isSyncing,
  runCloudSync,
  refreshInboxCount,
  showToast,
  onOpenEditBook,
  onBookStatusChange,
  onUpdateBookReadingProgress,
  updateBookQuickRating,
  updateBookQuickDates,
  saveBookRecord,
  handleAddRecommendedBook,
  handleUpdateProfile,
  handleNavigateToSettingsAccount,
  handleNavigate,
  confirmDeleteBook,
  confirmDeleteSaga
}) => {
  const activeDetailBook = React.useMemo(() => {
    if (!modals.detailBookId) return null;
    return books.find((b) => b.id === modals.detailBookId) || null;
  }, [books, modals.detailBookId]);

  return (
    <>
      <React.Suspense fallback={null}>
        {activeDetailBook && (
          <BookDetailModal
            book={activeDetailBook}
            onClose={() => modals.setDetailBookId(null)}
            onEdit={onOpenEditBook}
            onDelete={(b) => modals.setBookToDelete(b)}
            onStatusChange={onBookStatusChange}
            onRatingChange={updateBookQuickRating}
            onDatesChange={updateBookQuickDates}
            onUpdateProgress={onUpdateBookReadingProgress}
            currentUserId={currentUser?.id}
            readerName={currentUserProfile?.displayName || (!currentUser ? guestAlias : null) || undefined}
            onShowToast={showToast}
          />
        )}

        {modals.isAddEditOpen && (
          <AddEditBookModal
            isOpen={modals.isAddEditOpen}
            editingBook={modals.editingBook}
            initialCandidate={modals.selectedInitialCandidate}
            initialParsedEbook={modals.selectedParsedEbook}
            sagas={sagas}
            existingBooks={books}
            onClose={() => {
              modals.setIsAddEditOpen(false);
              modals.setSelectedInitialCandidate(null);
              modals.setSelectedParsedEbook(null);
            }}
            onSave={async (data, id) => {
              const previousBook = id ? books.find((b) => b.id === id) : null;
              const savedBook = await saveBookRecord(data as Omit<Book, 'id' | 'createdAt' | 'updatedAt'>, id);
              if (data.progreso === '✅ Leído' && (!previousBook || previousBook.progreso !== '✅ Leído')) {
                const fullBook = { ...(previousBook || {}), ...data, id: id || savedBook.id } as Book;
                modals.setCelebrationBook(fullBook);
              }
            }}
            onOpenMultiEpubImport={(files) => {
              modals.setInitialEpubFiles(files);
              modals.setIsEpubImportOpen(true);
            }}
          />
        )}

        {modals.isEpubImportOpen && (
          <EpubImportModal
            isOpen={modals.isEpubImportOpen}
            existingBooks={books}
            sagas={sagas}
            initialFiles={modals.initialEpubFiles}
            onClose={() => {
              modals.setIsEpubImportOpen(false);
              modals.setInitialEpubFiles(undefined);
            }}
            onSaveBook={async (data, id) => {
              await saveBookRecord(data as Omit<Book, 'id' | 'createdAt' | 'updatedAt'>, id);
            }}
            onOpenInEditor={(parsed) => {
              modals.setIsEpubImportOpen(false);
              modals.setInitialEpubFiles(undefined);
              modals.setEditingBook(null);
              modals.setSelectedInitialCandidate(null);
              modals.setSelectedParsedEbook(parsed);
              modals.setIsAddEditOpen(true);
            }}
            onShowToast={(msg) => showToast(msg, 'success')}
          />
        )}

        {modals.isImportOpen && (
          <ImportModal
            isOpen={modals.isImportOpen}
            books={books}
            sagas={sagas}
            onClose={() => modals.setIsImportOpen(false)}
            onOpenEpubImport={() => {
              modals.setInitialEpubFiles(undefined);
              modals.setIsEpubImportOpen(true);
            }}
          />
        )}

        {modals.isAuthModalOpen && (
          <AuthSyncModal
            isOpen={modals.isAuthModalOpen}
            user={currentUser}
            syncResult={syncResult}
            isSyncing={isSyncing}
            onTriggerSync={runCloudSync}
            onClose={() => modals.setIsAuthModalOpen(false)}
          />
        )}

        {modals.isInboxOpen && (
          <BookInboxModal
            isOpen={modals.isInboxOpen}
            currentUserId={currentUser?.id}
            userProfile={currentUserProfile}
            initialTab={modals.inboxInitialTab}
            onClose={() => {
              modals.setIsInboxOpen(false);
              refreshInboxCount();
            }}
            onAddBookToLibrary={handleAddRecommendedBook}
            onShowToast={showToast}
            onInboxUpdated={refreshInboxCount}
            onNavigateToSettingsAccount={handleNavigateToSettingsAccount}
          />
        )}

        {modals.isFirstLoginModalOpen && currentUser && currentUserProfile && (
          <FirstLoginProfileModal
            isOpen={modals.isFirstLoginModalOpen}
            onClose={() => modals.setIsFirstLoginModalOpen(false)}
            userProfile={currentUserProfile}
            userId={currentUser.id}
            onUpdateProfile={handleUpdateProfile}
            onGoToSettings={handleNavigateToSettingsAccount}
            onShowToast={showToast}
          />
        )}

        {modals.celebrationBook && (
          <BookFinishedCelebrationModal
            isOpen={Boolean(modals.celebrationBook)}
            book={modals.celebrationBook}
            books={books}
            sagas={sagas}
            booksReadCount={books.filter((b) => b.progreso && b.progreso.includes('Leído')).length + 1}
            readerDisplayName={currentUserProfile?.displayName || (!currentUser ? guestAlias : null) || undefined}
            readerUsername={currentUserProfile?.username}
            onClose={() => modals.setCelebrationBook(null)}
            onOpenShareCard={(book) => {
              modals.setCelebrationBook(null);
              modals.setShareCardBook(book);
            }}
            onOpenChallenge={() => {
              modals.setCelebrationBook(null);
              modals.setDetailBookId(null);
              modals.setIsAddEditOpen(false);
              modals.setEditingBook(null);
              handleNavigate('stats');
            }}
            onShowToast={showToast}
          />
        )}

        {modals.shareCardBook && (
          <ShareBookCardModal
            isOpen={Boolean(modals.shareCardBook)}
            book={modals.shareCardBook}
            readerDisplayName={currentUserProfile?.displayName || (!currentUser ? guestAlias : null) || undefined}
            readerUsername={currentUserProfile?.username}
            onClose={() => modals.setShareCardBook(null)}
            onShowToast={showToast}
          />
        )}

        {modals.isOrderModalOpen && (
          <NexusOrderCodexModal
            isOpen={modals.isOrderModalOpen}
            onClose={() => modals.setIsOrderModalOpen(false)}
            levelInfo={readerLevelInfo}
            avatarUrl={currentUser ? currentUserProfile?.avatarUrl : guestAvatar}
            displayName={currentUserProfile?.displayName || (!currentUser ? guestAlias : null)}
            username={currentUserProfile?.username}
            onShowToast={showToast}
          />
        )}
      </React.Suspense>

      {/* Diálogo de confirmación de eliminación de libro */}
      {modals.bookToDelete &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Cancelar y cerrar diálogo"
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-default border-0 p-0"
              onClick={() => modals.setBookToDelete(null)}
            />
            <div
              className="relative w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-6 space-y-4 shadow-2xl z-10"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="delete-dialog-title" className="font-serif text-lg font-bold text-stone-900 dark:text-slate-100">
                    Confirmar eliminación
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed">
                ¿Seguro que deseas eliminar <strong>"{modals.bookToDelete.nombre}"</strong> de tu biblioteca?
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => modals.setBookToDelete(null)}
                  className="rounded-xl border border-stone-300 dark:border-slate-700 px-4 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteBook}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 text-xs transition shadow-sm"
                >
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Diálogo de confirmación de eliminación de saga */}
      {modals.sagaToDelete &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-saga-dialog-title"
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Cancelar y cerrar diálogo"
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-default border-0 p-0"
              onClick={() => modals.setSagaToDelete(null)}
            />
            <div
              className="relative w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-6 space-y-4 shadow-2xl z-10"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="delete-saga-dialog-title" className="font-serif text-lg font-bold text-rose-700 dark:text-rose-400">
                    Confirmar eliminación de saga
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Los libros asociados se conservarán
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed">
                ¿Eliminar la saga <strong>"{modals.sagaToDelete.nombre}"</strong>? Los libros asociados se conservarán en tu biblioteca como libros independientes.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => modals.setSagaToDelete(null)}
                  className="rounded-xl border border-stone-300 dark:border-slate-700 px-4 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSaga}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 text-xs transition shadow-sm"
                >
                  Eliminar saga
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <PwaInstallModal
        isOpen={modals.isInstallModalOpen}
        onClose={() => modals.setIsInstallModalOpen(false)}
      />
    </>
  );
};
