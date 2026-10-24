import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  Search,
  Sparkles,
  Compass,
  Check,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Plus,
  BookOpen,
  Calendar,
  FileText,
  Sliders,
  ExternalLink,
  Users,
  RefreshCw
} from 'lucide-react';
import { BibliographicCandidate, Book } from '../types/models';
import {
  bookMetadataService,
  DISCOVER_CATEGORIES,
  DiscoverCategory,
  CURATED_CATEGORY_BOOKS,
  isBookAlreadyInLibrary,
  dismissedRecommendationsService,
  RecommendOptions
} from '../services/bookMetadataService';
import { BookCover } from './BookCover';
import { normalizeText } from '../constants/catalogs';
import { CommunityReadersView } from './CommunityReadersView';

interface DiscoverBooksScreenProps {
  books: Book[];
  onQuickAddBook: (candidate: BibliographicCandidate) => Promise<void>;
  onCustomizeBook: (candidate: BibliographicCandidate) => void;
  currentUserId?: string;
  onAddBookFromCommunity?: (book: Book) => Promise<void>;
  onOpenBookDetail?: (book: Book) => void;
}

const QUICK_CHIPS = [
  '✨ Brandon Sanderson',
  '🔪 Stephen King',
  '🔭 Isaac Asimov',
  '⚔️ Patrick Rothfuss',
  '🏛️ Gabriel García Márquez',
  '🌌 Duna',
  '📖 1984',
  '🧙 El Señor de los Anillos',
  '🕵️ Sherlock Holmes'
];

