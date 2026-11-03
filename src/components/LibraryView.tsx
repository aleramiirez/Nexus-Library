import React, { useState } from 'react';
import {
  Search,
  X,
  Plus,
  FileUp,
  SlidersHorizontal,
  ChevronDown,
  Rows3,
  Grid,
  List,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Loader2
} from 'lucide-react';
import {
  Book,
  Saga,
  LibraryFilters,
  LibraryViewMode,
  SortField,
  StarRating
} from '../types/models';
import {
  formatStars,
  GENRES,
  Genre,
  READING_STATUSES,
  ReadingStatus,
  STAR_OPTIONS,
  Subgenre
} from '../constants/catalogs';
import { NavigationSection } from './BookSidebar';
import { initialFilters } from '../hooks/useLibraryFilters';
import { LibrarySelect, LibrarySelectGroup } from './LibrarySelect';
import { BookCard } from './BookCard';
import { BookCover } from './BookCover';
import { BookShelf } from './BookShelf';

export interface LibraryViewProps {
  activeSection: NavigationSection;
  books: Book[];
  filteredBooks: Book[];
  sagas: Saga[];
  filters: LibraryFilters;
  setFilters: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  subgenreSelectGroups?: LibrarySelectGroup<string>[];
  allSubgenresOptions?: Array<{ value: string; label: string }>;
  metrics: {
    total: number;
    reading: number;
    unread: number;
    paused: number;
    read: number;
  };
  isSampleActive: boolean;
  isLoadingSample: boolean;
  isRemovingSample: boolean;
  detailBookId: string | null;
  onNavigate: (section: NavigationSection) => void;
  onOpenCreateBook: () => void;
  onOpenEpubImport: () => void;
  onOpenImport: () => void;
  onOpenCardDetail: (book: Book) => void;
  onOpenBookDetail: (bookId: string) => void;
  onOpenEditBook: (book: Book) => void;
  onDeleteBook: (book: Book) => void;
  onBookStatusChange: (bookId: string, status: ReadingStatus) => void;
  onLoadSampleBooks: () => void;
  onRemoveSampleBooks: () => void;
  onKeepSampleBooks: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  activeSection,
  books,
  filteredBooks,
  sagas,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  subgenreSelectGroups,
  allSubgenresOptions,
  metrics,
  isSampleActive,
  isLoadingSample,
  isRemovingSample,
  detailBookId,
  onNavigate,
  onOpenCreateBook,
  onOpenEpubImport,
  onOpenImport,
  onOpenCardDetail,
  onOpenBookDetail,
  onOpenEditBook,
  onDeleteBook,
  onBookStatusChange,
  onLoadSampleBooks,
  onRemoveSampleBooks,
  onKeepSampleBooks
}) => {
  const [viewMode, setViewMode] = useState<LibraryViewMode>('shelf');

  const renderMobileShelfTabs = () => {
    const shelfTabs: { id: NavigationSection; label: string; count: number }[] = [
      { id: 'library', label: 'Todos', count: metrics.total },
      { id: 'shelf-reading', label: '⏳ Leyendo', count: metrics.reading },
      { id: 'shelf-unread', label: '❌ Por leer', count: metrics.unread },
      { id: 'shelf-read', label: '✅ Leídos', count: metrics.read },
      { id: 'shelf-paused', label: '⏸️ Pausados', count: metrics.paused }
    ];

    return (
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shelfTabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={
                'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ' +
                (isActive
                  ? 'border-amber-600 dark:border-amber-400 bg-amber-500 text-slate-950 shadow-sm'
                  : 'border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300')
              }
            >
              <span>{tab.label}</span>
              <span
                className={
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold ' +
                  (isActive
                    ? 'bg-slate-950/15 text-slate-950'
                    : 'bg-amber-900/10 dark:bg-slate-800 text-stone-600 dark:text-slate-400')
                }
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderShelfSection = (status: ReadingStatus, title: string, subtitle: string) => {
    const shelfBooks = books.filter((b) => b.progreso === status);
    return (
      <div className="space-y-4 sm:space-y-6">
        {renderMobileShelfTabs()}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-amber-900/20 dark:border-[#242E42] pb-3.5 sm:pb-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">{title}</h1>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
              {subtitle} · <strong>{shelfBooks.length}</strong>{' '}
              {shelfBooks.length === 1 ? 'libro' : 'libros'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateBook}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition self-start"
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
                onOpenDetail={onOpenCardDetail}
                onEdit={onOpenEditBook}
                onDelete={onDeleteBook}
                onQuickStatusChange={onBookStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (activeSection === 'shelf-unread') {
    return renderShelfSection('❌ No Leído', 'Estantería: Por Leer', 'Libros pendientes de iniciar en tu colección');
  }

  if (activeSection === 'shelf-reading') {
    return renderShelfSection('⏳ Leyendo', 'Estantería: Leyendo Actualmente', 'Lecturas activas en curso');
  }

  if (activeSection === 'shelf-paused') {
    return renderShelfSection('⏸️ Pausado', 'Estantería: Lecturas Pausadas', 'Libros detenidos temporalmente');
  }

  if (activeSection === 'shelf-read') {
    return renderShelfSection('✅ Leído', 'Estantería: Libros Leídos', 'Lecturas completadas en tu biblioteca');
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {renderMobileShelfTabs()}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Mi Biblioteca</h1>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
            Mostrando <strong>{filteredBooks.length}</strong> de{' '}
            <strong>{books.length}</strong> libros almacenados
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2">
          <div className="relative w-full sm:w-44 md:w-52 lg:w-60">
            <Search className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Buscar título, autor, ISBN..."
              className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] pl-9 pr-8 py-2.5 sm:py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition shadow-sm"
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
            onClick={onOpenCreateBook}
            title="Añadir libro"
            aria-label="Añadir libro"
            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenEpubImport}
            title="Subir archivos de libros (.epub, .fb2, .pdf)"
            aria-label="Subir archivos de libros"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-amber-600/45 dark:border-amber-500/45 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 transition shadow-sm shrink-0"
          >
            <FileUp className="w-4 h-4 text-amber-700 dark:text-amber-400" />
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
        <div className="rounded-2xl editorial-card-surface p-4 space-y-3">
          {/* Fila 1: Filtros de Clasificación Temática */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <LibrarySelect
                value={filters.genero}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, genero: val as Genre | '', subgenero: '' }))
                }
                placeholder="Todos los géneros"
                options={[
                  { value: '', label: 'Todos los géneros' },
                  ...GENRES.map((g) => ({ value: g, label: g }))
                ]}
              />
            </div>

            <div>
              <LibrarySelect
                value={filters.subgenero}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, subgenero: val as Subgenre | '' }))
                }
                placeholder="Todos los subgéneros"
                options={!filters.genero ? allSubgenresOptions : undefined}
                groups={filters.genero ? subgenreSelectGroups : undefined}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <LibrarySelect
                value={filters.sagaId}
                onChange={(val) => setFilters((f) => ({ ...f, sagaId: val as string }))}
                placeholder="Todas las sagas"
                options={[
                  { value: '', label: 'Todas las sagas' },
                  { value: '__none__', label: 'Libros independientes (Sin saga)' },
                  ...sagas.map((s) => ({ value: s.id, label: `Saga: ${s.nombre}` }))
                ]}
              />
            </div>
          </div>

          {/* Fila 2: Estado, Puntuación, Ordenación y Limpiar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1 items-center">
            <div className="lg:col-span-3">
              <LibrarySelect
                value={filters.progreso}
                onChange={(val) =>
                  setFilters((f) => ({ ...f, progreso: val as ReadingStatus | '' }))
                }
                placeholder="Todos los estados"
                options={[
                  { value: '', label: 'Todos los estados' },
                  ...READING_STATUSES.map((st) => ({ value: st, label: st }))
                ]}
              />
            </div>

            <div className="lg:col-span-3">
              <LibrarySelect
                value={filters.puntuacion === null ? '' : String(filters.puntuacion)}
                onChange={(val) => {
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
                placeholder="Cualquier puntuación"
                options={[
                  { value: '', label: 'Cualquier puntuación' },
                  ...STAR_OPTIONS.map((opt) => ({
                    value: String(opt.value),
                    label: opt.label
                  })),
                  { value: 'unrated', label: 'Sin puntuar' }
                ]}
              />
            </div>

            <div className="lg:col-span-4 flex items-center gap-1.5 min-w-0">
              <div className="flex-1 min-w-0">
                <LibrarySelect
                  value={filters.sortBy}
                  onChange={(val) =>
                    setFilters((f) => ({ ...f, sortBy: val as SortField }))
                  }
                  options={[
                    { value: 'createdAt', label: 'Ordenar: Fecha incorporación' },
                    { value: 'nombre', label: 'Ordenar: Título' },
                    { value: 'autor', label: 'Ordenar: Autor' },
                    { value: 'fechaPublicacion', label: 'Ordenar: Año publicación' },
                    { value: 'puntuacion', label: 'Ordenar: Puntuación' },
                    { value: 'paginas', label: 'Ordenar: Número de páginas' }
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    sortOrder: f.sortOrder === 'asc' ? 'desc' : 'asc'
                  }))
                }
                title="Invertir orden ascendente/descendente"
                className="p-2 shrink-0 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] text-stone-700 dark:text-slate-200 hover:border-amber-500 transition"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => setFilters(initialFilters)}
                className="w-full inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-900/25 dark:border-[#283246] hover:border-amber-500 px-3 py-2 text-xs text-stone-700 dark:text-slate-300 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Limpiar filtros</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isSampleActive && (
        <div className="mb-4 p-3 sm:px-4 rounded-xl border border-amber-600/35 bg-amber-500/10 dark:bg-amber-500/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Estás explorando con <strong>4 obras maestras de muestra</strong> (con sagas, citas memorables y portadas HD).
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRemoveSampleBooks}
              disabled={isRemovingSample}
              className="px-3 py-1.5 rounded-lg border border-amber-600/40 hover:bg-amber-500/20 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {isRemovingSample ? 'Limpiando...' : 'Limpiar muestra'}
            </button>
            <button
              type="button"
              onClick={onKeepSampleBooks}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-[11px] font-bold shadow-xs transition cursor-pointer"
            >
              Conservar en mi biblioteca
            </button>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div className="catalog-card-panel relative mt-6 p-6 sm:p-12 text-center shadow-lg animate-fadeIn">
          <div className="catalog-brass-tab">Apertura de Biblioteca · Primeros Pasos</div>
          <div className="max-w-xl mx-auto space-y-4 pt-2">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-slate-100">
                Bienvenido a tu santuario literario
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 mt-2 leading-relaxed">
                Organiza tu biblioteca con portadas oficiales, seguimiento de sagas, estanterías visuales en 3D, diario de lectura y citas memorables.
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onLoadSampleBooks}
                disabled={isLoadingSample}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isLoadingSample ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Explorar con 4 libros de muestra</span>
              </button>

              <button
                type="button"
                onClick={onOpenImport}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#1B2333] hover:bg-amber-500/10 text-stone-800 dark:text-slate-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                <FileUp className="w-4 h-4 text-amber-600" />
                <span>Importar Goodreads / CSV</span>
              </button>

              <button
                type="button"
                onClick={onOpenCreateBook}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-stone-300 dark:border-[#283246] hover:bg-black/5 dark:hover:bg-white/5 text-stone-700 dark:text-slate-300 font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir mi primer libro</span>
              </button>
            </div>
          </div>
        </div>
      ) : filteredBooks.length === 0 ? (
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
              onOpenDetail={onOpenCardDetail}
              onEdit={onOpenEditBook}
              onDelete={onDeleteBook}
              onQuickStatusChange={onBookStatusChange}
            />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="rounded-2xl editorial-card-surface overflow-hidden">
          <ul className="sm:hidden divide-y divide-amber-900/10 dark:divide-[#20293A]">
            {filteredBooks.map((book) => (
              <li
                key={book.id}
                data-book-id={book.id}
                onClick={() => onOpenBookDetail(book.id)}
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
                    data-book-id={book.id}
                    onClick={() => onOpenBookDetail(book.id)}
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
        <BookShelf books={filteredBooks} onOpenDetail={onOpenBookDetail} openedBookId={detailBookId} />
      )}
    </div>
  );
};
