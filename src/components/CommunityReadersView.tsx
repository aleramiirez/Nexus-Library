import React, { useEffect, useMemo, useState, useDeferredValue } from 'react';
import {
  Search,
  Users,
  User as UserIcon,
  BookOpen,
  Clock,
  BookmarkCheck,
  BookMarked,
  Check,
  Plus,
  ArrowLeft,
  Loader2,
  Sparkles,
  X,
  Grid,
  Rows3,
  Layers,
  AlertCircle
} from 'lucide-react';
import { Book, UserProfile } from '../types/models';
import { communityService } from '../services/communityService';
import { BookCover } from './BookCover';
import { BookShelf } from './BookShelf';
import { formatStars, ReadingStatus } from '../constants/catalogs';
import { formatFriendlyErrorMessage } from '../utils/errorUtils';

const statusBadgeStyles: Record<ReadingStatus, string> = {
  '❌ No Leído':
    'bg-stone-200/90 text-stone-700 border-stone-400/50 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-600/50',
  '⏳ Leyendo':
    'bg-amber-500/15 text-amber-900 border-amber-600/40 dark:bg-amber-950/90 dark:text-amber-300 dark:border-amber-500/40',
  '⏸️ Pausado':
    'bg-rose-500/15 text-rose-900 border-rose-500/40 dark:bg-rose-950/90 dark:text-rose-300 dark:border-rose-500/40',
  '✅ Leído':
    'bg-emerald-500/15 text-emerald-900 border-emerald-600/40 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-500/40'
};

interface CommunityReadersViewProps {
  currentUserId?: string;
  existingBooks: Book[];
  onAddBookToMyLibrary: (book: Book) => Promise<void>;
  onOpenBookDetail?: (book: Book) => void;
}

