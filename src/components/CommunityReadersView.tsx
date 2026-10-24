import React, { useEffect, useMemo, useState } from 'react';
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
  X
} from 'lucide-react';
import { Book, UserProfile } from '../types/models';
import { communityService } from '../services/communityService';
import { BookCover } from './BookCover';

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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [readers, setReaders] = useState<UserProfile[]>([]);
  const [isLoadingReaders, setIsLoadingReaders] = useState(false);

  // Lector seleccionado para ver su estantería
  const [selectedReader, setSelectedReader] = useState<UserProfile | null>(null);
  const [readerBooks, setReaderBooks] = useState<Book[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [shelfFilter, setShelfFilter] = useState<'all' | 'reading' | 'read' | 'unread'>('all');

  // Estado de libros agregados en esta sesión
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [addedBookKeys, setAddedBookKeys] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Debounce búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      setToastMessage(`"¡${book.nombre}" añadido a tus lecturas pendientes!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error al guardar libro de amigo:', err);
    } finally {
      setAddingBookId(null);
    }
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
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-[#101520] text-emerald-200 px-4 py-3 shadow-2xl backdrop-blur-md text-xs font-semibold">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

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

          {/* Filtros de estantería */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-900/15 dark:border-[#222B3C]">
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredReaderBooks.map((book) => {
              const alreadySaved = isAlreadyInMyLibrary(book);
              const isAdding = addingBookId === book.id;

              return (
                <div
                  key={book.id}
                  className="group relative rounded-xl border border-amber-900/20 dark:border-[#253044] bg-[#fffcf5] dark:bg-[#121824] p-3 flex flex-col justify-between hover:border-amber-500/60 transition shadow-sm hover:shadow-md"
                >
                  <div
                    onClick={() => onOpenBookDetail?.(book)}
                    className="cursor-pointer space-y-2.5"
                  >
                    <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-amber-900/10 dark:bg-slate-800 shadow-sm relative">
                      <BookCover
                        portadaUrl={book.portadaUrl}
                        portadaFallbackUrl={book.portadaFallbackUrl}
                        portadaDataUrl={book.portadaDataUrl}
                        nombre={book.nombre}
                        autor={book.autor}
                        className="w-full h-full object-cover"
                      />
                      {book.progreso && (
                        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] text-white px-1.5 py-0.5 font-semibold">
                          {book.progreso.split(' ')[0]} {book.progreso.split(' ')[1]}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-serif text-xs font-bold line-clamp-2 text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                        {book.nombre}
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-slate-400 truncate mt-0.5">
                        {book.autor}
                      </p>
                      {book.puntuacion && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                          {'★'.repeat(book.puntuacion)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-amber-900/10 dark:border-[#1F2738]">
                    {alreadySaved ? (
                      <span className="inline-flex items-center justify-center gap-1 w-full rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 py-1.5 text-[10px] font-bold">
                        <Check className="w-3 h-3" /> En tu biblioteca
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() => handleAddBook(book)}
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
                </div>
              );
            })}
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
    </div>
  );
};
