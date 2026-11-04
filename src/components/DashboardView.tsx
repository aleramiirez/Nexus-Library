import React from 'react';
import { Library, Compass } from 'lucide-react';
import { Book, Saga, UserProfile } from '../types/models';
import type { User } from '@supabase/supabase-js';
import { NavigationSection } from './BookSidebar';
import { ProfileSetupBanner } from './ProfileSetupBanner';
import { DashboardReadingPanel } from './DashboardReadingPanel';
import { DashboardSagasPanel } from './DashboardSagasPanel';
import { DashboardFavoritesShelf } from './DashboardFavoritesShelf';
import { ReadingStreakDashboardWidget } from './ReadingStreakDashboardWidget';
import { SagaWithBooksItem } from './SagasScreen';
import '../dashboard-panels.css';

export interface DashboardMetrics {
  total: number;
  reading: number;
  unread: number;
  paused: number;
  read: number;
}

export interface DashboardViewProps {
  darkMode: boolean;
  currentUser: User | null;
  currentUserProfile: UserProfile | null;
  isProfileSetupPending: boolean;
  metrics: DashboardMetrics;
  books: Book[];
  sagas: Saga[];
  sagasWithBooks: SagaWithBooksItem[];
  detailBookId: string | null;
  isLoadingSample: boolean;
  onNavigate: (section: NavigationSection) => void;
  onNavigateToSettingsAccount: () => void;
  onOpenBookDetail: (bookId: string) => void;
  onLoadSampleBooks: () => void;
  onOpenImport: () => void;
  onUpdateProgress?: (bookId: string, paginaActual: number, totalPaginas?: number) => Promise<void>;
  onShowToast?: (message: string, options?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  darkMode,
  currentUser,
  currentUserProfile,
  isProfileSetupPending,
  metrics,
  books,
  sagas,
  sagasWithBooks,
  detailBookId,
  isLoadingSample,
  onNavigate,
  onNavigateToSettingsAccount,
  onOpenBookDetail,
  onLoadSampleBooks,
  onOpenImport,
  onUpdateProgress,
  onShowToast
}) => {
  return (
    <div className="space-y-6">
      {/* Banner hero */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-800/35 dark:border-amber-500/30 bg-[#2a1d12] dark:bg-[#080C15] p-5 sm:p-8 lg:px-10 lg:py-12 shadow-xl dark:shadow-2xl min-h-[190px] sm:min-h-[245px] flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 transition-colors duration-700">
        <img
          src="/banner-library.png"
          alt=""
          aria-hidden="true"
          className={
            'pointer-events-none select-none absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ease-in-out ' +
            (darkMode ? 'opacity-100' : 'opacity-0')
          }
        />
        <img
          src="/banner-library-light.png"
          alt=""
          aria-hidden="true"
          className={
            'pointer-events-none select-none absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ease-in-out ' +
            (darkMode ? 'opacity-0' : 'opacity-100')
          }
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#24160b]/85 via-[#24160b]/55 to-[#24160b]/15 dark:from-[#080C15]/90 dark:via-[#080C15]/60 dark:to-[#080C15]/25 transition-colors duration-700" />

        <div className="relative z-10 max-w-xl">
          <span className="text-[11px] uppercase tracking-[0.22em] text-amber-300 dark:text-amber-400 font-semibold drop-shadow">
            Biblioteca Digital Personal
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#fffcf5] dark:text-white mt-1 drop-shadow-md">
            Panel de Lectura NEXUS
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-amber-50/95 dark:text-slate-200/95 mt-2 leading-relaxed drop-shadow">
            Explora tu colección visual de libros, organiza tus lecturas por estanterías y
            sagas, y añade nuevas ediciones buscando por título, autor o ISBN con portada
            automática.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('library')}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-lg shadow-black/50 transition"
          >
            <Library className="w-4 h-4" /> Ver Mi Biblioteca
          </button>
          <button
            type="button"
            onClick={() => onNavigate('discover')}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 dark:border-amber-400/50 bg-[#1e130a]/70 dark:bg-[#0B0E14]/75 hover:bg-amber-500/25 dark:hover:bg-amber-500/20 backdrop-blur-sm text-amber-100 dark:text-amber-200 font-semibold px-4 py-2.5 text-xs transition"
          >
            <Compass className="w-4 h-4" /> Explorar y Descubrir
          </button>
        </div>
      </div>

      {/* Banner de perfil pendiente para usuarios recién registrados */}
      {currentUser && currentUserProfile && isProfileSetupPending && (
        <ProfileSetupBanner
          userProfile={currentUserProfile}
          userId={currentUser.id}
          onGoToSettings={onNavigateToSettingsAccount}
        />
      )}

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5">
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className="rounded-xl editorial-card-surface editorial-card-interactive p-3 sm:p-4 text-left active:scale-[0.98]"
        >
          <span className="text-[11px] sm:text-xs text-stone-600 dark:text-slate-400">Total de Libros</span>
          <p className="font-serif text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{metrics.total}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('shelf-reading')}
          className="rounded-xl border border-amber-600/40 dark:border-amber-500/30 bg-amber-500/15 dark:bg-amber-500/10 p-3 sm:p-4 text-left active:scale-[0.98] sm:hover:-translate-y-1 hover:border-amber-600 dark:hover:border-amber-400 hover:shadow-[0_10px_24px_-6px_rgba(245,158,11,0.22)] transition-all duration-300"
        >
          <span className="text-[11px] sm:text-xs font-semibold text-amber-800 dark:text-amber-300">⏳ Leyendo</span>
          <p className="font-serif text-xl sm:text-3xl font-bold text-amber-900 dark:text-amber-200 mt-0.5 sm:mt-1">
            {metrics.reading}
          </p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('shelf-unread')}
          className="rounded-xl editorial-card-surface editorial-card-interactive p-3 sm:p-4 text-left active:scale-[0.98]"
        >
          <span className="text-[11px] sm:text-xs text-stone-600 dark:text-slate-400">❌ Por leer</span>
          <p className="font-serif text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{metrics.unread}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('shelf-paused')}
          className="rounded-xl editorial-card-surface editorial-card-interactive p-3 sm:p-4 text-left active:scale-[0.98]"
        >
          <span className="text-[11px] sm:text-xs font-semibold text-rose-700 dark:text-rose-300">⏸️ Pausados</span>
          <p className="font-serif text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{metrics.paused}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('shelf-read')}
          className="rounded-xl border border-emerald-600/40 dark:border-emerald-500/30 bg-emerald-500/15 dark:bg-emerald-500/10 p-3 sm:p-4 text-left active:scale-[0.98] sm:hover:-translate-y-1 hover:border-emerald-600 dark:hover:border-emerald-400 hover:shadow-[0_10px_24px_-6px_rgba(16,185,129,0.22)] transition-all duration-300 col-span-2 sm:col-span-1 flex sm:block items-center justify-between"
        >
          <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 dark:text-emerald-300">✅ Leídos</span>
          <p className="font-serif text-xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-200 sm:mt-1">
            {metrics.read}
          </p>
        </button>
      </div>

      {/* Paneles de lectura y sagas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 xl:col-span-8">
          <DashboardReadingPanel
            readingBooks={books.filter((b) => b.progreso === '⏳ Leyendo')}
            onOpenDetail={onOpenBookDetail}
            onNavigateToShelf={() => onNavigate('shelf-reading')}
            onUpdateProgress={onUpdateProgress}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <DashboardSagasPanel
            sagasWithBooks={sagasWithBooks}
            totalSagasCount={sagas.length}
            onNavigateToSagas={() => onNavigate('sagas')}
          />
        </div>
      </div>

      {/* Widget de Racha y Hábito de Lectura */}
      <ReadingStreakDashboardWidget
        books={books}
        onNavigateToStats={() => onNavigate('stats')}
        onShowToast={onShowToast}
      />

      {/* Estantería de favoritos */}
      <DashboardFavoritesShelf
        favoriteBooks={[...books]
          .filter((b) => b.puntuacion !== null)
          .sort((a, b) => {
            const diff = (b.puntuacion || 0) - (a.puntuacion || 0);
            if (diff !== 0) return diff;
            return b.createdAt.localeCompare(a.createdAt);
          })}
        hasAnyBooks={books.length > 0}
        hasRatedBooks={books.some((b) => b.puntuacion !== null)}
        onOpenDetail={onOpenBookDetail}
        onNavigateToLibrary={() => onNavigate('library')}
        onLoadSampleBooks={onLoadSampleBooks}
        isLoadingSample={isLoadingSample}
        onOpenImport={onOpenImport}
        openedBookId={detailBookId}
      />
    </div>
  );
};
