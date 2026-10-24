import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LayoutDashboard,
  Library,
  Layers,
  BarChart3,
  Compass,
  Plus,
  Search,
  Grid,
  List,
  Rows3,
  Sun,
  Moon,
  RotateCcw,
  Trash2,
  Edit3,
  BookmarkCheck,
  Clock,
  PauseCircle,
  BookMarked,
  HardDrive,
  Cloud,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  ArrowUpDown,
  AlertTriangle,
  LogIn,
  Menu,
  X
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import {
  assignBookToSagaRecord,
  db,
  deleteBookRecord,
  deleteSagaAndUnlinkBooks,
  requestPersistentStorage,
  saveBookRecord,
  syncAndMigrateWithSupabase,
  SyncMigrationResult,
  updateBookQuickDates,
  updateBookQuickRating,
  updateBookQuickStatus,
  upsertSaga
} from './db/database';
import {
  fetchSupabaseAuthSettings,
  supabase
} from './services/supabaseClient';
import {
  BibliographicCandidate,
  Book,
  LibraryFilters,
  LibraryViewMode,
  Saga,
  SortField,
  StarRating
} from './types/models';
import {
  formatStars,
  GENRES,
  Genre,
  READING_STATUSES,
  ReadingStatus,
  STAR_OPTIONS,
  SUBGENRES,
  Subgenre
} from './constants/catalogs';
import { BookCard } from './components/BookCard';
import { BookCover } from './components/BookCover';
import { AuthScreen } from './components/AuthScreen';
import { AnimatedBackground } from './components/AnimatedBackground';
import { BookSidebar, NavigationSection } from './components/BookSidebar';
import { BookShelf } from './components/BookShelf';
import { SagaProgressBar } from './components/SagaProgressBar';
import { candidateToBookInput } from './services/bookMetadataService';

const BookDetailModal = React.lazy(() =>
  import('./components/BookDetailModal').then((m) => ({ default: m.BookDetailModal }))
);
const AddEditBookModal = React.lazy(() =>
  import('./components/AddEditBookModal').then((m) => ({ default: m.AddEditBookModal }))
);
const ImportModal = React.lazy(() =>
  import('./components/ImportModal').then((m) => ({ default: m.ImportModal }))
);
const AuthSyncModal = React.lazy(() =>
  import('./components/AuthSyncModal').then((m) => ({ default: m.AuthSyncModal }))
);
const DiscoverBooksScreen = React.lazy(() =>
  import('./components/DiscoverBooksScreen').then((m) => ({ default: m.DiscoverBooksScreen }))
);

