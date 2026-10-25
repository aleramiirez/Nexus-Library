import React, { useEffect, useMemo, useState, useDeferredValue, useTransition } from 'react';
import { createPortal } from 'react-dom';
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
  AlertCircle,
  Calendar,
  Hash,
  Building2,
  Globe,
  UserPlus,
  UserCheck,
  UserMinus,
  Lock
} from 'lucide-react';
import { Book, UserProfile, Friendship, FriendshipStatus } from '../types/models';
import { communityService } from '../services/communityService';
import { friendshipService } from '../services/friendshipService';
import { BookCover } from './BookCover';
import { BookShelf } from './BookShelf';
import { formatStars, ReadingStatus, READING_STATUSES } from '../constants/catalogs';
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
  const [isLoadingReaders, setIsLoadingReaders] = useState(true);
  const [, startTransition] = useTransition();

  // Subpestañas: Mis Amigos vs Explorar Lectores
  const [communitySubTab, setCommunitySubTab] = useState<'friends' | 'explore'>('friends');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendshipMap, setFriendshipMap] = useState<
    Record<string, { status: FriendshipStatus; friendshipId: string; isRequester: boolean }>
  >({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<{ id: string; name: string; friendshipId: string } | null>(null);

  // Lector seleccionado para ver su estantería
  const [selectedReader, setSelectedReader] = useState<UserProfile | null>(null);
  const [readerBooks, setReaderBooks] = useState<Book[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [shelfFilter, setShelfFilter] = useState<'all' | 'reading' | 'read' | 'unread'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'shelf'>('shelf');
  const [selectedCommunityBook, setSelectedCommunityBook] = useState<Book | null>(null);

  const loadFriendsData = async () => {
    if (!currentUserId) return;
    setIsLoadingFriends(true);
    try {
      const [friendsList, fMap] = await Promise.all([
        friendshipService.getFriends(currentUserId),
        friendshipService.getFriendshipMap(currentUserId)
      ]);
      setFriends(friendsList);
      setFriendshipMap(fMap);
    } catch {
      // Ignorado
    } finally {
      setIsLoadingFriends(false);
    }
  };

  useEffect(() => {
    loadFriendsData();
  }, [currentUserId]);

  const handleShelfFilterChange = (filter: 'all' | 'reading' | 'read' | 'unread') => {
    startTransition(() => {
      setShelfFilter(filter);
    });
  };

  const handleViewModeChange = (mode: 'shelf' | 'grid') => {
    startTransition(() => {
      setViewMode(mode);
    });
  };

  const handleBackToReaders = () => {
    startTransition(() => {
      setSelectedReader(null);
      setReaderBooks([]);
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  const handleSubTabChange = (tab: 'friends' | 'explore') => {
    setCommunitySubTab(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  const handleConfirmRemoveFriend = async () => {
    if (!friendToRemove) return;
    setActionLoadingId(friendToRemove.friendshipId);

    try {
      const res = await friendshipService.removeFriend(friendToRemove.friendshipId);
      if (res.success) {
        setFriends((prev) => prev.filter((f) => f.id !== friendToRemove.friendshipId));
        setFriendshipMap((prev) => {
          const next = { ...prev };
          delete next[friendToRemove.id];
          return next;
        });
        setToast({
          type: 'info',
          title: 'Amistad finalizada',
          message: `Has dejado de ser amigo de ${friendToRemove.name}.`
        });
        setFriendToRemove(null);
      } else {
        setToast({
          type: 'error',
          title: 'No se pudo eliminar',
          message: res.message
        });
      }
    } catch {
      setToast({
        type: 'error',
        title: 'Error de red',
        message: 'No se pudo completar la operación en este momento.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendFriendRequest = async (targetUserId: string, targetName: string) => {
    if (!currentUserId) {
      setToast({
        type: 'info',
        title: 'Inicia sesión',
        message: 'Debes iniciar sesión para conectar con amigos de lectura.'
      });
      return;
    }
    setActionLoadingId(targetUserId);
    try {
      const res = await friendshipService.sendFriendRequest(currentUserId, targetUserId);
      if (res.success) {
        setToast({
          type: 'success',
          title: 'Solicitud enviada',
          message: `Solicitud de amistad enviada a ${targetName}.`
        });
        loadFriendsData();
      } else {
        setToast({
          type: 'info',
          title: 'Información',
          message: res.message
        });
      }
    } catch {
      setToast({
        type: 'error',
        title: 'Error de red',
        message: 'No se pudo enviar la solicitud. Inténtalo más tarde.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptFriendRequest = async (friendshipId: string, targetName: string) => {
    setActionLoadingId(friendshipId);
    try {
      const res = await friendshipService.respondFriendRequest(friendshipId, 'accept');
      setToast({
        type: res.success ? 'success' : 'error',
        title: res.success ? '¡Nuevo amigo!' : 'Error',
        message: res.success ? `¡Ahora eres amigo de ${targetName}!` : res.message
      });
      if (res.success) {
        loadFriendsData();
      }
    } catch {
      setToast({
        type: 'error',
        title: 'Error de red',
        message: 'No se pudo aceptar la solicitud.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

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
    startTransition(() => {
      setSelectedReader(reader);
      setShelfFilter('all');
      setViewMode('shelf');
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    setIsLoadingLibrary(true);

    try {
      const data = await communityService.fetchUserPublicLibrary(reader.id);
      if (data) {
        setSelectedReader(data.profile);
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

  // Modal de detalle con createPortal para cubrir el 100% de la ventana de forma natural (incluyendo el sidebar)
  const renderCommunityBookModal = () => {
    if (!selectedCommunityBook || !selectedReader) return null;
    if (typeof document === 'undefined') return null;

    const alreadySaved = isAlreadyInMyLibrary(selectedCommunityBook);
    const isAdding = addingBookId === selectedCommunityBook.id;

    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-detail-book-title"
        onClick={() => setSelectedCommunityBook(null)}
      >
        <div
          className="relative w-full max-w-4xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden sm:my-8 max-h-[92dvh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera superior idéntica a BookDetailModal */}
          <div className="flex items-center justify-between gap-2 border-b border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 sm:py-4 bg-[#f0e5cc] dark:bg-[#101520] shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold min-w-0">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">Ficha Bibliográfica · Estantería de {selectedReader.displayName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {alreadySaved ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold">
                  <Check className="w-3.5 h-3.5" /> En tu biblioteca
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isAdding}
                  onClick={() => handleAddBook(selectedCommunityBook)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-3.5 py-1.5 text-xs shadow-sm transition"
                >
                  {isAdding ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {isAdding ? 'Guardando...' : 'Añadir a mi lista'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedCommunityBook(null)}
                aria-label="Cerrar ficha"
                className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cuerpo idéntico a BookDetailModal */}
          <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 overflow-y-auto">
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="w-36 sm:w-48 md:w-full max-w-[260px]">
                <BookCover
                  nombre={selectedCommunityBook.nombre}
                  autor={selectedCommunityBook.autor}
                  portadaUrl={selectedCommunityBook.portadaUrl}
                  portadaFallbackUrl={selectedCommunityBook.portadaFallbackUrl}
                  portadaDataUrl={selectedCommunityBook.portadaDataUrl}
                  size="lg"
                />
              </div>

              <div className="mt-4 sm:mt-5 w-full rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4] dark:bg-[#101520] p-3 sm:p-3.5 text-center">
                <p className="text-xs font-medium text-stone-600 dark:text-slate-400 mb-2">
                  Valoración de {selectedReader.displayName}
                </p>
                <div className="text-sm sm:text-base text-amber-700 dark:text-amber-400 font-bold">
                  {selectedCommunityBook.puntuacion
                    ? `${formatStars(selectedCommunityBook.puntuacion)} (${selectedCommunityBook.puntuacion}/5)`
                    : 'Sin valorar'}
                </div>
              </div>
            </div>

            <div className="md:col-span-8 flex flex-col gap-4 sm:gap-5">
              <div className="text-center md:text-left">
                {selectedCommunityBook.sagaNombre && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-600/30 dark:border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-900 dark:text-amber-300 mb-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      Saga: {selectedCommunityBook.sagaNombre}
                      {selectedCommunityBook.volumen ? ' · Volumen ' + String(selectedCommunityBook.volumen) : ''}
                    </span>
                  </div>
                )}

                <h2
                  id="community-detail-book-title"
                  className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-stone-900 dark:text-white leading-tight"
                >
                  {selectedCommunityBook.nombre}
                </h2>
                <p className="text-sm sm:text-base text-stone-600 dark:text-slate-300 mt-1 font-medium">
                  {selectedCommunityBook.autor || 'Autor no especificado'}
                </p>
              </div>

              <div>
                <span className="block text-xs uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-2">
                  Estado en la estantería de {selectedReader.displayName}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {READING_STATUSES.map((status) => (
                    <div
                      key={status}
                      className={
                        'py-2.5 sm:py-2 px-3 rounded-lg text-xs font-medium border text-center transition ' +
                        (selectedCommunityBook.progreso === status
                          ? 'bg-amber-500/25 border-amber-600 dark:border-amber-400 text-amber-900 dark:text-amber-200 font-semibold shadow-sm'
                          : 'border-amber-900/15 dark:border-[#263147] bg-[#f4ead4]/60 dark:bg-[#1A2232]/60 text-stone-400 dark:text-slate-500 opacity-60')
                      }
                    >
                      {status}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {selectedCommunityBook.genero ? (
                  <span className="rounded-lg bg-amber-500/15 border border-amber-600/30 dark:border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-300">
                    {selectedCommunityBook.genero}
                  </span>
                ) : (
                  <span className="text-xs text-stone-500 dark:text-slate-500 italic">Sin género asignado</span>
                )}
                {selectedCommunityBook.subgeneros?.map((sub) => (
                  <span
                    key={sub}
                    className="rounded-lg bg-[#f0e5cc] dark:bg-[#1E2738] border border-amber-900/20 dark:border-[#2E3B52] px-2.5 py-1 text-xs text-stone-700 dark:text-slate-300"
                  >
                    {sub}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4] dark:bg-[#101520] p-3.5 sm:p-4 text-xs">
                <div>
                  <span className="text-stone-600 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Año Publicación
                  </span>
                  <p className="font-semibold text-sm mt-0.5">
                    {selectedCommunityBook.fechaPublicacion ?? 'No disponible'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-600 dark:text-slate-400 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Páginas
                  </span>
                  <p className="font-semibold text-sm mt-0.5">
                    {selectedCommunityBook.paginas ?? 'No disponible'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-600 dark:text-slate-400 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> ISBN
                  </span>
                  <p className="font-semibold text-sm mt-0.5 break-all">
                    {selectedCommunityBook.isbn || 'No disponible'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-600 dark:text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Editorial
                  </span>
                  <p className="font-semibold text-sm mt-0.5">
                    {selectedCommunityBook.editorial || 'No disponible'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-600 dark:text-slate-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Idioma / Edición
                  </span>
                  <p className="font-semibold text-sm mt-0.5">
                    {[selectedCommunityBook.idioma, selectedCommunityBook.edicion].filter(Boolean).join(' · ') || 'No disponible'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-600 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Tiempo de Lectura
                  </span>
                  <p className="font-semibold text-sm mt-0.5">
                    {selectedCommunityBook.tiempoLectura || 'Sin calcular'}
                  </p>
                </div>
              </div>

              {selectedCommunityBook.sinopsis && (
                <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4] dark:bg-[#101520] p-3.5 sm:p-4">
                  <h3 className="text-xs uppercase tracking-wider text-stone-600 dark:text-slate-400 font-semibold mb-1.5">
                    Sinopsis
                  </h3>
                  <p className="text-sm text-stone-800 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedCommunityBook.sinopsis}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  /* ─────────────────── VISTA 2: ESTANTERÍA PÚBLICA DE UN LECTOR ─────────────────── */
  if (selectedReader) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Toast amigable */}
        {renderToastNotification()}

        {/* Botón volver */}
        <button
          type="button"
          onClick={handleBackToReaders}
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

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {selectedReader.isPublic ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Estantería Pública
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-500/15 border border-stone-400/30 text-stone-700 dark:text-slate-300 text-xs font-semibold px-3 py-1">
                  <Lock className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400" />
                  Biblioteca Privada
                </span>
              )}

              {/* Botón para dejar de ser amigos desde la vista del perfil */}
              {friendshipMap[selectedReader.id]?.status === 'accepted' && (
                <button
                  type="button"
                  disabled={Boolean(actionLoadingId)}
                  onClick={() =>
                    setFriendToRemove({
                      id: selectedReader.id,
                      name: selectedReader.displayName || `@${selectedReader.username}`,
                      friendshipId: friendshipMap[selectedReader.id].friendshipId
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold px-3 py-1 transition disabled:opacity-50"
                  title="Dejar de ser amigos"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Dejar de ser amigos</span>
                </button>
              )}
            </div>
          </div>

          {/* Filtros de estantería y selector de vista (solo si la biblioteca es pública) */}
          {selectedReader.isPublic && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-900/15 dark:border-[#222B3C]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShelfFilterChange('all')}
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
                  onClick={() => handleShelfFilterChange('reading')}
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
                  onClick={() => handleShelfFilterChange('read')}
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
                  onClick={() => handleShelfFilterChange('unread')}
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
                  onClick={() => handleViewModeChange('shelf')}
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
                  onClick={() => handleViewModeChange('grid')}
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
          )}
        </div>

        {/* Libros de la estantería del lector o aviso de biblioteca privada */}
        {!selectedReader.isPublic ? (
          <div className="rounded-2xl border border-amber-900/15 dark:border-[#242E42] bg-[#fbf6ea]/70 dark:bg-[#111622] p-8 sm:p-12 text-center space-y-4 shadow-sm my-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-slate-100">
                Esta biblioteca es privada
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 leading-relaxed">
                <strong>{selectedReader.displayName || `@${selectedReader.username}`}</strong> ha configurado su biblioteca en modo privado, por lo que su colección de libros y lecturas no son visibles para otros usuarios.
              </p>
            </div>
            {friendshipMap[selectedReader.id]?.status === 'accepted' && (
              <div className="pt-2 max-w-md mx-auto">
                <p className="text-xs text-amber-900 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-xl px-4 py-2.5 leading-relaxed font-medium">
                  🤝 Sois amigos: aunque no puedas explorar su estantería, puedes seguir recomendándole libros desde la ficha de cualquier obra.
                </p>
              </div>
            )}
          </div>
        ) : isLoadingLibrary ? (
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

        {/* Modal de detalle de libro del lector amigo con createPortal */}
        {renderCommunityBookModal()}
      </div>
    );
  }

  /* ─────────────────── VISTA 1: COMUNIDAD (MIS AMIGOS & EXPLORAR) ─────────────────── */
  return (
    <div className="space-y-6">
      {/* Selector de subpestañas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/15 dark:border-[#242E42] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubTabChange('friends')}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ' +
              (communitySubTab === 'friends'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <Users className="w-4 h-4" />
            <span>Mis Amigos</span>
            {friends.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-950 text-amber-200 dark:bg-amber-400 dark:text-slate-950">
                {friends.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange('explore')}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ' +
              (communitySubTab === 'explore'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <Search className="w-4 h-4" />
            <span>Explorar Lectores</span>
          </button>
        </div>
      </div>

      {communitySubTab === 'friends' ? (
        /* Subvista: Mis Amigos */
        <div className="space-y-4">
          <div className="border-b border-amber-900/15 dark:border-[#20293C] pb-2">
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-slate-100 flex items-center gap-2">
              <span>Tu Círculo Cercano de Lectores</span>
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
              Accede a las estanterías de tus amigos y comparte recomendaciones personalizadas.
            </p>
          </div>

          {!currentUserId ? (
            <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-10 text-center space-y-2">
              <Users className="w-8 h-8 mx-auto text-amber-600/60" />
              <p className="font-serif font-bold text-base text-stone-800 dark:text-slate-200">
                Inicia sesión para conectar con amigos
              </p>
              <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto">
                Con una cuenta puedes agregar amigos de confianza y enviarles recomendaciones con dedicatoria.
              </p>
            </div>
          ) : isLoadingFriends ? (
            <div className="py-16 flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <span>Cargando tus amigos lectores...</span>
            </div>
          ) : friends.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-10 text-center space-y-3 bg-[#fbf6ea]/40 dark:bg-transparent">
              <Users className="w-8 h-8 mx-auto text-amber-600/70" />
              <h4 className="font-serif font-bold text-base text-stone-800 dark:text-slate-200">
                Aún no tienes amigos en tu círculo
              </h4>
              <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Busca a otros lectores por su @usuario para enviarles una solicitud de amistad.
              </p>
              <button
                type="button"
                onClick={() => handleSubTabChange('explore')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition"
              >
                <Search className="w-3.5 h-3.5" /> Explorar lectores
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((f) => {
                const profile = f.friendProfile;
                if (!profile) return null;

                return (
                  <div
                    key={f.id}
                    onClick={() => handleSelectReader(profile)}
                    className="group cursor-pointer rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/90 dark:bg-[#141A26] p-5 hover:border-amber-500/60 hover:bg-[#fffcf5] dark:hover:bg-[#182030] transition shadow-sm hover:shadow-md flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-xl flex items-center justify-center shadow-sm shrink-0">
                        {profile.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-serif text-base font-bold truncate text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                            {profile.displayName}
                          </h3>
                          {!profile.isPublic && (
                            <span title="Biblioteca privada" className="inline-flex items-center gap-1 text-[10px] text-stone-600 dark:text-slate-400 bg-stone-500/10 dark:bg-stone-500/20 px-1.5 py-0.5 rounded border border-stone-400/20 font-sans font-medium">
                              <Lock className="w-2.5 h-2.5" /> Privada
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400 block">
                          @{profile.username}
                        </span>
                        {profile.bio && (
                          <p className="text-xs text-stone-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            "{profile.bio}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-900/10 dark:border-[#20293C] flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-400">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg font-bold">
                          <Check className="w-3 h-3" /> Amigo
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFriendToRemove({
                              id: profile.id,
                              name: profile.displayName || `@${profile.username}`,
                              friendshipId: f.id
                            });
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-stone-300 dark:border-[#283246] hover:border-rose-500/40 hover:bg-rose-500/10 px-2 py-0.5 rounded-lg transition"
                          title="Dejar de ser amigos"
                          aria-label={`Dejar de ser amigo de ${profile.displayName}`}
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Quitar</span>
                        </button>
                      </div>
                      <span className="group-hover:translate-x-0.5 transition-transform text-right">
                        {profile.isPublic ? 'Ver estantería →' : 'Biblioteca privada →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Subvista: Explorar Lectores */
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                <Search className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Explorar Lectores
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                Busca a otros lectores por su nombre o su identificador único (@handle) para consultar sus estanterías o conectaros como amigos.
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

          {/* Lista de lectores encontrados */}
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
              {readers.map((reader) => {
                const isSelf = currentUserId === reader.id;
                const fInfo = friendshipMap[reader.id];
                const isFriend = fInfo?.status === 'accepted';
                const isPendingSent = fInfo?.status === 'pending' && fInfo.isRequester;
                const isPendingReceived = fInfo?.status === 'pending' && !fInfo.isRequester;
                const isBusy = actionLoadingId === reader.id || actionLoadingId === fInfo?.friendshipId;

                return (
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-serif text-base font-bold truncate text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                            {reader.displayName}
                          </h3>
                          {!reader.isPublic && (
                            <span title="Biblioteca privada" className="inline-flex items-center gap-1 text-[10px] text-stone-600 dark:text-slate-400 bg-stone-500/10 dark:bg-stone-500/20 px-1.5 py-0.5 rounded border border-stone-400/20 font-sans font-medium">
                              <Lock className="w-2.5 h-2.5" /> Privada
                            </span>
                          )}
                        </div>
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

                    <div className="pt-2 border-t border-amber-900/10 dark:border-[#20293C] flex items-center justify-between text-xs font-semibold gap-2">
                      {isSelf ? (
                        <span className="text-[11px] text-stone-500">Tú</span>
                      ) : isFriend ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                            <Check className="w-3 h-3" /> Amigo
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFriendToRemove({
                                id: reader.id,
                                name: reader.displayName || `@${reader.username}`,
                                friendshipId: fInfo.friendshipId
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-stone-300 dark:border-[#283246] hover:border-rose-500/40 hover:bg-rose-500/10 px-2 py-0.5 rounded-lg transition"
                            title="Dejar de ser amigos"
                            aria-label={`Dejar de ser amigo de ${reader.displayName}`}
                          >
                            <UserMinus className="w-3 h-3" />
                            <span>Quitar</span>
                          </button>
                        </div>
                      ) : isPendingSent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3 h-3" /> Solicitud enviada
                        </span>
                      ) : isPendingReceived ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptFriendRequest(fInfo.friendshipId, reader.displayName);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 px-2.5 py-1 rounded-lg shadow-sm transition disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                          <span>Aceptar amistad</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendFriendRequest(reader.id, reader.displayName);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 dark:text-amber-200 border border-amber-600/35 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                          <span>Añadir amigo</span>
                        </button>
                      )}

                      <span className="text-amber-800 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform text-right">
                        {reader.isPublic ? 'Estantería →' : 'Ver perfil →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmación para eliminar amigo */}
      {friendToRemove &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-friend-dialog-title"
            onClick={() => !actionLoadingId && setFriendToRemove(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="remove-friend-dialog-title" className="font-serif text-lg font-bold text-stone-900 dark:text-slate-100">
                    ¿Dejar de ser amigos?
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400">
                    {friendToRemove.name}
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed">
                ¿Seguro que deseas eliminar a <strong>{friendToRemove.name}</strong> de tu lista de amigos? Dejaréis de estar conectados y ya no podréis recomendaros libros mutuamente.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={Boolean(actionLoadingId)}
                  onClick={() => setFriendToRemove(null)}
                  className="rounded-xl border border-stone-300 dark:border-slate-700 px-4 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={Boolean(actionLoadingId)}
                  onClick={handleConfirmRemoveFriend}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold px-4 py-2 text-xs transition shadow-sm"
                >
                  {actionLoadingId === friendToRemove.friendshipId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Eliminando...
                    </>
                  ) : (
                    'Eliminar amigo'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Toast amigable */}
      {renderToastNotification()}
    </div>
  );
};