export const DiscoverBooksScreen: React.FC<DiscoverBooksScreenProps> = ({
  books,
  onQuickAddBook,
  onCustomizeBook,
  currentUserId,
  onAddBookFromCommunity,
  onOpenBookDetail
}) => {
  const [discoverTab, setDiscoverTab] = useState<'books' | 'community'>('books');
  const [hasVisitedCommunity, setHasVisitedCommunity] = useState(false);
  const [, startTransition] = useTransition();

  const handleTabChange = (tab: 'books' | 'community') => {
    if (tab === 'community' && !hasVisitedCommunity) {
      setHasVisitedCommunity(true);
    }
    startTransition(() => {
      setDiscoverTab(tab);
    });
  };

  const handleCategoryChange = (catId: string) => {
    startTransition(() => {
      setActiveCategoryId(catId);
    });
  };

  const handleQuickChip = (chipText: string) => {
    startTransition(() => {
      setSearchInput(chipText);
    });
  };

  const handleClearSearch = () => {
    startTransition(() => {
      setSearchInput('');
    });
  };

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibliographicCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [recommendations, setRecommendations] = useState<{
    reason: string;
    books: BibliographicCandidate[];
  } | null>(null);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [recSubFilter, setRecSubFilter] = useState<'mix' | 'authors' | 'classics'>('mix');
  const [dismissedCandidateIds, setDismissedCandidateIds] = useState<Set<string>>(() =>
    dismissedRecommendationsService.getDismissedIds()
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>('fantasy');
  const [categoryBooks, setCategoryBooks] = useState<Record<string, BibliographicCandidate[]>>(() => ({
    ...CURATED_CATEGORY_BOOKS
  }));
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState<BibliographicCandidate | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchAbortRef = useRef<AbortController | null>(null);
  const recsAbortRef = useRef<AbortController | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const booksHash = useMemo(
    () => books.map((b) => b.id).sort().join(','),
    [books]
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 380);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError('');
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setIsSearching(true);
    setSearchError('');

    bookMetadataService
      .searchBooks(debouncedQuery, controller.signal)
      .then((results) => {
        setSearchResults(results);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSearchError('No se pudo completar la búsqueda en los catálogos. Inténtalo de nuevo.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  // Carga inteligente de recomendaciones personalizadas con AbortController y temporizador de seguridad
  const loadRecommendations = (options?: {
    forceRefresh?: boolean;
    subFilter?: 'mix' | 'authors' | 'classics';
  }) => {
    if (recsAbortRef.current) {
      recsAbortRef.current.abort();
    }
    const controller = new AbortController();
    recsAbortRef.current = controller;

    setIsLoadingRecs(true);
    const activeSub = options?.subFilter || recSubFilter;

    // Temporizador de seguridad: si la red o API externa tarda más de 4.5s, no bloqueamos la interfaz
    const safetyTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setIsLoadingRecs(false);
      }
    }, 4500);

    bookMetadataService
      .fetchRecommendations(books, {
        subFilter: activeSub,
        forceRefresh: options?.forceRefresh,
        signal: controller.signal
      })
      .then((recs) => {
        if (!controller.signal.aborted) {
          setRecommendations(recs);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      })
      .finally(() => {
        window.clearTimeout(safetyTimer);
        if (!controller.signal.aborted) {
          setIsLoadingRecs(false);
        }
      });
  };

  useEffect(() => {
    loadRecommendations({ subFilter: recSubFilter });
    return () => {
      if (recsAbortRef.current) {
        recsAbortRef.current.abort();
      }
    };
  }, [booksHash, recSubFilter]);

  const handleRefreshRecs = () => {
    startTransition(() => {
      loadRecommendations({ forceRefresh: true, subFilter: recSubFilter });
    });
  };

  const handleRecSubFilterChange = (filter: 'mix' | 'authors' | 'classics') => {
    startTransition(() => {
      setRecSubFilter(filter);
    });
  };

  const handleDismissRec = (candidate: BibliographicCandidate, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissedRecommendationsService.dismiss(candidate.id);
    setDismissedCandidateIds((prev) => new Set(prev).add(candidate.id));
    showToast(`Recomendación de «${candidate.nombre}» descartada.`);
  };

  // Carga complementaria de obras temáticas desde Open Library
  useEffect(() => {
    const category = DISCOVER_CATEGORIES.find((c) => c.id === activeCategoryId);
    if (!category) return;

    // Si ya se ha enriquecido previamente con más de 6 obras, no repetimos la petición de red
    if (categoryBooks[category.id] && categoryBooks[category.id].length > 6) {
      return;
    }

    let mounted = true;
    setIsLoadingCategory(true);

    bookMetadataService
      .fetchSubjectBooks(category.subjectKey, 14)
      .then((items) => {
        if (mounted && items.length > 0) {
          setCategoryBooks((prev) => {
            const existing = prev[category.id] || [];
            const existingTitles = new Set(existing.map((b) => normalizeText(b.nombre)));
            const fresh = items.filter((b) => !existingTitles.has(normalizeText(b.nombre)));
            return {
              ...prev,
              [category.id]: [...existing, ...fresh]
            };
          });
        }
      })
      .catch(() => {
        // Ignorado: las obras curadas ya están visibles
      })
      .finally(() => {
        if (mounted) setIsLoadingCategory(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeCategoryId]);

  // Comprobación inteligente de existencia en biblioteca (ISBN, bilingüe, sagas y autor+tokens)
  const isCandidateInLibrary = useMemo(() => {
    return (candidate: BibliographicCandidate): boolean => {
      if (justAddedIds.has(candidate.id)) return true;
      return isBookAlreadyInLibrary(candidate, books);
    };
  }, [books, justAddedIds]);

  // Libros visibles para la sección de recomendaciones (excluye cualquier obra en biblioteca o descartada)
  const visibleRecommendations = useMemo(() => {
    if (!recommendations?.books) return [];
    return recommendations.books.filter(
      (b) => !isCandidateInLibrary(b) && !dismissedCandidateIds.has(b.id)
    );
  }, [recommendations, isCandidateInLibrary, dismissedCandidateIds]);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const handleQuickAdd = async (candidate: BibliographicCandidate, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isCandidateInLibrary(candidate) || addingId === candidate.id) return;

    setAddingId(candidate.id);
    try {
      await onQuickAddBook(candidate);
      setJustAddedIds((prev) => new Set(prev).add(candidate.id));
      showToast(`«${candidate.nombre}» añadido a tu biblioteca en "Por leer".`);
      if (selectedCandidate?.id === candidate.id) {
        setSelectedCandidate(null);
      }
    } catch {
      showToast('Ocurrió un error al guardar el libro en tu biblioteca.');
    } finally {
      setAddingId(null);
    }
  };

  const handleCustomize = (candidate: BibliographicCandidate, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedCandidate(null);
    onCustomizeBook(candidate);
  };

  const currentCategory = DISCOVER_CATEGORIES.find((c) => c.id === activeCategoryId);
  const currentCategoryBooks = categoryBooks[activeCategoryId] || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast de confirmación */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-[#101520] text-emerald-200 px-4 py-3 shadow-2xl backdrop-blur-md animate-slide-up text-xs sm:text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Pestañas de Descubrir (Catálogo de Libros vs Comunidad de Lectores) ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-900/15 dark:border-[#242E42] pb-3">
        <button
          type="button"
          onClick={() => handleTabChange('books')}
          className={
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ' +
            (discoverTab === 'books'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
          }
        >
          <Compass className="w-4 h-4" /> Catálogo de Libros
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('community')}
          className={
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ' +
            (discoverTab === 'community'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
          }
        >
          <Users className="w-4 h-4" /> Comunidad de Lectores
        </button>
      </div>

      {/* ─── Contenedor Catálogo de Libros: se oculta con CSS para no perder estado ni remontar ─── */}
      <div className={discoverTab === 'books' ? 'space-y-8' : 'hidden'}>
          {/* ─── Cabecera Compacta & Buscador ─── */}
          <div className="space-y-3 pb-3 border-b border-amber-900/15 dark:border-[#242E42]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white leading-tight">
                Descubrir Libros
              </h1>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
              Explora catálogos abiertos y recomendaciones según tus preferencias
            </p>
          </div>

          {/* Barra de búsqueda interactiva */}
          <div className="relative w-full sm:w-80 md:w-96">
            <Search className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar título, autor, saga o ISBN..."
              className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] pl-10 pr-9 py-2 text-xs sm:text-sm text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-400 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition shadow-sm"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            ) : searchInput ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 rounded-full text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Chips de sugerencias rápidas sin scroll horizontal */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
          <span className="text-[11px] font-medium text-stone-500 dark:text-slate-400">
            Sugerencias:
          </span>
          {QUICK_CHIPS.map((chip) => {
            const cleanText = chip.replace(/^[^\s]+\s/, '');
            return (
              <button
                key={chip}
                type="button"
                onClick={() => handleQuickChip(cleanText)}
                className="rounded-full border border-amber-900/15 dark:border-[#283246] bg-[#fbf6ea]/80 dark:bg-[#141A26] px-2.5 py-0.5 text-[11px] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 dark:hover:border-amber-400/50 hover:bg-amber-500/10 transition"
              >
                {chip}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── VISTA 1: Resultados de Búsqueda Dinámica ─── */}
      {debouncedQuery.length >= 2 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] pb-3">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>Resultados de búsqueda:</span>
                <span className="text-amber-700 dark:text-amber-400">"{debouncedQuery}"</span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                {isSearching ? (
                  'Consultando catálogos de Open Library y Google Books...'
                ) : (
                  <>
                    Se han encontrado <strong>{searchResults.length}</strong> obras registradas
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-semibold"
            >
              Volver a recomendaciones
            </button>
          </div>

          {searchError && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && !searchError && (
            <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] p-12 text-center bg-[#fbf6ea]/50 dark:bg-transparent">
              <BookOpen className="w-10 h-10 text-stone-400 dark:text-slate-500 mx-auto mb-2" />
              <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-slate-200">
                No se encontraron obras con ese criterio
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Prueba buscando por el apellido del autor, el título exacto en español o inglés, o
                utiliza un número de ISBN directo.
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5">
              {searchResults.map((cand) => {
                const inLibrary = isCandidateInLibrary(cand);
                const isAdding = addingId === cand.id;

                return (
                  <article
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    role="button"
                    tabIndex={0}
                    className="group relative flex flex-col justify-between rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea]/95 dark:bg-[#161C28]/95 hover:bg-[#fffcf5] dark:hover:bg-[#1B2333] p-2.5 sm:p-3 shadow-sm hover:-translate-y-1.5 hover:border-amber-600/60 dark:hover:border-amber-400/60 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      <div className="relative mb-2">
                        <BookCover
                          nombre={cand.nombre}
                          autor={cand.autor}
                          portadaUrl={cand.portadaUrl}
                          portadaFallbackUrl={cand.portadaFallbackUrl}
                        />
                      </div>

                      <h3
                        className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 line-clamp-2 leading-snug"
                        title={cand.nombre}
                      >
                        {cand.nombre}
                      </h3>
                      <p className="text-[11px] text-stone-600 dark:text-slate-400 truncate mt-0.5">
                        {cand.autor || 'Autor desconocido'}
                      </p>

                      <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-stone-500 dark:text-slate-400">
                        {cand.fechaPublicacion && (
                          <span className="rounded bg-amber-900/10 dark:bg-slate-800 px-1.5 py-0.2">
                            {cand.fechaPublicacion}
                          </span>
                        )}
                        {cand.suggestedGenre && (
                          <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 truncate max-w-[110px]">
                            {cand.suggestedGenre.replace(/^[^\s]+\s/, '')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-amber-900/15 dark:border-[#253044]">
                      {inLibrary ? (
                        <div className="w-full flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 py-1.5 text-[11px] font-semibold">
                          <Check className="w-3.5 h-3.5" /> En tu biblioteca
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isAdding}
                          onClick={(e) => handleQuickAdd(cand, e)}
                          className="w-full flex items-center justify-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 text-[11px] shadow-sm transition disabled:opacity-50"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Añadir libro
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* ─── VISTA 2: Recomendaciones y Categorías Temáticas ─── */
        <div className="space-y-10">
          {/* SECCIÓN: Recomendaciones Personalizadas */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-900/20 dark:border-[#242E42] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h2 className="font-serif text-xl sm:text-2xl font-bold">
                    Recomendaciones para ti
                  </h2>
                </div>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                  {isLoadingRecs
                    ? 'Analizando tus lecturas para descubrir joyas literarias...'
                    : recommendations?.reason || 'Basado en tus preferencias de lectura'}
                </p>
              </div>

              {/* Controles de recomendación: Sub-filtros y Refrescar */}
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <div className="inline-flex items-center p-1 rounded-xl bg-amber-900/10 dark:bg-[#121824] border border-amber-900/15 dark:border-[#283246] text-xs">
                  <button
                    type="button"
                    onClick={() => handleRecSubFilterChange('mix')}
                    className={
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ' +
                      (recSubFilter === 'mix'
                        ? 'bg-white dark:bg-[#1C2433] text-stone-900 dark:text-white shadow-sm font-bold'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200')
                    }
                  >
                    🎯 Mix
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecSubFilterChange('authors')}
                    className={
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ' +
                      (recSubFilter === 'authors'
                        ? 'bg-white dark:bg-[#1C2433] text-stone-900 dark:text-white shadow-sm font-bold'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200')
                    }
                  >
                    👥 Nuevos autores
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecSubFilterChange('classics')}
                    className={
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ' +
                      (recSubFilter === 'classics'
                        ? 'bg-white dark:bg-[#1C2433] text-stone-900 dark:text-white shadow-sm font-bold'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200')
                    }
                  >
                    🏆 Grandes joyas
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isLoadingRecs}
                  onClick={handleRefreshRecs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-xs font-semibold text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-amber-500/10 transition shadow-sm disabled:opacity-50"
                  title="Explorar nuevas sugerencias"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${
                      isLoadingRecs ? 'animate-spin' : ''
                    }`}
                  />
                  <span className="hidden sm:inline">Nuevas sugerencias</span>
                </button>
              </div>
            </div>

            {isLoadingRecs ? (
              <div className="flex items-center justify-center py-12 text-xs text-stone-500 dark:text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                Cargando recomendaciones personalizadas...
              </div>
            ) : visibleRecommendations.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5">
                {visibleRecommendations.map((cand) => {
                  const isAdding = addingId === cand.id;

                  return (
                    <article
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      role="button"
                      tabIndex={0}
                      className="group relative flex flex-col justify-between rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea]/95 dark:bg-[#161C28]/95 hover:bg-[#fffcf5] dark:hover:bg-[#1B2333] p-2.5 sm:p-3 shadow-sm hover:-translate-y-1.5 hover:border-amber-600/60 dark:hover:border-amber-400/60 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    >
                      {/* Botón discreto para descartar recomendación */}
                      <button
                        type="button"
                        onClick={(e) => handleDismissRec(cand, e)}
                        className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-stone-900/70 hover:bg-rose-600 text-stone-200 hover:text-white flex items-center justify-center transition shadow opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="No me interesa esta sugerencia"
                        aria-label={`Descartar recomendación de ${cand.nombre}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div>
                        {/* Insignia del motivo de la recomendación */}
                        {cand.recommendationReason && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-500/20 px-2 py-0.5 rounded-md truncate max-w-full">
                              <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="truncate">{cand.recommendationReason}</span>
                            </span>
                          </div>
                        )}

                        <div className="relative mb-2">
                          <BookCover
                            nombre={cand.nombre}
                            autor={cand.autor}
                            portadaUrl={cand.portadaUrl}
                            portadaFallbackUrl={cand.portadaFallbackUrl}
                          />
                        </div>

                        <h3
                          className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 line-clamp-2 leading-snug"
                          title={cand.nombre}
                        >
                          {cand.nombre}
                        </h3>
                        <p className="text-[11px] text-stone-600 dark:text-slate-400 truncate mt-0.5">
                          {cand.autor || 'Autor desconocido'}
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-stone-500 dark:text-slate-400">
                          {cand.fechaPublicacion && (
                            <span className="rounded bg-amber-900/10 dark:bg-slate-800 px-1.5 py-0.2">
                              {cand.fechaPublicacion}
                            </span>
                          )}
                          {cand.suggestedGenre && (
                            <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 truncate max-w-[110px]">
                              {cand.suggestedGenre.replace(/^[^\s]+\s/, '')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-amber-900/15 dark:border-[#253044]">
                        <button
                          type="button"
                          disabled={isAdding}
                          onClick={(e) => handleQuickAdd(cand, e)}
                          className="w-full flex items-center justify-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 text-[11px] shadow-sm transition disabled:opacity-50"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Añadir libro
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] p-8 text-center bg-[#fbf6ea]/40 dark:bg-transparent">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-serif text-sm font-semibold text-stone-800 dark:text-slate-200">
                  ¡Has explorado todas las sugerencias actuales!
                </p>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Pulsa en nuevas sugerencias para descubrir más joyas literarias de autores afines.
                </p>
                <button
                  type="button"
                  onClick={handleRefreshRecs}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Explorar nuevas sugerencias
                </button>
              </div>
            )}
          </section>

          {/* Adorno divisor clásico */}
          <div className="flex items-center gap-3 text-amber-600/60 my-6" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-600/40" />
            <span className="text-xs">◆</span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-600/40" />
          </div>

          {/* SECCIÓN: Estanterías Temáticas / Categorías */}
          <section className="space-y-4">
            <div className="border-b border-amber-900/20 dark:border-[#242E42] pb-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>Estanterías Temáticas</span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                Explora obras maestras y libros emblemáticos agrupados por género:
              </p>
            </div>

            {/* Píldoras selectoras de categoría sin scroll horizontal */}
            <div className="flex flex-wrap items-center gap-2">
              {DISCOVER_CATEGORIES.map((cat) => {
                const active = cat.id === activeCategoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={
                      'inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition shadow-sm ' +
                      (active
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 dark:hover:border-amber-400/50 hover:bg-[#fffcf5] dark:hover:bg-[#182030]')
                    }
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Banner explicativo del género actual */}
            {currentCategory && (
              <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/70 dark:bg-[#121824]/90 p-3.5 flex items-center justify-between text-xs text-stone-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-base">{currentCategory.icon}</span>
                  <span>{currentCategory.description}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  {isLoadingCategory && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="hidden md:inline">Ampliando catálogo...</span>
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-stone-500 dark:text-slate-400">
                    {currentCategoryBooks.length} volúmenes
                  </span>
                </div>
              </div>
            )}

            {/* Cuadrícula de libros de la categoría */}
            {currentCategoryBooks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5">
                {currentCategoryBooks.map((cand) => {
                  const inLibrary = isCandidateInLibrary(cand);
                  const isAdding = addingId === cand.id;

                  return (
                    <article
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      role="button"
                      tabIndex={0}
                      className="group relative flex flex-col justify-between rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea]/95 dark:bg-[#161C28]/95 hover:bg-[#fffcf5] dark:hover:bg-[#1B2333] p-2.5 sm:p-3 shadow-sm hover:-translate-y-1.5 hover:border-amber-600/60 dark:hover:border-amber-400/60 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    >
                      <div>
                        <div className="relative mb-2">
                          <BookCover
                            nombre={cand.nombre}
                            autor={cand.autor}
                            portadaUrl={cand.portadaUrl}
                            portadaFallbackUrl={cand.portadaFallbackUrl}
                          />
                        </div>

                        <h3
                          className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 line-clamp-2 leading-snug"
                          title={cand.nombre}
                        >
                          {cand.nombre}
                        </h3>
                        <p className="text-[11px] text-stone-600 dark:text-slate-400 truncate mt-0.5">
                          {cand.autor || 'Autor desconocido'}
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-stone-500 dark:text-slate-400">
                          {cand.fechaPublicacion && (
                            <span className="rounded bg-amber-900/10 dark:bg-slate-800 px-1.5 py-0.2">
                              {cand.fechaPublicacion}
                            </span>
                          )}
                          {cand.edicion && (
                            <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2">
                              {cand.edicion}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-amber-900/15 dark:border-[#253044]">
                        {inLibrary ? (
                          <div className="w-full flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 py-1.5 text-[11px] font-semibold">
                            <Check className="w-3.5 h-3.5" /> En tu biblioteca
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isAdding}
                            onClick={(e) => handleQuickAdd(cand, e)}
                            className="w-full flex items-center justify-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 text-[11px] shadow-sm transition disabled:opacity-50"
                          >
                            {isAdding ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            Añadir libro
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : isLoadingCategory ? (
              <div className="flex items-center justify-center py-12 text-xs text-stone-500 dark:text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                Cargando obras del catálogo...
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] p-8 text-center bg-[#fbf6ea]/40 dark:bg-transparent">
                <BookOpen className="w-8 h-8 text-stone-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="font-serif text-sm font-semibold text-stone-800 dark:text-slate-200">
                  No se pudieron cargar obras para esta estantería
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const category = DISCOVER_CATEGORIES.find((c) => c.id === activeCategoryId);
                    if (category) {
                      setIsLoadingCategory(true);
                      bookMetadataService
                        .fetchSubjectBooks(category.subjectKey, 14)
                        .then((items) => {
                          setCategoryBooks((prev) => ({ ...prev, [category.id]: items }));
                        })
                        .finally(() => setIsLoadingCategory(false));
                    }
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reintentar
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── Modal de Vista Previa / Detalle de Candidato ─── */}
      {selectedCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-5 py-3.5 bg-[#f0e5cc] dark:bg-[#101520]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h3 className="font-serif text-base sm:text-lg font-bold">
                  Vista Previa Bibliográfica
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1 rounded-lg text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                <div className="sm:col-span-4 flex justify-center">
                  <div className="w-36 sm:w-full max-w-[170px]">
                    <BookCover
                      nombre={selectedCandidate.nombre}
                      autor={selectedCandidate.autor}
                      portadaUrl={selectedCandidate.portadaUrl}
                      portadaFallbackUrl={selectedCandidate.portadaFallbackUrl}
                      size="lg"
                    />
                  </div>
                </div>

                <div className="sm:col-span-8 space-y-3">
                  <div>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
                      {selectedCandidate.nombre}
                    </h2>
                    <p className="text-sm text-stone-600 dark:text-slate-300 font-medium mt-1">
                      {selectedCandidate.autor || 'Autor no especificado'}
                    </p>
                  </div>

                  {/* Motivo completo de la sugerencia (visible al detalle sin cortes) */}
                  {selectedCandidate.recommendationReason && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-600/35 bg-amber-500/10 dark:bg-amber-500/15 p-3 text-xs shadow-sm">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                          ¿Por qué te lo sugerimos?
                        </span>
                        <p className="font-serif text-xs sm:text-sm font-semibold text-stone-900 dark:text-amber-100 mt-0.5 leading-snug">
                          {selectedCandidate.recommendationReason}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedCandidate.fechaPublicacion && (
                      <div className="rounded-lg border border-amber-900/15 dark:border-[#253044] p-2 bg-[#fffcf5] dark:bg-[#0D1017]">
                        <span className="block text-[10px] text-stone-500 dark:text-slate-400 uppercase">
                          Publicación
                        </span>
                        <span className="font-semibold">{selectedCandidate.fechaPublicacion}</span>
                      </div>
                    )}
                    {selectedCandidate.paginas && (
                      <div className="rounded-lg border border-amber-900/15 dark:border-[#253044] p-2 bg-[#fffcf5] dark:bg-[#0D1017]">
                        <span className="block text-[10px] text-stone-500 dark:text-slate-400 uppercase">
                          Páginas
                        </span>
                        <span className="font-semibold">{selectedCandidate.paginas} págs.</span>
                      </div>
                    )}
                    {selectedCandidate.editorial && (
                      <div className="rounded-lg border border-amber-900/15 dark:border-[#253044] p-2 bg-[#fffcf5] dark:bg-[#0D1017]">
                        <span className="block text-[10px] text-stone-500 dark:text-slate-400 uppercase">
                          Editorial
                        </span>
                        <span className="font-semibold truncate block">
                          {selectedCandidate.editorial}
                        </span>
                      </div>
                    )}
                    {selectedCandidate.isbn && (
                      <div className="rounded-lg border border-amber-900/15 dark:border-[#253044] p-2 bg-[#fffcf5] dark:bg-[#0D1017]">
                        <span className="block text-[10px] text-stone-500 dark:text-slate-400 uppercase">
                          ISBN
                        </span>
                        <span className="font-mono text-[11px] truncate block">
                          {selectedCandidate.isbn}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedCandidate.suggestedGenre && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-slate-400 block mb-1">
                        Género sugerido
                      </span>
                      <span className="inline-block rounded-lg bg-amber-500/20 border border-amber-600/30 text-amber-900 dark:text-amber-200 px-2.5 py-1 text-xs font-semibold">
                        {selectedCandidate.suggestedGenre}
                      </span>
                    </div>
                  )}

                  {selectedCandidate.sinopsis && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-slate-400 block mb-1">
                        Sinopsis
                      </span>
                      <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1">
                        {selectedCandidate.sinopsis}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción del modal */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-amber-900/20 dark:border-[#242E42] pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="w-full sm:w-auto rounded-xl border border-amber-900/25 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
                >
                  Cerrar
                </button>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleCustomize(selectedCandidate, e)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-600/40 dark:border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 font-semibold px-4 py-2 text-xs transition"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Personalizar y Añadir
                  </button>

                  {isCandidateInLibrary(selectedCandidate) ? (
                    <div className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold px-4 py-2 text-xs">
                      <Check className="w-3.5 h-3.5" /> En tu biblioteca
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={addingId === selectedCandidate.id}
                      onClick={(e) => handleQuickAdd(selectedCandidate, e)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2 text-xs shadow-md transition disabled:opacity-50"
                    >
                      {addingId === selectedCandidate.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Añadir a Por Leer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ─── Contenedor Comunidad de Lectores: montaje perezoso y preservado ─── */}
      {hasVisitedCommunity && (
        <div className={discoverTab === 'community' ? 'block' : 'hidden'}>
          <CommunityReadersView
            currentUserId={currentUserId}
            existingBooks={books}
            onAddBookToMyLibrary={onAddBookFromCommunity || (async () => {})}
            onOpenBookDetail={onOpenBookDetail}
          />
        </div>
      )}
    </div>
  );
};