const initialFilters: LibraryFilters = {
  search: '',
  genero: '',
  subgenero: '',
  progreso: '',
  sagaId: '',
  puntuacion: '',
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

export const App: React.FC = () => {
  const books = useLiveQuery(() => db.books.toArray(), [], [] as Book[]);
  const sagas = useLiveQuery(() => db.sagas.toArray(), [], [] as Saga[]);

  const [activeSection, setActiveSection] = useState<NavigationSection>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('nexus_library_theme');
    // Predomina el tema claro por defecto; solo se activa si el usuario lo configuró explícitamente en la app
    return stored === 'dark';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<LibraryViewMode>('shelf');
  const [filters, setFilters] = useState<LibraryFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const [detailBookId, setDetailBookId] = useState<string | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedInitialCandidate, setSelectedInitialCandidate] = useState<BibliographicCandidate | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [offlineGuestMode, setOfflineGuestMode] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncMigrationResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [sagaFormOpen, setSagaFormOpen] = useState(false);
  const [editingSaga, setEditingSaga] = useState<Saga | null>(null);
  const [sagaNameInput, setSagaNameInput] = useState('');
  const [sagaDescInput, setSagaDescInput] = useState('');
  const [sagaError, setSagaError] = useState('');
  const [assignBookId, setAssignBookId] = useState<string>('');
  const [assignVolume, setAssignVolume] = useState<string>('1');
  const [activeSagaIdForAssign, setActiveSagaIdForAssign] = useState<string | null>(null);

  const isAnyModalOpen = Boolean(
    mobileMenuOpen ||
    isAddEditOpen ||
    detailBookId ||
    isImportOpen ||
    isAuthModalOpen ||
    bookToDelete ||
    sagaFormOpen
  );

  // Bloquea el scroll del fondo mientras cualquier modal o menú móvil está abierto
  useEffect(() => {
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  // Soporte de tecla Escape para cerrar modales y paneles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (bookToDelete) {
          setBookToDelete(null);
        } else if (isAddEditOpen) {
          setIsAddEditOpen(false);
          setSelectedInitialCandidate(null);
        } else if (detailBookId) {
          setDetailBookId(null);
        } else if (isImportOpen) {
          setIsImportOpen(false);
        } else if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        } else if (sagaFormOpen) {
          setSagaFormOpen(false);
          setEditingSaga(null);
        } else if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    bookToDelete,
    isAddEditOpen,
    detailBookId,
    isImportOpen,
    isAuthModalOpen,
    sagaFormOpen,
    mobileMenuOpen
  ]);

  const runCloudSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAndMigrateWithSupabase();
      setSyncResult(res);
      if (res.error) {
        setGlobalError(res.error);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    requestPersistentStorage();

    let mounted = true;
    const initAuthAndSync = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        if (data.session?.user) {
          setCurrentUser(data.session.user);
          setAuthLoading(false);
          await runCloudSync();
        } else {
          const settings = await fetchSupabaseAuthSettings();
          if (mounted && settings.anonymousEnabled) {
            const { data: anonData } = await supabase.auth.signInAnonymously();
            if (mounted && anonData.user) {
              setCurrentUser(anonData.user);
              setAuthLoading(false);
              await runCloudSync();
              return;
            }
          }
          if (mounted) {
            setAuthLoading(false);
          }
        }
      } catch {
        if (mounted) setAuthLoading(false);
      }
    };

    initAuthAndSync();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      setCurrentUser(nextUser);
      setIsAuthModalOpen(false);
      if (nextUser) {
        setOfflineGuestMode(false);
        runCloudSync();
      } else {
        setSyncResult(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      try {
        localStorage.setItem('nexus_library_theme', 'dark');
      } catch {}
    } else {
      root.classList.remove('dark');
      try {
        localStorage.setItem('nexus_library_theme', 'light');
      } catch {}
    }
  }, [darkMode]);

  const activeDetailBook = useMemo(
    () => books.find((b) => b.id === detailBookId) || null,
    [books, detailBookId]
  );

  const metrics = useMemo(() => {
    let unread = 0;
    let reading = 0;
    let paused = 0;
    let read = 0;
    let totalPages = 0;
    let totalScore = 0;
    let ratedCount = 0;

    for (const b of books) {
      if (b.progreso === '❌ No Leído') unread++;
      else if (b.progreso === '⏳ Leyendo') reading++;
      else if (b.progreso === '⏸️ Pausado') paused++;
      else if (b.progreso === '✅ Leído') read++;

      if (b.paginas) totalPages += b.paginas;

      if (b.puntuacion !== null && b.puntuacion !== undefined) {
        ratedCount++;
        totalScore += b.puntuacion;
      }
    }

    return {
      total: books.length,
      unread,
      reading,
      paused,
      read,
      pendingTotal: unread + reading + paused,
      totalPages,
      ratedCount,
      avgRating: ratedCount > 0 ? totalScore / ratedCount : null
    };
  }, [books]);

  const topAuthors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of books) {
      const a = b.autor.trim();
      if (!a) continue;
      counts.set(a, (counts.get(a) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [books]);

  const filteredBooks = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    const matches = books.filter((book) => {
      if (q) {
        const inTitle = book.nombre.toLowerCase().includes(q);
        const inAuthor = book.autor.toLowerCase().includes(q);
        const inIsbn = book.isbn.toLowerCase().includes(q);
        if (!inTitle && !inAuthor && !inIsbn) return false;
      }
      if (filters.genero && book.genero !== filters.genero) return false;
      if (filters.subgenero && !book.subgeneros.includes(filters.subgenero)) return false;
      if (filters.progreso && book.progreso !== filters.progreso) return false;
      if (filters.sagaId) {
        if (filters.sagaId === '__none__' && book.sagaId !== null) return false;
        if (filters.sagaId !== '__none__' && book.sagaId !== filters.sagaId) return false;
      }
      if (filters.puntuacion !== '') {
        if (filters.puntuacion === 'unrated' && book.puntuacion !== null) return false;
        if (typeof filters.puntuacion === 'number' && book.puntuacion !== filters.puntuacion) {
          return false;
        }
      }
      return true;
    });

    return matches.sort((a, b) => {
      const dir = filters.sortOrder === 'asc' ? 1 : -1;
      switch (filters.sortBy) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre, 'es') * dir;
        case 'autor':
          return (a.autor || '').localeCompare(b.autor || '', 'es') * dir;
        case 'fechaPublicacion':
          return ((a.fechaPublicacion ?? 0) - (b.fechaPublicacion ?? 0)) * dir;
        case 'puntuacion':
          return ((a.puntuacion ?? 0) - (b.puntuacion ?? 0)) * dir;
        case 'paginas':
          return ((a.paginas ?? 0) - (b.paginas ?? 0)) * dir;
        case 'createdAt':
        default:
          return a.createdAt.localeCompare(b.createdAt) * dir;
      }
    });
  }, [books, filters]);

  const sagasWithBooks = useMemo(() => {
    const booksBySaga = new Map<string, Book[]>();
    for (const b of books) {
      if (b.sagaId) {
        let list = booksBySaga.get(b.sagaId);
        if (!list) {
          list = [];
          booksBySaga.set(b.sagaId, list);
        }
        list.push(b);
      }
    }

    return sagas
      .map((saga) => {
        const sagaBooks = (booksBySaga.get(saga.id) || [])
          .slice()
          .sort((a, b) => (a.volumen ?? 999) - (b.volumen ?? 999));
        let readCount = 0;
        for (const b of sagaBooks) {
          if (b.progreso === '✅ Leído') readCount++;
        }
        const pendingCount = sagaBooks.length - readCount;
        const progressPercent =
          sagaBooks.length > 0 ? Math.round((readCount / sagaBooks.length) * 100) : 0;

        return {
          saga,
          books: sagaBooks,
          registeredCount: sagaBooks.length,
          readCount,
          pendingCount,
          progressPercent
        };
      })
      .sort((a, b) => a.saga.nombre.localeCompare(b.saga.nombre, 'es'));
  }, [sagas, books]);

  const handleOpenCreateBook = () => {
    setSelectedInitialCandidate(null);
    setEditingBook(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEditBook = (book: Book) => {
    setSelectedInitialCandidate(null);
    setDetailBookId(null);
    setEditingBook(book);
    setIsAddEditOpen(true);
  };

  const handleQuickAddFromDiscover = async (candidate: BibliographicCandidate) => {
    const bookInput = candidateToBookInput(candidate);
    await saveBookRecord(bookInput);
  };

  const handleCustomizeFromDiscover = (candidate: BibliographicCandidate) => {
    setEditingBook(null);
    setSelectedInitialCandidate(candidate);
    setIsAddEditOpen(true);
  };

  const confirmDeleteBook = async () => {
    if (!bookToDelete) return;
    try {
      await deleteBookRecord(bookToDelete.id);
      if (detailBookId === bookToDelete.id) setDetailBookId(null);
      setBookToDelete(null);
    } catch (err: unknown) {
      setGlobalError(
        err instanceof Error ? err.message : 'No se pudo eliminar el libro.'
      );
    }
  };

  const handleSaveSagaForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSagaError('');
    try {
      await upsertSaga(sagaNameInput, sagaDescInput, editingSaga?.id);
      setSagaFormOpen(false);
      setEditingSaga(null);
      setSagaNameInput('');
      setSagaDescInput('');
    } catch (err: unknown) {
      setSagaError(err instanceof Error ? err.message : 'Error al guardar la saga.');
    }
  };

  const handleAssignBookToSaga = async (saga: Saga) => {
    if (!assignBookId) return;
    const volNum = assignVolume ? Number(assignVolume) : null;
    try {
      await assignBookToSagaRecord(assignBookId, saga, volNum);
      setAssignBookId('');
      setAssignVolume('1');
      setActiveSagaIdForAssign(null);
    } catch (err: unknown) {
      setGlobalError(
        err instanceof Error ? err.message : 'Error al vincular el libro a la saga.'
      );
    }
  };

  const renderShelfSection = (status: ReadingStatus, title: string, subtitle: string) => {
    const shelfBooks = books.filter((b) => b.progreso === status);
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/20 dark:border-[#242E42] pb-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">{title}</h1>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
              {subtitle} · <strong>{shelfBooks.length}</strong>{' '}
              {shelfBooks.length === 1 ? 'libro' : 'libros'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateBook}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition self-start"
          >
            <Plus className="w-4 h-4" /> Añadir libro
          </button>
        </div>

        {shelfBooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-transparent p-12 text-center">
            <p className="font-serif text-xl text-stone-700 dark:text-slate-400">
              No hay libros en la estantería "{status}" actualmente.
            </p>
            <p className="text-xs text-stone-500 dark:text-slate-500 mt-1">
              Cambia el estado desde cualquier tarjeta de tu biblioteca y aparecerá aquí al
              instante.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
            {shelfBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpenDetail={(b) => setDetailBookId(b.id)}
                onEdit={handleOpenEditBook}
                onDelete={(b) => setBookToDelete(b)}
                onQuickStatusChange={updateBookQuickStatus}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f0df] dark:bg-[#0B0E14] text-stone-900 dark:text-slate-100 gap-3">
        <img
          src="/logo.svg"
          alt="Nexus Library Logo"
          className="w-20 h-20 shrink-0 drop-shadow-md animate-pulse"
        />
        <p className="font-serif text-lg text-amber-800 dark:text-amber-300 tracking-wide">
          Cargando NEXUS LIBRARY...
        </p>
      </div>
    );
  }

  if (!currentUser && !offlineGuestMode) {
    return <AuthScreen onContinueOffline={() => setOfflineGuestMode(true)} />;
  }

  const userInitial = currentUser?.email
    ? currentUser.email.charAt(0).toUpperCase()
    : 'L';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f7f0df] dark:bg-[#080C15] text-stone-900 dark:text-slate-100 relative">
      <AnimatedBackground />

      <BookSidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onLeaveGuestMode={() => setOfflineGuestMode(false)}
        metrics={metrics}
        sagasCount={sagas.length}
        hasUser={Boolean(currentUser)}
        userEmail={currentUser?.email}
        userInitial={userInitial}
        isSyncing={isSyncing}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-stone-300 dark:border-[#222B3C] bg-[#efe4cb]/95 dark:bg-[#111622]/95 backdrop-blur px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menú"
            className="p-2 -ml-1 rounded-lg text-stone-700 dark:text-slate-200 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="/logo.svg"
            alt="Nexus Library Logo"
            className="w-8 h-8 shrink-0 drop-shadow-sm"
          />
          <span className="font-serif text-base sm:text-lg font-bold tracking-wide truncate">
            <span className="text-amber-700 dark:text-amber-400">N</span>EXUS
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('discover')}
            className={
              'p-2 rounded-lg border transition ' +
              (activeSection === 'discover'
                ? 'border-amber-600 bg-amber-500/20 text-amber-700 dark:text-amber-300'
                : 'border-stone-300 dark:border-[#283246] text-stone-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400')
            }
            title="Explorar y Descubrir Libros"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className={
              'p-2 rounded-lg border ' +
              (currentUser
                ? 'border-emerald-500/40 text-emerald-400'
                : 'border-stone-300 dark:border-[#283246] text-amber-500 dark:text-amber-400')
            }
            title="Nube Supabase y Cuenta"
          >
            <Cloud className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="hidden sm:inline-flex p-2 rounded-lg border border-stone-300 dark:border-[#283246] text-amber-500 dark:text-amber-400"
            title="Copias de Seguridad"
          >
            <HardDrive className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateBook}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 text-slate-950 font-bold px-3 py-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-w-0 lg:pl-64 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div key={activeSection} className="book-turn max-w-7xl mx-auto px-3 py-4 sm:p-6 lg:p-8">
          {globalError && (
            <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {globalError}
              </span>
              <button
                type="button"
                onClick={() => setGlobalError(null)}
                className="p-1 rounded hover:bg-rose-500/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
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
                    onClick={handleOpenCreateBook}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-lg shadow-black/50 transition"
                  >
                    <Plus className="w-4 h-4" /> Añadir libro
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('discover')}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 dark:border-amber-400/50 bg-[#1e130a]/70 dark:bg-[#0B0E14]/75 hover:bg-amber-500/25 dark:hover:bg-amber-500/20 backdrop-blur-sm text-amber-100 dark:text-amber-200 font-semibold px-4 py-2.5 text-xs transition"
                  >
                    <Compass className="w-4 h-4" /> Explorar y Descubrir
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('library')}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 dark:border-amber-400/50 bg-[#1e130a]/70 dark:bg-[#0B0E14]/75 hover:bg-amber-500/25 dark:hover:bg-amber-500/20 backdrop-blur-sm text-amber-100 dark:text-amber-200 font-semibold px-4 py-2.5 text-xs transition"
                  >
                    <Library className="w-4 h-4" /> Ver Mi Biblioteca
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                <button
                  type="button"
                  onClick={() => setActiveSection('library')}
                  className="rounded-xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#151B27] p-4 text-left hover:-translate-y-1 hover:border-amber-600/60 dark:hover:border-amber-500/60 hover:shadow-[0_10px_24px_-6px_rgba(180,115,30,0.18)] transition-all duration-300"
                >
                  <span className="text-xs text-stone-600 dark:text-slate-400">Total de Libros</span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold mt-1">{metrics.total}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('shelf-reading')}
                  className="rounded-xl border border-amber-600/40 dark:border-amber-500/30 bg-amber-500/15 dark:bg-amber-500/10 p-4 text-left hover:-translate-y-1 hover:border-amber-600 dark:hover:border-amber-400 hover:shadow-[0_10px_24px_-6px_rgba(245,158,11,0.22)] transition-all duration-300"
                >
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">⏳ Leyendo</span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-900 dark:text-amber-200 mt-1">
                    {metrics.reading}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('shelf-unread')}
                  className="rounded-xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#151B27] p-4 text-left hover:-translate-y-1 hover:border-amber-600/60 dark:hover:border-amber-500/60 hover:shadow-[0_10px_24px_-6px_rgba(180,115,30,0.18)] transition-all duration-300"
                >
                  <span className="text-xs text-stone-600 dark:text-slate-400">❌ Por leer</span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold mt-1">{metrics.unread}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('shelf-paused')}
                  className="rounded-xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#151B27] p-4 text-left hover:-translate-y-1 hover:border-rose-500/60 dark:hover:border-rose-400/60 hover:shadow-[0_10px_24px_-6px_rgba(244,63,94,0.16)] transition-all duration-300"
                >
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">⏸️ Pausados</span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold mt-1">{metrics.paused}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('shelf-read')}
                  className="rounded-xl border border-emerald-600/40 dark:border-emerald-500/30 bg-emerald-500/15 dark:bg-emerald-500/10 p-4 text-left hover:-translate-y-1 hover:border-emerald-600 dark:hover:border-emerald-400 hover:shadow-[0_10px_24px_-6px_rgba(16,185,129,0.22)] transition-all duration-300 col-span-2 sm:col-span-1"
                >
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">✅ Leídos</span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                    {metrics.read}
                  </p>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Leyendo Actualmente
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveSection('shelf-reading')}
                      className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      Ver estantería <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {books.filter((b) => b.progreso === '⏳ Leyendo').length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] p-6 text-center text-xs text-stone-600 dark:text-slate-400">
                      No tienes ningún libro marcado como "⏳ Leyendo" en este momento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {books
                        .filter((b) => b.progreso === '⏳ Leyendo')
                        .slice(0, 4)
                        .map((book) => (
                          <div
                            key={book.id}
                            onClick={() => setDetailBookId(book.id)}
                            className="group flex items-center gap-3.5 p-3 rounded-xl border border-amber-900/20 dark:border-[#253044] bg-[#f4ebd6]/80 dark:bg-[#101520] hover:bg-[#fffcf5] dark:hover:bg-[#161E2E] hover:-translate-y-1 hover:border-amber-600/60 dark:hover:border-amber-400/60 hover:shadow-[0_10px_24px_-6px_rgba(180,115,30,0.18)] cursor-pointer transition-all duration-300"
                          >
                            <div className="w-16 shrink-0">
                              <BookCover
                                nombre={book.nombre}
                                autor={book.autor}
                                portadaUrl={book.portadaUrl}
                                portadaFallbackUrl={book.portadaFallbackUrl}
                                portadaDataUrl={book.portadaDataUrl}
                                size="sm"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-serif font-bold text-base group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate transition">
                                {book.nombre}
                              </h3>
                              <p className="text-xs text-stone-600 dark:text-slate-400 truncate">{book.autor}</p>
                              {book.sagaNombre && (
                                <span className="inline-block mt-1.5 text-[10px] font-semibold text-amber-900 dark:text-amber-300 bg-amber-500/20 dark:bg-amber-500/15 px-2 py-0.5 rounded">
                                  {book.sagaNombre}{' '}
                                  {book.volumen ? '#' + String(book.volumen) : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Mis Sagas
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveSection('sagas')}
                        className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        Gestionar ({sagas.length})
                      </button>
                    </div>

                    {sagasWithBooks.length === 0 ? (
                      <p className="text-xs text-stone-600 dark:text-slate-400">
                        Aún no has creado ninguna saga. Puedes crearlas al añadir un libro o desde
                        la sección Sagas.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {sagasWithBooks.slice(0, 4).map((item) => (
                          <div
                            key={item.saga.id}
                            onClick={() => setActiveSection('sagas')}
                            className="group p-3 rounded-xl border border-amber-900/20 dark:border-[#253044] bg-[#f4ebd6]/80 dark:bg-[#101520] hover:bg-[#fffcf5] dark:hover:bg-[#161E2E] cursor-pointer hover:-translate-y-0.5 hover:border-amber-600/60 dark:hover:border-amber-400/60 hover:shadow-[0_8px_20px_-6px_rgba(180,115,30,0.16)] transition-all duration-300"
                          >
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="truncate group-hover:text-amber-700 dark:group-hover:text-amber-300 transition">
                                {item.saga.nombre}
                              </span>
                              <span className="text-amber-800 dark:text-amber-400 shrink-0">
                                {item.readCount}/{item.registeredCount} leídos
                              </span>
                            </div>
                            <SagaProgressBar size="sm" className="mt-2" books={item.books} percent={item.progressPercent} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400">★</span> Favoritos
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveSection('library')}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    Ver biblioteca completa <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {books.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] p-8 text-center">
                    <p className="font-serif text-lg text-stone-700 dark:text-slate-300">
                      Tu biblioteca está lista para recibir tus libros
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                      Pulsa «Añadir libro» para buscar cualquier edición por título, autor o ISBN
                      con portada automática.
                    </p>
                  </div>
                ) : books.filter((b) => b.puntuacion !== null).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] p-8 text-center">
                    <p className="font-serif text-lg text-stone-700 dark:text-slate-300">
                      Aún no tienes libros valorados en Favoritos
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                      Pulsa sobre cualquier libro de tu biblioteca y asígnale una puntuación con
                      estrellas (⭐) para destacar aquí tus mejores lecturas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {[...books]
                      .filter((b) => b.puntuacion !== null)
                      .sort((a, b) => {
                        const diff = (b.puntuacion || 0) - (a.puntuacion || 0);
                        if (diff !== 0) return diff;
                        return b.createdAt.localeCompare(a.createdAt);
                      })
                      .slice(0, 5)
                      .map((book) => (
                        <BookCard
                          key={book.id}
                          book={book}
                          onOpenDetail={(b) => setDetailBookId(b.id)}
                          onEdit={handleOpenEditBook}
                          onDelete={(b) => setBookToDelete(b)}
                          onQuickStatusChange={updateBookQuickStatus}
                        />
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'library' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold">Mi Biblioteca</h1>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                    Mostrando <strong>{filteredBooks.length}</strong> de{' '}
                    <strong>{books.length}</strong> libros almacenados
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <div className="relative w-full sm:w-44 md:w-52 lg:w-60">
                    <Search className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      placeholder="Buscar título, autor, ISBN..."
                      className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] pl-9 pr-8 py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition shadow-sm"
                    />
                    {filters.search && (
                      <button
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenCreateBook}
                    title="Añadir libro"
                    aria-label="Añadir libro"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm transition shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {(() => {
                    const activeFilterCount = [
                      Boolean(filters.genero),
                      Boolean(filters.subgenero),
                      Boolean(filters.progreso),
                      Boolean(filters.sagaId),
                      filters.puntuacion !== ''
                    ].filter(Boolean).length;

                    return (
                      <button
                        type="button"
                        onClick={() => setShowFilters((s) => !s)}
                        className={
                          'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition shadow-sm ' +
                          (showFilters || activeFilterCount > 0
                            ? 'border-amber-600/60 dark:border-amber-400/60 bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            : 'border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 dark:hover:border-amber-400/50')
                        }
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Filtros</span>
                        {activeFilterCount > 0 && (
                          <span className="rounded-full bg-amber-500 text-slate-950 px-1.5 py-0.2 text-[10px] font-bold">
                            {activeFilterCount}
                          </span>
                        )}
                        <ChevronDown
                          className={
                            'w-3.5 h-3.5 transition-transform duration-200 ' +
                            (showFilters ? 'rotate-180' : '')
                          }
                        />
                      </button>
                    );
                  })()}

                  <div className="inline-flex rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setViewMode('shelf')}
                      className={
                        'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition ' +
                        (viewMode === 'shelf'
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                      }
                      title="Vista de estantería visual"
                    >
                      <Rows3 className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Estantería</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={
                        'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition ' +
                        (viewMode === 'grid'
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                      }
                      title="Vista de cuadrícula de portadas"
                    >
                      <Grid className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Cuadrícula</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={
                        'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition ' +
                        (viewMode === 'list'
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                      }
                      title="Vista de lista compacta"
                    >
                      <List className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Lista</span>
                    </button>
                  </div>
                </div>
              </div>

              {showFilters && (
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-4 space-y-3 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <select
                        value={filters.genero}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, genero: e.target.value as Genre | '' }))
                        }
                        className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs text-stone-800 dark:text-slate-100"
                      >
                        <option value="">Todos los géneros</option>
                        {GENRES.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-4">
                      <select
                        value={filters.subgenero}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, subgenero: e.target.value as Subgenre | '' }))
                        }
                        className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs text-stone-800 dark:text-slate-100"
                      >
                        <option value="">Todos los subgéneros</option>
                        {SUBGENRES.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-4">
                      <select
                        value={filters.progreso}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            progreso: e.target.value as ReadingStatus | ''
                          }))
                        }
                        className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs text-stone-800 dark:text-slate-100"
                      >
                        <option value="">Todos los estados</option>
                        {READING_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-1">
                    <div className="md:col-span-3">
                      <select
                        value={filters.puntuacion === null ? '' : String(filters.puntuacion)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilters((f) => ({
                            ...f,
                            puntuacion:
                              val === ''
                                ? ''
                                : val === 'unrated'
                                ? 'unrated'
                                : (Number(val) as StarRating)
                          }));
                        }}
                        className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs text-stone-800 dark:text-slate-100"
                      >
                        <option value="">Cualquier puntuación</option>
                        {STAR_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                        <option value="unrated">Sin puntuar</option>
                      </select>
                    </div>

                    <div className="md:col-span-4">
                      <select
                        value={filters.sagaId}
                        onChange={(e) => setFilters((f) => ({ ...f, sagaId: e.target.value }))}
                        className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs text-stone-800 dark:text-slate-100"
                      >
                        <option value="">Todas las sagas</option>
                        <option value="__none__">Libros independientes (Sin saga)</option>
                        {sagas.map((s) => (
                          <option key={s.id} value={s.id}>
                            Saga: {s.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3 flex items-center gap-1.5">
                      <select
                        value={filters.sortBy}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, sortBy: e.target.value as SortField }))
                        }
                        className="flex-1 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs text-stone-800 dark:text-slate-100"
                      >
                        <option value="createdAt">Ordenar: Fecha incorporación</option>
                        <option value="nombre">Ordenar: Título</option>
                        <option value="autor">Ordenar: Autor</option>
                        <option value="fechaPublicacion">Ordenar: Año publicación</option>
                        <option value="puntuacion">Ordenar: Puntuación</option>
                        <option value="paginas">Ordenar: Número de páginas</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            sortOrder: f.sortOrder === 'asc' ? 'desc' : 'asc'
                          }))
                        }
                        title="Invertir orden ascendente/descendente"
                        className="p-2 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] text-stone-700 dark:text-slate-200 hover:border-amber-500"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setFilters(initialFilters)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-900/25 dark:border-[#283246] hover:border-amber-500 px-3 py-2 text-xs text-stone-700 dark:text-slate-300 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {filteredBooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-900/30 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-transparent p-12 text-center">
                  <p className="font-serif text-xl text-stone-600 dark:text-slate-300">
                    No se encontraron libros con los filtros actuales.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilters(initialFilters)}
                    className="mt-3 rounded-xl bg-amber-500/20 border border-amber-600/40 dark:border-amber-400/40 text-amber-800 dark:text-amber-300 px-4 py-2 text-xs font-semibold"
                  >
                    Restablecer filtros
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
                  {filteredBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onOpenDetail={(b) => setDetailBookId(b.id)}
                      onEdit={handleOpenEditBook}
                      onDelete={(b) => setBookToDelete(b)}
                      onQuickStatusChange={updateBookQuickStatus}
                    />
                  ))}
                </div>
              ) : viewMode === 'list' ? (
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] overflow-hidden shadow-sm">
                  <ul className="sm:hidden divide-y divide-amber-900/10 dark:divide-[#20293A]">
                    {filteredBooks.map((book) => (
                      <li
                        key={book.id}
                        onClick={() => setDetailBookId(book.id)}
                        className="flex items-center gap-3 p-3 active:bg-[#f4ead4] dark:active:bg-[#192131] cursor-pointer"
                      >
                        <div className="w-11 shrink-0">
                          <BookCover
                            nombre={book.nombre}
                            autor={book.autor}
                            portadaUrl={book.portadaUrl}
                            portadaFallbackUrl={book.portadaFallbackUrl}
                            portadaDataUrl={book.portadaDataUrl}
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-serif font-bold text-sm leading-snug line-clamp-2">{book.nombre}</p>
                          <p className="text-[11px] text-stone-600 dark:text-slate-400 truncate">
                            {book.autor || '—'}
                            {book.sagaNombre ? ' · ' + book.sagaNombre + (book.volumen ? ' #' + String(book.volumen) : '') : ''}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-900/25 dark:border-slate-700 bg-[#efe3c8] dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-stone-800 dark:text-slate-200">
                              {book.progreso}
                            </span>
                            {book.puntuacion && (
                              <span className="text-[10px] tracking-tighter whitespace-nowrap">{formatStars(book.puntuacion)}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f0e5cc] dark:bg-[#101520] text-stone-700 dark:text-slate-400 border-b border-amber-900/20 dark:border-[#242E42]">
                        <tr>
                          <th className="p-3">Portada</th>
                          <th className="p-3">Título y Autor</th>
                          <th className="p-3">Género</th>
                          <th className="p-3">Saga</th>
                          <th className="p-3">Año / Págs.</th>
                          <th className="p-3">Puntuación</th>
                          <th className="p-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-900/10 dark:divide-[#20293A]">
                        {filteredBooks.map((book) => (
                          <tr
                            key={book.id}
                            onClick={() => setDetailBookId(book.id)}
                            className="group hover:bg-[#f4ead4] dark:hover:bg-[#192131] cursor-pointer transition"
                          >
                            <td className="p-3 w-14">
                              <div className="w-11">
                                <BookCover
                                  nombre={book.nombre}
                                  autor={book.autor}
                                  portadaUrl={book.portadaUrl}
                                  portadaFallbackUrl={book.portadaFallbackUrl}
                                  portadaDataUrl={book.portadaDataUrl}
                                  size="sm"
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-serif font-bold text-base text-left group-hover:text-amber-700 dark:group-hover:text-amber-400 block transition">
                                {book.nombre}
                              </span>
                              <span className="text-stone-600 dark:text-slate-400">{book.autor || '—'}</span>
                            </td>
                            <td className="p-3">{book.genero || '—'}</td>
                            <td className="p-3">
                              {book.sagaNombre ? (
                                <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-medium">
                                  {book.sagaNombre}{' '}
                                  {book.volumen ? '#' + String(book.volumen) : ''}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-3 text-stone-600 dark:text-slate-400">
                              {[
                                book.fechaPublicacion,
                                book.paginas ? String(book.paginas) + ' p.' : null
                              ]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </td>
                            <td className="p-3 whitespace-nowrap">{formatStars(book.puntuacion) || '—'}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-900/25 dark:border-slate-700 bg-[#efe3c8] dark:bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-medium text-stone-800 dark:text-slate-200">
                                {book.progreso}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <BookShelf books={filteredBooks} onOpenDetail={(id) => setDetailBookId(id)} />
              )}
            </div>
          )}

          {activeSection === 'discover' && (
            <React.Suspense
              fallback={
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-slate-400">
                  <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-600 dark:border-amber-400/30 dark:border-t-amber-400 rounded-full animate-spin" />
                  <span className="font-serif text-sm">Cargando catálogo para descubrir libros...</span>
                </div>
              }
            >
              <DiscoverBooksScreen
                books={books}
                onQuickAddBook={handleQuickAddFromDiscover}
                onCustomizeBook={handleCustomizeFromDiscover}
              />
            </React.Suspense>
          )}

          {activeSection === 'shelf-unread' &&
            renderShelfSection(
              '❌ No Leído',
              'Estantería: Por Leer',
              'Libros pendientes de iniciar en tu colección'
            )}
          {activeSection === 'shelf-reading' &&
            renderShelfSection(
              '⏳ Leyendo',
              'Estantería: Leyendo Actualmente',
              'Lecturas activas en curso'
            )}
          {activeSection === 'shelf-paused' &&
            renderShelfSection(
              '⏸️ Pausado',
              'Estantería: Lecturas Pausadas',
              'Libros detenidos temporalmente'
            )}
          {activeSection === 'shelf-read' &&
            renderShelfSection(
              '✅ Leído',
              'Estantería: Libros Leídos',
              'Lecturas completadas en tu biblioteca'
            )}

          {activeSection === 'sagas' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/20 dark:border-[#242E42] pb-4">
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold">Colección de Sagas</h1>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                    Volúmenes alineados por orden de lectura y progreso calculado sobre los
                    volúmenes registrados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSaga(null);
                    setSagaNameInput('');
                    setSagaDescInput('');
                    setSagaError('');
                    setSagaFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition"
                >
                  <Plus className="w-4 h-4" /> Nueva Saga
                </button>
              </div>

              {sagaFormOpen && !editingSaga && (
                <form
                  onSubmit={handleSaveSagaForm}
                  className="rounded-2xl border border-amber-600/40 dark:border-amber-500/40 bg-[#fbf6ea] dark:bg-[#141A26] p-5 space-y-4 shadow-md"
                >
                  <h2 className="font-serif text-lg font-bold text-amber-800 dark:text-amber-300">
                    Crear Nueva Saga
                  </h2>
                  {sagaError && <p className="text-xs text-rose-600 dark:text-rose-400">{sagaError}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Nombre único de la saga *
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={sagaNameInput}
                        onChange={(e) => setSagaNameInput(e.target.value)}
                        placeholder="Ej. Nacidos de la Bruma (Mistborn)"
                        className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Descripción opcional
                      </label>
                      <input
                        type="text"
                        value={sagaDescInput}
                        onChange={(e) => setSagaDescInput(e.target.value)}
                        placeholder="Ej. Era 1 y Era 2 del Cosmere"
                        className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSagaFormOpen(false)}
                      className="rounded-xl border border-amber-900/25 dark:border-slate-700 px-4 py-2 text-xs text-stone-700 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs"
                    >
                      Guardar Saga
                    </button>
                  </div>
                </form>
              )}

              {sagasWithBooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-900/30 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-transparent p-12 text-center">
                  <p className="font-serif text-xl text-stone-600 dark:text-slate-300">
                    Todavía no tienes sagas registradas.
                  </p>
                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                    Crea una saga con el botón superior o asígnala directamente al añadir un libro.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sagasWithBooks.map((item) => (
                    <section
                      key={item.saga.id}
                      className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 space-y-4 shadow-md"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-900/15 dark:border-[#222B3C] pb-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                            <h2 className="font-serif text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-400 break-words">
                              {item.saga.nombre}
                            </h2>
                            <span className="rounded-full bg-amber-500/15 border border-amber-600/30 dark:border-amber-500/30 px-2.5 py-0.5 text-xs text-amber-900 dark:text-amber-200 font-semibold shrink-0">
                              {item.registeredCount}{' '}
                              {item.registeredCount === 1
                                ? 'volumen registrado'
                                : 'volúmenes registrados'}
                            </span>
                          </div>
                          {item.saga.descripcion && (
                            <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">{item.saga.descripcion}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center md:justify-end gap-3 shrink-0">
                          <div className="text-left md:text-right shrink-0">
                            <span className="text-xs text-stone-700 dark:text-slate-300 font-medium">
                              {item.readCount} leídos · {item.pendingCount} pendientes
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (activeSagaIdForAssign === item.saga.id) {
                                  setActiveSagaIdForAssign(null);
                                  setAssignBookId('');
                                  setAssignVolume('1');
                                } else {
                                  setActiveSagaIdForAssign(item.saga.id);
                                  setAssignBookId('');
                                  const maxVol = item.books.reduce(
                                    (max, b) => (b.volumen && b.volumen > max ? b.volumen : max),
                                    0
                                  );
                                  setAssignVolume(String(maxVol + 1));
                                }
                              }}
                              className={
                                activeSagaIdForAssign === item.saga.id
                                  ? 'inline-flex items-center gap-1 rounded-lg border border-rose-500/30 dark:border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-300 font-medium hover:bg-rose-500/20 transition whitespace-nowrap'
                                  : 'inline-flex items-center gap-1 rounded-lg border border-amber-600/40 dark:border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium hover:bg-amber-500/20 transition whitespace-nowrap'
                              }
                            >
                              {activeSagaIdForAssign === item.saga.id ? (
                                <>
                                  <X className="w-3.5 h-3.5" /> Cancelar
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" /> Asignar libro
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (sagaFormOpen && editingSaga?.id === item.saga.id) {
                                  setSagaFormOpen(false);
                                  setEditingSaga(null);
                                } else {
                                  setEditingSaga(item.saga);
                                  setSagaNameInput(item.saga.nombre);
                                  setSagaDescInput(item.saga.descripcion);
                                  setSagaError('');
                                  setSagaFormOpen(true);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-amber-900/25 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:border-amber-600 dark:hover:border-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition"
                              title="Editar nombre o descripción de la saga"
                              aria-label="Editar saga"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    '¿Eliminar la saga "' +
                                      item.saga.nombre +
                                      '"? Los libros asociados se conservarán en tu biblioteca como libros independientes.'
                                  )
                                ) {
                                  try {
                                    await deleteSagaAndUnlinkBooks(item.saga.id);
                                  } catch (err: unknown) {
                                    setGlobalError(
                                      err instanceof Error
                                        ? err.message
                                        : 'Error al eliminar la saga.'
                                    );
                                  }
                                }
                              }}
                              className="p-1.5 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition"
                              title="Eliminar saga"
                              aria-label="Eliminar saga"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {sagaFormOpen && editingSaga?.id === item.saga.id && (
                        <form
                          onSubmit={handleSaveSagaForm}
                          className="rounded-xl border border-amber-600/40 dark:border-amber-500/40 bg-[#f4ead4] dark:bg-[#101520] p-4 space-y-3"
                        >
                          <h3 className="font-serif text-base font-bold text-amber-800 dark:text-amber-300">
                            Editar Saga
                          </h3>
                          {sagaError && <p className="text-xs text-rose-600 dark:text-rose-400">{sagaError}</p>}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold mb-1">
                                Nombre de la saga *
                              </label>
                              <input
                                type="text"
                                required
                                autoFocus
                                value={sagaNameInput}
                                onChange={(e) => setSagaNameInput(e.target.value)}
                                className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">
                                Descripción opcional
                              </label>
                              <input
                                type="text"
                                value={sagaDescInput}
                                onChange={(e) => setSagaDescInput(e.target.value)}
                                className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSagaFormOpen(false);
                                setEditingSaga(null);
                              }}
                              className="rounded-lg border border-amber-900/25 dark:border-slate-700 px-3 py-1.5 text-xs text-stone-700 dark:text-slate-300"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 text-xs"
                            >
                              Guardar cambios
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="flex items-center gap-3">
                        <SagaProgressBar className="flex-1" books={item.books} percent={item.progressPercent} />
                        <span
                          className={
                            'text-xs font-bold font-mono shrink-0 min-w-[36px] text-right ' +
                            (item.progressPercent === 100
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-800 dark:text-amber-300')
                          }
                        >
                          {item.progressPercent}%
                        </span>
                      </div>

                      {activeSagaIdForAssign === item.saga.id && (
                        <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-[#f4ead4] dark:bg-[#101520] p-3.5">
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[11px] font-semibold text-stone-700 dark:text-slate-300 mb-1">
                              Libro de tu biblioteca
                            </label>
                            <select
                              value={assignBookId}
                              onChange={(e) => setAssignBookId(e.target.value)}
                              className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-1.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-amber-600 dark:focus:border-amber-400"
                            >
                              <option value="">— Selecciona un libro —</option>
                              {books
                                .filter((b) => b.sagaId !== item.saga.id)
                                .map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.nombre} ({b.autor || 'Sin autor'})
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="w-24 sm:w-28">
                            <label className="block text-[11px] font-semibold text-stone-700 dark:text-slate-300 mb-1">
                              Volumen #
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={assignVolume}
                              onChange={(e) => setAssignVolume(e.target.value)}
                              className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-1.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-amber-600 dark:focus:border-amber-400"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSagaIdForAssign(null);
                                setAssignBookId('');
                                setAssignVolume('1');
                              }}
                              className="rounded-lg border border-amber-900/25 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={!assignBookId}
                              onClick={() => handleAssignBookToSaga(item.saga)}
                              className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold px-3.5 py-1.5 text-xs transition shadow-sm"
                            >
                              Vincular
                            </button>
                          </div>
                        </div>
                      )}

                      {item.books.length === 0 ? (
                        <p className="text-xs text-stone-500 dark:text-slate-400 italic">
                          No hay volúmenes asignados todavía a esta saga.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 pt-1">
                          {item.books.map((book) => (
                            <div
                              key={book.id}
                              onClick={() => setDetailBookId(book.id)}
                              className="group cursor-pointer rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/70 dark:bg-[#101520] hover:bg-[#fffcf5] dark:hover:bg-[#161E2E] p-2.5 hover:-translate-y-1.5 hover:border-amber-500/70 hover:shadow-[0_12px_26px_-8px_rgba(245,158,11,0.22)] transition-all duration-300 flex flex-col justify-between"
                            >
                              <div>
                                <div className="relative mb-2">
                                  <BookCover
                                    nombre={book.nombre}
                                    autor={book.autor}
                                    portadaUrl={book.portadaUrl}
                                    portadaFallbackUrl={book.portadaFallbackUrl}
                                    portadaDataUrl={book.portadaDataUrl}
                                    size="sm"
                                  />
                                  <span className="absolute top-2 left-2 z-10 truncate rounded-md bg-[#0D1017]/90 backdrop-blur-sm border border-amber-400/30 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-amber-200 shadow">
                                    {book.volumen ? '#' + String(book.volumen) : 'Sin núm.'}
                                  </span>
                                </div>
                                <p className="font-serif font-bold text-sm mt-1 line-clamp-2 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                                  {book.nombre}
                                </p>
                              </div>
                              <p className="text-[11px] text-stone-600 dark:text-slate-400 mt-1">{book.progreso}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'stats' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold">Estadísticas de la Colección</h1>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                  Calculadas exclusivamente a partir de los registros reales almacenados en tu
                  biblioteca.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm">
                  <span className="text-xs text-stone-600 dark:text-slate-400">Libros Leídos</span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {metrics.read}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm">
                  <span className="text-xs text-stone-600 dark:text-slate-400">Libros Pendientes</span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                    {metrics.pendingTotal}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm">
                  <span className="text-xs text-stone-600 dark:text-slate-400">
                    Valoración Media ({metrics.ratedCount} puntuados)
                  </span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                    {metrics.avgRating !== null ? metrics.avgRating.toFixed(2) + ' ⭐' : '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm">
                  <span className="text-xs text-stone-600 dark:text-slate-400">Páginas Totales Registradas</span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold mt-1">
                    {metrics.totalPages.toLocaleString('es-ES')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 space-y-3 shadow-sm">
                  <h2 className="font-serif text-xl font-bold">Distribución por Géneros</h2>
                  {GENRES.map((g) => {
                    const count = books.filter((b) => b.genero === g).length;
                    const pct = books.length > 0 ? Math.round((count / books.length) * 100) : 0;
                    return (
                      <div key={g} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{g}</span>
                          <span className="text-stone-600 dark:text-slate-400">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 dark:bg-amber-400"
                            style={{ width: String(pct) + '%' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 space-y-3 shadow-sm">
                    <h2 className="font-serif text-xl font-bold">Distribución por Estados</h2>
                    {READING_STATUSES.map((st) => {
                      const count = books.filter((b) => b.progreso === st).length;
                      const pct = books.length > 0 ? Math.round((count / books.length) * 100) : 0;
                      return (
                        <div key={st} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{st}</span>
                            <span className="text-stone-600 dark:text-slate-400">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 dark:bg-emerald-400"
                              style={{ width: String(pct) + '%' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 space-y-3 shadow-sm">
                    <h2 className="font-serif text-xl font-bold">
                      Autores con Más Libros en tu Colección
                    </h2>
                    {topAuthors.length === 0 ? (
                      <p className="text-xs text-stone-500 dark:text-slate-400">
                        No hay autores registrados todavía.
                      </p>
                    ) : (
                      <div className="divide-y divide-amber-900/15 dark:divide-[#222B3C] text-xs">
                        {topAuthors.map(([authorName, count]) => (
                          <div
                            key={authorName}
                            className="py-2 flex items-center justify-between"
                          >
                            <span className="font-medium">{authorName}</span>
                            <span className="rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 font-semibold">
                              {count} {count === 1 ? 'libro' : 'libros'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 space-y-3 shadow-sm">
                <h2 className="font-serif text-xl font-bold">
                  Progreso de Lectura de las Sagas (Sobre Volúmenes Registrados)
                </h2>
                {sagasWithBooks.length === 0 ? (
                  <p className="text-xs text-stone-500 dark:text-slate-400">No hay sagas registradas.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sagasWithBooks.map((item) => (
                      <div
                        key={item.saga.id}
                        className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/60 dark:bg-transparent p-3.5 space-y-1.5"
                      >
                        <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-xs font-semibold">
                          <span>{item.saga.nombre}</span>
                          <span className="text-amber-800 dark:text-amber-400">
                            {item.readCount} / {item.registeredCount} volúmenes registrados leídos (
                            {item.progressPercent}%)
                          </span>
                        </div>
                        <SagaProgressBar books={item.books} percent={item.progressPercent} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-amber-900/20 dark:border-[#222B3C] bg-[#fbf6ea]/95 dark:bg-[#111622]/95 backdrop-blur grid grid-cols-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[10px]">
        <button
          type="button"
          onClick={() => setActiveSection('dashboard')}
          className={
            'flex flex-col items-center gap-1 ' +
            (activeSection === 'dashboard'
              ? 'text-[#8e2836] dark:text-amber-400 font-bold'
              : 'text-stone-500 dark:text-slate-400')
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          Inicio
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('library')}
          className={
            'flex flex-col items-center gap-1 ' +
            (activeSection === 'library'
              ? 'text-[#8e2836] dark:text-amber-400 font-bold'
              : 'text-stone-500 dark:text-slate-400')
          }
        >
          <Library className="w-4 h-4" />
          Biblioteca
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('discover')}
          className={
            'flex flex-col items-center gap-1 ' +
            (activeSection === 'discover'
              ? 'text-[#8e2836] dark:text-amber-400 font-bold'
              : 'text-stone-500 dark:text-slate-400')
          }
        >
          <Compass className="w-4 h-4" />
          Descubrir
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('shelf-reading')}
          className={
            'flex flex-col items-center gap-1 ' +
            (activeSection.startsWith('shelf-')
              ? 'text-[#8e2836] dark:text-amber-400 font-bold'
              : 'text-stone-500 dark:text-slate-400')
          }
        >
          <Clock className="w-4 h-4" />
          Leyendo
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('sagas')}
          className={
            'flex flex-col items-center gap-1 ' +
            (activeSection === 'sagas'
              ? 'text-[#8e2836] dark:text-amber-400 font-bold'
              : 'text-stone-500 dark:text-slate-400')
          }
        >
          <Layers className="w-4 h-4" />
          Sagas
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('stats')}
          className={
            'flex flex-col items-center gap-1 ' +
            (activeSection === 'stats'
              ? 'text-[#8e2836] dark:text-amber-400 font-bold'
              : 'text-stone-500 dark:text-slate-400')
          }
        >
          <BarChart3 className="w-4 h-4" />
          Stats
        </button>
      </nav>

      <React.Suspense fallback={null}>
        {activeDetailBook && (
          <BookDetailModal
            book={activeDetailBook}
            onClose={() => setDetailBookId(null)}
            onEdit={handleOpenEditBook}
            onDelete={(b) => setBookToDelete(b)}
            onStatusChange={updateBookQuickStatus}
            onRatingChange={updateBookQuickRating}
            onDatesChange={updateBookQuickDates}
          />
        )}

        {isAddEditOpen && (
          <AddEditBookModal
            isOpen={isAddEditOpen}
            editingBook={editingBook}
            initialCandidate={selectedInitialCandidate}
            sagas={sagas}
            existingBooks={books}
            onClose={() => {
              setIsAddEditOpen(false);
              setSelectedInitialCandidate(null);
            }}
            onSave={async (data, id) => {
              await saveBookRecord(data, id);
            }}
          />
        )}

        {isImportOpen && (
          <ImportModal
            isOpen={isImportOpen}
            books={books}
            sagas={sagas}
            onClose={() => setIsImportOpen(false)}
          />
        )}

        {isAuthModalOpen && (
          <AuthSyncModal
            isOpen={isAuthModalOpen}
            user={currentUser}
            syncResult={syncResult}
            isSyncing={isSyncing}
            onTriggerSync={runCloudSync}
            onClose={() => setIsAuthModalOpen(false)}
          />
        )}
      </React.Suspense>

      {bookToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={() => setBookToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-dialog-title" className="font-serif text-xl font-bold text-rose-700 dark:text-rose-400">
              Confirmar eliminación
            </h3>
            <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed">
              ¿Seguro que deseas eliminar <strong>"{bookToDelete.nombre}"</strong> de tu biblioteca?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="rounded-xl border border-amber-900/25 dark:border-slate-700 px-4 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteBook}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 text-xs transition"
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
