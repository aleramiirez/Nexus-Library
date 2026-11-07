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
  onStartReadingSession?: (book: Book) => void;
  onOpenOracle?: () => void;
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
  onStartReadingSession,
  onOpenOracle,
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
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-lg shadow-black/50 transition cursor-pointer"
          >
            <Library className="w-4 h-4" /> Ver Mi Biblioteca
          </button>
          <button
            type="button"
            onClick={() => onNavigate('discover')}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 dark:border-amber-400/50 bg-[#1e130a]/70 dark:bg-[#0B0E14]/75 hover:bg-amber-500/25 dark:hover:bg-amber-500/20 backdrop-blur-sm text-amber-100 dark:text-amber-200 font-semibold px-4 py-2.5 text-xs transition cursor-pointer"
          >
            <Compass className="w-4 h-4" /> Descubrir
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
          className="dashboard-quick-kpi"
        >
          <span className="dashboard-quick-kpi-label">Total de Libros</span>
          <p className="dashboard-quick-kpi-value">{metrics.total}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('shelf-reading')}
          className="dashboard-quick-kpi is-reading"
        >
          <span className="dashboard-quick-kpi-label">⏳ Leyendo</span>
          <p className="dashboard-quick-kpi-value">
            {metrics.reading}
          </p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('shelf-unread')}
          className="dashboard-quick-kpi"
        >
          <span className="dashboard-quick-kpi-label">❌ Por leer</span>
          <p className="dashboard-quick-kpi-value">{metrics.unread}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('shelf-paused')}
          className="dashboard-quick-kpi is-paused"
        >
          <span className="dashboard-quick-kpi-label">⏸️ Pausados</span>
          <p className="dashboard-quick-kpi-value">{metrics.paused}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('shelf-read')}
          className="dashboard-quick-kpi is-read col-span-2 sm:col-span-1"
        >
          <span className="dashboard-quick-kpi-label">✅ Leídos</span>
          <p className="dashboard-quick-kpi-value">
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
            onStartReadingSession={onStartReadingSession}
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