export const CommunityReadersView: React.FC<CommunityReadersViewProps> = ({
  currentUserId,
  existingBooks,
  onAddBookToMyLibrary,
  onOpenBookDetail
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [readers, setReaders] = useState<UserProfile[]>([]);
  const [isLoadingReaders, setIsLoadingReaders] = useState(false);

  // Lector seleccionado para ver su estantería
  const [selectedReader, setSelectedReader] = useState<UserProfile | null>(null);
  const [readerBooks, setReaderBooks] = useState<Book[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [shelfFilter, setShelfFilter] = useState<'all' | 'reading' | 'read' | 'unread'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'shelf'>('shelf');
  const [selectedCommunityBook, setSelectedCommunityBook] = useState<Book | null>(null);

  // Estado de libros agregados en esta sesión
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [addedBookKeys, setAddedBookKeys] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Set de títulos / ISBNs ya existentes en mi propia biblioteca para marcarlos
  const myExistingBookKeys = useMemo(() => {
    const set = new Set<string>();
    for (const b of existingBooks) {
      if (b.isbn) set.add(b.isbn.toLowerCase().trim());
      set.add(`${b.nombre.toLowerCase().trim()}:::${b.autor.toLowerCase().trim()}`);
    }
    return set;
  }, [existingBooks]);

  const isAlreadyInMyLibrary = (book: Book): boolean => {
    if (book.isbn && myExistingBookKeys.has(book.isbn.toLowerCase().trim())) return true;
    const key = `${book.nombre.toLowerCase().trim()}:::${book.autor.toLowerCase().trim()}`;
    return myExistingBookKeys.has(key) || addedBookKeys.has(key);
  };

  // Debounce búsqueda con valor diferido
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(deferredSearchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [deferredSearchQuery]);

  // Cargar lectores (por búsqueda o sugeridos iniciales)
  useEffect(() => {
    let active = true;
    setIsLoadingReaders(true);

    communityService
      .searchPublicProfiles(debouncedQuery, currentUserId)
      .then((results) => {
        if (!active) return;
        setReaders(results);
      })
      .catch((err) => {
        console.warn('Error en búsqueda de lectores:', err);
      })
      .finally(() => {
        if (active) setIsLoadingReaders(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, currentUserId]);

  // Cargar biblioteca cuando se selecciona un lector
  const handleSelectReader = async (reader: UserProfile) => {
    setSelectedReader(reader);
    setIsLoadingLibrary(true);
    setShelfFilter('all');
    setViewMode('shelf');

    try {
      const data = await communityService.fetchUserPublicLibrary(reader.id);
      if (data) {
        setReaderBooks(data.books);
      } else {
        setReaderBooks([]);
      }
    } catch (err) {
      console.warn('Error al cargar libros del lector:', err);
      setReaderBooks([]);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  // Guardar un libro de la estantería del amigo en la biblioteca propia
  const handleAddBook = async (book: Book) => {
    const key = `${book.nombre.toLowerCase().trim()}:::${book.autor.toLowerCase().trim()}`;
    setAddingBookId(book.id);

    try {
      await onAddBookToMyLibrary(book);
      setAddedBookKeys((prev) => new Set(prev).add(key));
      setToast({
        type: 'success',
        title: '¡Libro guardado!',
        message: `"${book.nombre}" ya está en tus lecturas pendientes de tu biblioteca personal.`
      });
    } catch (err) {
      console.warn('Error al guardar libro de amigo:', err);
      setToast({
        type: 'error',
        title: 'No se pudo guardar el libro',
        message: formatFriendlyErrorMessage(
          err,
          'No hemos podido añadir este libro en este momento. Revisa tu conexión a internet e inténtalo de nuevo.'
        )
      });
    } finally {
      setAddingBookId(null);
    }
  };

  // Renderizado del Toast accesible y amigable
  const renderToastNotification = () => {
    if (!toast) return null;
    return (
      <div
        role="status"
        aria-live="polite"
        className={
          'fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md max-w-sm transition-all duration-300 animate-slide-up ' +
          (toast.type === 'success'
            ? 'border-emerald-500/40 bg-[#101824]/95 text-emerald-100 shadow-emerald-950/40'
            : toast.type === 'error'
            ? 'border-rose-500/40 bg-[#1e1014]/95 text-rose-100 shadow-rose-950/40'
            : 'border-amber-500/40 bg-[#1a1610]/95 text-amber-100 shadow-amber-950/40')
        }
      >
        {toast.type === 'success' ? (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 space-y-0.5 text-xs">
          <p className="font-bold font-serif text-sm text-stone-100">{toast.title}</p>
          <p className="text-stone-300 leading-relaxed font-normal">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Cerrar aviso"
          className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // Métricas de la biblioteca del lector seleccionado
  const readerMetrics = useMemo(() => {
    return {
      total: readerBooks.length,
      reading: readerBooks.filter((b) => b.progreso === '⏳ Leyendo').length,
      read: readerBooks.filter((b) => b.progreso === '✅ Leído').length,
      unread: readerBooks.filter((b) => b.progreso === '❌ No Leído').length
    };
  }, [readerBooks]);

  const filteredReaderBooks = useMemo(() => {
    if (shelfFilter === 'reading') return readerBooks.filter((b) => b.progreso === '⏳ Leyendo');
    if (shelfFilter === 'read') return readerBooks.filter((b) => b.progreso === '✅ Leído');
    if (shelfFilter === 'unread') return readerBooks.filter((b) => b.progreso === '❌ No Leído');
    return readerBooks;
  }, [readerBooks, shelfFilter]);

  /* ─────────────────── VISTA 2: ESTANTERÍA PÚBLICA DE UN LECTOR ─────────────────── */
  if (selectedReader) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Toast amigable */}
        {renderToastNotification()}

        {/* Botón volver */}
        <button
          type="button"
          onClick={() => setSelectedReader(null)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a buscar lectores
        </button>

        {/* Cabecera del Lector */}
        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-2xl flex items-center justify-center shadow-md shrink-0">
                {selectedReader.displayName
                  ? selectedReader.displayName.charAt(0).toUpperCase()
                  : selectedReader.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                  {selectedReader.displayName}
                </h2>
                <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400">
                  @{selectedReader.username}
                </span>
                {selectedReader.bio && (
                  <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                    "{selectedReader.bio}"
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Estantería Pública
              </span>
            </div>
          </div>

          {/* Filtros de estantería y selector de vista */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-900/15 dark:border-[#222B3C]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShelfFilter('all')}
                className={
                  'rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ' +
                  (shelfFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/50 dark:bg-[#101520] text-stone-700 dark:text-slate-300 border border-amber-900/20 dark:border-[#283246] hover:border-amber-500/50')
                }
              >
                Todos ({readerMetrics.total})
              </button>
              <button
                type="button"
                onClick={() => setShelfFilter('reading')}
                className={
                  'rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ' +
                  (shelfFilter === 'reading'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/50 dark:bg-[#101520] text-stone-700 dark:text-slate-300 border border-amber-900/20 dark:border-[#283246] hover:border-amber-500/50')
                }
              >
                ⏳ Leyendo ({readerMetrics.reading})
              </button>
              <button
                type="button"
                onClick={() => setShelfFilter('read')}
                className={
                  'rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ' +
                  (shelfFilter === 'read'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/50 dark:bg-[#101520] text-stone-700 dark:text-slate-300 border border-amber-900/20 dark:border-[#283246] hover:border-amber-500/50')
                }
              >
                ✅ Leídos ({readerMetrics.read})
              </button>
              <button
                type="button"
                onClick={() => setShelfFilter('unread')}
                className={
                  'rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ' +
                  (shelfFilter === 'unread'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/50 dark:bg-[#101520] text-stone-700 dark:text-slate-300 border border-amber-900/20 dark:border-[#283246] hover:border-amber-500/50')
                }
              >
                🔖 Por leer ({readerMetrics.unread})
              </button>
            </div>

            {/* Selector de vista: Estantería de madera vs Cuadrícula */}
            <div className="flex items-center gap-1 bg-[#eedfbe]/70 dark:bg-[#101520] p-1 rounded-xl border border-amber-900/20 dark:border-[#242E42] shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('shelf')}
                className={
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ' +
                  (viewMode === 'shelf'
                    ? 'bg-white dark:bg-[#1A2232] text-amber-900 dark:text-amber-300 shadow-sm'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200')
                }
                title="Vista en estantería de madera"
              >
                <Rows3 className="w-3.5 h-3.5" />
                <span>Estantería</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ' +
                  (viewMode === 'grid'
                    ? 'bg-white dark:bg-[#1A2232] text-amber-900 dark:text-amber-300 shadow-sm'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200')
                }
                title="Vista en tarjetas"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Cuadrícula</span>
              </button>
            </div>
          </div>
        </div>

        {/* Libros de la estantería del lector */}
        {isLoadingLibrary ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-slate-400">
            <Loader2 className="w-7 h-7 text-amber-600 dark:text-amber-400 animate-spin" />
            <span className="font-serif text-sm">Cargando la estantería de {selectedReader.displayName}...</span>
          </div>
        ) : filteredReaderBooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-12 text-center text-stone-600 dark:text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-amber-600/60 dark:text-amber-400/60" />
            <p className="font-serif text-base font-bold text-stone-800 dark:text-slate-200">
              No hay libros en esta categoría actualmente.
            </p>
            <p className="text-xs">Este lector aún no ha clasificado títulos en esta estantería.</p>
          </div>
        ) : viewMode === 'shelf' ? (
          <div className="space-y-3">
            <div className="text-xs text-stone-600 dark:text-slate-400 flex items-center gap-1.5 px-1 font-serif italic">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Haz clic sobre cualquier libro en la balda para consultar su ficha bibliográfica y añadirlo.</span>
            </div>
            <BookShelf
              books={filteredReaderBooks}
              onOpenDetail={(bookId) => {
                const book = filteredReaderBooks.find((b) => b.id === bookId);
                if (book) setSelectedCommunityBook(book);
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredReaderBooks.map((book) => {
              const alreadySaved = isAlreadyInMyLibrary(book);
              const isAdding = addingBookId === book.id;

              return (
                <article
                  key={book.id}
                  className="group relative flex flex-col justify-between cursor-pointer rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea]/95 dark:bg-[#161C28]/95 hover:bg-[#fffcf5] dark:hover:bg-[#1B2333] p-2.5 sm:p-3 shadow-sm hover:-translate-y-1.5 hover:border-amber-600/60 dark:hover:border-amber-400/70 hover:shadow-[0_14px_30px_-8px_rgba(180,115,30,0.22)] dark:hover:shadow-[0_14px_30px_-8px_rgba(245,158,11,0.22)] transition-all duration-300 ease-out"
                >
                  <div
                    onClick={() => setSelectedCommunityBook(book)}
                    className="flex-1 flex flex-col"
                  >
                    {/* Portada con textura 3D realista sin máscara de corte */}
                    <div className="relative mb-2 sm:mb-2.5">
                      <BookCover
                        portadaUrl={book.portadaUrl}
                        portadaFallbackUrl={book.portadaFallbackUrl}
                        portadaDataUrl={book.portadaDataUrl}
                        nombre={book.nombre}
                        autor={book.autor}
                      />

                      {book.sagaNombre && (
                        <span className="absolute top-2 left-2 z-10 max-w-[88%] truncate rounded-md bg-[#0D1017]/90 backdrop-blur-sm border border-amber-400/30 px-1.5 sm:px-2 py-0.5 text-[9px] font-medium text-amber-200 shadow">
                          {book.sagaNombre} {book.volumen ? '#' + String(book.volumen) : ''}
                        </span>
                      )}
                    </div>

                    {/* Metadatos y valoración */}
                    <div className="flex-1 flex flex-col justify-between gap-1">
                      <div>
                        <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                          <span
                            className={
                              'inline-flex items-center whitespace-nowrap shrink-0 rounded-full border px-1.5 sm:px-2 py-0.5 text-[10px] font-medium ' +
                              statusBadgeStyles[book.progreso]
                            }
                          >
                            {book.progreso}
                          </span>
                          {book.puntuacion && (
                            <span
                              className="text-[10px] tracking-tighter whitespace-nowrap text-amber-600 dark:text-amber-400 font-bold"
                              title={`${book.puntuacion} de 5 estrellas`}
                            >
                              {formatStars(book.puntuacion)}
                            </span>
                          )}
                        </div>

                        <h3
                          className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 line-clamp-2 leading-snug"
                          title={book.nombre}
                        >
                          {book.nombre}
                        </h3>

                        <p
                          className="text-[11px] text-stone-600 dark:text-slate-400 truncate mt-0.5"
                          title={book.autor}
                        >
                          {book.autor || 'Autor desconocido'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botón de acción inferior */}
                  <div className="pt-2 mt-2.5 border-t border-amber-900/10 dark:border-[#1F2738]">
                    {alreadySaved ? (
                      <span className="inline-flex items-center justify-center gap-1 w-full rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 py-1.5 text-[10px] font-bold">
                        <Check className="w-3 h-3" /> En tu biblioteca
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddBook(book);
                        }}
                        className="inline-flex items-center justify-center gap-1 w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 py-1.5 text-[10px] font-bold shadow-sm transition"
                      >
                        {isAdding ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        {isAdding ? 'Guardando...' : 'Añadir a mi lista'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Modal de detalle de libro del lector amigo */}
        {selectedCommunityBook && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedCommunityBook(null)}
          >
            <div
              className="relative w-full max-w-2xl rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-5 py-3.5 bg-[#f0e5cc] dark:bg-[#101520] shrink-0">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold min-w-0">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="truncate">Ficha bibliográfica · Biblioteca de {selectedReader.displayName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCommunityBook(null)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                  <div className="sm:col-span-5 flex flex-col items-center">
                    <div className="w-36 sm:w-44">
                      <BookCover
                        nombre={selectedCommunityBook.nombre}
                        autor={selectedCommunityBook.autor}
                        portadaUrl={selectedCommunityBook.portadaUrl}
                        portadaFallbackUrl={selectedCommunityBook.portadaFallbackUrl}
                        portadaDataUrl={selectedCommunityBook.portadaDataUrl}
                        size="lg"
                      />
                    </div>

                    <div className="mt-3 w-full rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4] dark:bg-[#101520] p-3 text-center space-y-1">
                      <p className="text-[11px] font-medium text-stone-600 dark:text-slate-400">
                        Valoración de {selectedReader.displayName}
                      </p>
                      <div className="text-base text-amber-600 dark:text-amber-400 font-bold">
                        {selectedCommunityBook.puntuacion
                          ? `${formatStars(selectedCommunityBook.puntuacion)} (${selectedCommunityBook.puntuacion}/5)`
                          : 'Sin valorar'}
                      </div>
                      <span
                        className={
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ' +
                          statusBadgeStyles[selectedCommunityBook.progreso]
                        }
                      >
                        {selectedCommunityBook.progreso}
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-7 space-y-3">
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-slate-100 leading-tight">
                        {selectedCommunityBook.nombre}
                      </h3>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mt-1">
                        {selectedCommunityBook.autor || 'Autor desconocido'}
                      </p>
                    </div>

                    {selectedCommunityBook.sagaNombre && (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 px-2.5 py-1 text-xs font-semibold">
                        <Layers className="w-3.5 h-3.5" />
                        <span>
                          Saga: {selectedCommunityBook.sagaNombre}{' '}
                          {selectedCommunityBook.volumen ? `#${selectedCommunityBook.volumen}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-stone-600 dark:text-slate-400">
                      {selectedCommunityBook.genero && (
                        <div>
                          <span className="font-bold block text-stone-800 dark:text-slate-300">Género:</span>
                          <span>{selectedCommunityBook.genero}</span>
                        </div>
                      )}
                      {selectedCommunityBook.paginas ? (
                        <div>
                          <span className="font-bold block text-stone-800 dark:text-slate-300">Páginas:</span>
                          <span>{selectedCommunityBook.paginas} págs.</span>
                        </div>
                      ) : null}
                      {selectedCommunityBook.fechaPublicacion && (
                        <div>
                          <span className="font-bold block text-stone-800 dark:text-slate-300">Publicado:</span>
                          <span>{selectedCommunityBook.fechaPublicacion}</span>
                        </div>
                      )}
                      {selectedCommunityBook.editorial && (
                        <div>
                          <span className="font-bold block text-stone-800 dark:text-slate-300">Editorial:</span>
                          <span>{selectedCommunityBook.editorial}</span>
                        </div>
                      )}
                    </div>

                    {selectedCommunityBook.sinopsis && (
                      <div className="pt-2 border-t border-amber-900/15 dark:border-[#242E42]">
                        <p className="text-xs font-bold text-stone-800 dark:text-slate-300 mb-1">Sinopsis / Notas:</p>
                        <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed bg-[#f4ead4]/60 dark:bg-[#101520] p-3 rounded-xl border border-amber-900/10 dark:border-[#222B3A] italic">
                          "{selectedCommunityBook.sinopsis}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pie de modal */}
              <div className="border-t border-amber-900/20 dark:border-[#242E42] px-5 py-3.5 bg-[#f0e5cc] dark:bg-[#101520] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedCommunityBook(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-stone-700 dark:text-slate-300 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
                >
                  Cerrar
                </button>
                {isAlreadyInMyLibrary(selectedCommunityBook) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-4 py-2 text-xs font-bold">
                    <Check className="w-4 h-4" /> Ya en tu biblioteca
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={addingBookId === selectedCommunityBook.id}
                    onClick={() => handleAddBook(selectedCommunityBook)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 text-xs shadow-md transition"
                  >
                    {addingBookId === selectedCommunityBook.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {addingBookId === selectedCommunityBook.id ? 'Guardando...' : 'Añadir a mi lista de lectura'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─────────────────── VISTA 1: BUSCADOR DE LECTORES ─────────────────── */
  return (
    <div className="space-y-6">
      {/* Buscador de Lectores */}
      <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-6 shadow-sm space-y-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Comunidad de Lectores
          </h2>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
            Encuentra a tus amigos por su nombre o su identificador único (@handle) para consultar sus estanterías de libros recomendados.
          </p>
        </div>

        <div className="relative max-w-xl">
          <Search className="w-4 h-4 text-stone-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por @usuario o nombre (ej: @aleramirez o Alejandro)..."
            className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-white dark:bg-[#101520] pl-10 pr-9 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          {isLoadingReaders ? (
            <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Lista de lectores */}
      {isLoadingReaders && readers.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-slate-400">
          <Loader2 className="w-7 h-7 text-amber-600 dark:text-amber-400 animate-spin" />
          <span className="font-serif text-sm">Buscando lectores en Nexus Library...</span>
        </div>
      ) : readers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-12 text-center text-stone-600 dark:text-slate-400 space-y-2">
          <Users className="w-8 h-8 mx-auto text-amber-600/60 dark:text-amber-400/60" />
          <p className="font-serif text-base font-bold text-stone-800 dark:text-slate-200">
            {searchQuery ? `No encontramos lectores con "${searchQuery}"` : 'Aún no hay otros lectores públicos'}
          </p>
          <p className="text-xs max-w-md mx-auto">
            {searchQuery
              ? 'Verifica que el nombre o el @usuario esté bien escrito, o invita a tus amigos a crear su perfil público.'
              : 'Diles a tus amigos que se registren y configuren su perfil público en Ajustes para compartir estanterías.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {readers.map((reader) => (
            <div
              key={reader.id}
              onClick={() => handleSelectReader(reader)}
              className="group cursor-pointer rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/90 dark:bg-[#141A26] p-5 hover:border-amber-500/60 hover:bg-[#fffcf5] dark:hover:bg-[#182030] transition shadow-sm hover:shadow-md flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-xl flex items-center justify-center shadow-sm shrink-0">
                  {reader.displayName
                    ? reader.displayName.charAt(0).toUpperCase()
                    : reader.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-base font-bold truncate text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                    {reader.displayName}
                  </h3>
                  <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400 block">
                    @{reader.username}
                  </span>
                  {reader.bio ? (
                    <p className="text-xs text-stone-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      "{reader.bio}"
                    </p>
                  ) : (
                    <p className="text-xs italic text-stone-400 dark:text-slate-500 mt-1">
                      Lector de Nexus Library
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-amber-900/10 dark:border-[#20293C] flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                <span>Explorar estantería</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast amigable */}
      {renderToastNotification()}
    </div>
  );
};
