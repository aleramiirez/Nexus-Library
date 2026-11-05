import React, { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue, useTransition } from 'react';
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
  Lock,
  Flame,
  Award,
  Star,
  Quote,
  Compass,
  Bookmark,
  Share2,
  ExternalLink,
  HeartHandshake,
  CheckCircle2
} from 'lucide-react';
import { Book, UserProfile, Friendship, FriendshipStatus, ProfileVisibility, ReadingHistoryEntry } from '../types/models';
import { communityService, FriendsActivitySummary, FriendActivityItem } from '../services/communityService';
import { friendshipService, calculateBookAffinity, BookAffinityResult } from '../services/friendshipService';
import { supabase } from '../services/supabaseClient';
import { BookCover } from './BookCover';
import { BookShelf } from './BookShelf';
import { UserAvatar } from './UserAvatar';
import { calculateGuardianProgress, ReaderLevelInfo } from '../services/levelingService';
import { calculateAtlasStats, COUNTRIES_CATALOG, isBookRead, AtlasStats } from '../services/literaryGeographyService';
import { LiteraryAtlasMap, CountryMapNode, ContinentId } from './LiteraryAtlasMap';
import { LiteraryPassportModal } from './LiteraryPassportModal';
import { StarRatingDisplay } from './StarRatingInteractive';
import { BookDetailModal } from './BookDetailModal';
import { SagaVitrine } from './SagaVitrine';
import type { SagaWithBooksItem } from './SagasScreen';
import '../book-detail.css';
import '../dashboard-panels.css';
import '../saga-vitrine.css';
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

  // Pestañas principales del directorio: Actividad, Mis Amigos, Explorar, Solicitudes
  const [directoryTab, setDirectoryTab] = useState<'activity' | 'friends' | 'explore' | 'requests'>(() => {
    if (typeof window === 'undefined') return 'activity';
    try {
      const urlTab = new URLSearchParams(window.location.search).get('subtab') as any;
      if (['activity', 'friends', 'explore', 'requests'].includes(urlTab)) return urlTab;
      const stored = localStorage.getItem('nexus_community_directory_tab');
      if (stored && ['activity', 'friends', 'explore', 'requests'].includes(stored)) return stored as any;
    } catch {
      // ignorar
    }
    return 'activity';
  });

  // Datos de amigos y solicitudes
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ received: Friendship[]; sent: Friendship[] }>({
    received: [],
    sent: []
  });
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendshipMap, setFriendshipMap] = useState<
    Record<string, { status: FriendshipStatus; friendshipId: string; isRequester: boolean }>
  >({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<{ id: string; name: string; friendshipId: string } | null>(null);

  // Feed de actividad y anillo de lectura de amigos
  const [friendsActivity, setFriendsActivity] = useState<FriendsActivitySummary>({
    readingNow: [],
    recentReadsAndReviews: [],
    friendsReadingCounts: {},
    friendsRanks: {}
  });
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Lector seleccionado para ver su perfil público multivista
  const [selectedReader, setSelectedReader] = useState<UserProfile | null>(null);
  const selectedReaderRef = useRef<UserProfile | null>(null);
  useEffect(() => {
    selectedReaderRef.current = selectedReader;
  }, [selectedReader]);

  const [readerBooks, setReaderBooks] = useState<Book[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // 5 Pestañas del Perfil del Lector Seleccionado
  const [profileTab, setProfileTab] = useState<'shelf' | 'sagas' | 'atlas' | 'reviews' | 'affinity'>('shelf');
  const [shelfFilter, setShelfFilter] = useState<'all' | 'reading' | 'paused' | 'read' | 'unread'>('all');
  const [shelfSearchQuery, setShelfSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'shelf'>('shelf');

  // Estado para el modal de pasaporte literario
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);

  // Estado para el modal de ficha pública del libro
  const [selectedCommunityBook, setSelectedCommunityBook] = useState<Book | null>(null);

  // Estados para el Atlas Literario interactivo en el perfil del amigo
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [activeContinent, setActiveContinent] = useState<ContinentId>('all');

  // Estado para filtrado de saga en pestaña de Sagas
  const [selectedSagaName, setSelectedSagaName] = useState<string | null>(null);
  const [communityBookReaderName, setCommunityBookReaderName] = useState<string | null>(null);
  const [openVitrineIds, setOpenVitrineIds] = useState<Set<string>>(() => new Set());

  const handleToggleVitrine = useCallback((sagaId: string) => {
    setOpenVitrineIds((prev) => {
      const next = new Set(prev);
      if (next.has(sagaId)) next.delete(sagaId);
      else next.add(sagaId);
      return next;
    });
  }, []);

  const handleOpenBookModal = useCallback((book: Book, readerName?: string) => {
    setCommunityBookReaderName(readerName || selectedReader?.displayName || null);
    setSelectedCommunityBook(book);
  }, [selectedReader?.displayName]);

  // Rango e información de nivel del lector seleccionado
  const selectedReaderLevelInfo = useMemo<ReaderLevelInfo | null>(() => {
    if (!selectedReader) return null;
    return calculateGuardianProgress(readerBooks);
  }, [selectedReader, readerBooks]);

  // Estadísticas del Atlas del lector seleccionado
  const selectedReaderAtlasStats = useMemo<AtlasStats | null>(() => {
    if (!selectedReader) return null;
    return calculateAtlasStats(readerBooks);
  }, [selectedReader, readerBooks]);

  // Afinidad literaria entre mis libros y los libros del lector seleccionado
  const bookAffinity = useMemo<BookAffinityResult>(() => {
    return calculateBookAffinity(existingBooks, readerBooks);
  }, [existingBooks, readerBooks]);

  // Amigos aceptados con perfil cargado
  const acceptedFriends = useMemo(() => {
    return friends.filter((f) => f.status === 'accepted' && f.friendProfile);
  }, [friends]);

  const isSelectedReaderSelf = Boolean(
    currentUserId && selectedReader && currentUserId === selectedReader.id
  );
  const selectedReaderVisibility: ProfileVisibility =
    selectedReader?.visibility || (selectedReader?.isPublic ? 'public' : 'private');
  const isSelectedReaderFriend = Boolean(
    selectedReader && friendshipMap[selectedReader.id]?.status === 'accepted'
  );
  const canViewSelectedReaderShelf =
    isSelectedReaderSelf ||
    selectedReaderVisibility === 'public' ||
    (selectedReaderVisibility === 'friends' && isSelectedReaderFriend);

  // Carga de amigos, solicitudes y actividad
  const loadFriendsAndActivity = async () => {
    if (!currentUserId) return;
    setIsLoadingFriends(true);
    try {
      const [friendsList, fMap, requests, activity] = await Promise.all([
        friendshipService.getFriends(currentUserId),
        friendshipService.getFriendshipMap(currentUserId),
        friendshipService.getPendingRequests(currentUserId),
        communityService.fetchFriendsActivity(currentUserId)
      ]);
      setFriends(friendsList);
      setFriendshipMap(fMap);
      setPendingRequests(requests);
      setFriendsActivity(activity);
    } catch (err) {
      console.warn('Error al cargar amigos o actividad:', err);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  useEffect(() => {
    loadFriendsAndActivity();

    const onFriendshipUpdated = () => {
      loadFriendsAndActivity();
      const curReader = selectedReaderRef.current;
      if (curReader && currentUserId) {
        communityService
          .fetchUserPublicLibrary(curReader.id, currentUserId)
          .then((data) => {
            if (data) {
              setSelectedReader(data.profile);
              setReaderBooks(data.books);
            }
          })
          .catch(() => null);
      }
    };
    window.addEventListener('nexus:friendship-updated', onFriendshipUpdated);

    let channel: any = null;
    if (currentUserId) {
      channel = supabase
        .channel(`community-sync-${currentUserId}`)
        .on('broadcast', { event: 'inbox_notification' }, (event) => {
          if (event.payload?.recipientId === currentUserId || event.payload?.senderId === currentUserId) {
            onFriendshipUpdated();
          }
        })
        .on('broadcast', { event: 'friendship_sync' }, (event) => {
          const payload = event.payload;
          if (
            payload?.userId1 === currentUserId ||
            payload?.userId2 === currentUserId ||
            payload?.requesterId === currentUserId ||
            payload?.addresseeId === currentUserId
          ) {
            onFriendshipUpdated();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
          onFriendshipUpdated();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('nexus:friendship-updated', onFriendshipUpdated);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUserId]);

  // Puente de mocks para testing de entorno local
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__injectCommunityMocks = (mFriends: any, mActivity: any) => {
        if (mFriends) setFriends(mFriends);
        if (mActivity) setFriendsActivity(mActivity);
      };
      (window as any).__injectSelectedReader = (reader: any, books: any) => {
        setSelectedReader(reader);
        setReaderBooks(books || []);
      };
      if ((window as any).__MOCK_FRIENDS__) {
        setFriends((window as any).__MOCK_FRIENDS__);
      }
      if ((window as any).__MOCK_ACTIVITY__) {
        setFriendsActivity((window as any).__MOCK_ACTIVITY__);
      }
      if ((window as any).__MOCK_SELECTED_READER__) {
        setSelectedReader((window as any).__MOCK_SELECTED_READER__.profile);
        setReaderBooks((window as any).__MOCK_SELECTED_READER__.books || []);
      }
    }
  }, []);

  // Persistir subtab en URL y localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nexus_community_directory_tab', directoryTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get('subtab') !== directoryTab) {
        url.searchParams.set('subtab', directoryTab);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // ignorar
    }
  }, [directoryTab]);

  // Debounce para búsqueda de lectores
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(deferredSearchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [deferredSearchQuery]);

  // Búsqueda de lectores en directorio
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

  // Seleccionar lector para abrir su perfil
  const handleSelectReader = async (reader: UserProfile) => {
    startTransition(() => {
      setSelectedReader(reader);
      setProfileTab('shelf');
      setShelfFilter('all');
      setShelfSearchQuery('');
      setSelectedCountryCode(null);
      setSelectedSagaName(null);
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    setIsLoadingLibrary(true);

    try {
      const data = await communityService.fetchUserPublicLibrary(reader.id, currentUserId);
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

  // Añadir libro a mi biblioteca
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

  // Llaves de mis libros para comprobar existencia rápida
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

  const getMyBookMatch = (book: Book): Book | undefined => {
    if (book.isbn) {
      const byIsbn = existingBooks.find((b) => b.isbn && b.isbn.trim() === book.isbn.trim());
      if (byIsbn) return byIsbn;
    }
    const clean = (s: string) => s.toLowerCase().trim();
    return existingBooks.find((b) => clean(b.nombre) === clean(book.nombre) && clean(b.autor) === clean(book.autor));
  };

  const handleAddBook = async (book: Book, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const key = `${book.nombre.toLowerCase().trim()}:::${book.autor.toLowerCase().trim()}`;
    setAddingBookId(book.id);

    try {
      await onAddBookToMyLibrary(book);
      setAddedBookKeys((prev) => new Set(prev).add(key));
      setToast({
        type: 'success',
        title: '¡Libro guardado!',
        message: `«${book.nombre}» ya está en tus lecturas pendientes de tu biblioteca personal.`
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

  // Acciones de Amistad
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
        window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));
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
        await loadFriendsAndActivity();
        window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));
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

  const handleCancelFriendRequest = async (friendshipId: string, targetName: string) => {
    setActionLoadingId(friendshipId);
    try {
      const res = await friendshipService.cancelFriendRequest(friendshipId);
      setToast({
        type: res.success ? 'info' : 'error',
        title: res.success ? 'Solicitud cancelada' : 'Error',
        message: res.message
      });
      if (res.success) {
        await loadFriendsAndActivity();
        window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));
      }
    } catch {
      setToast({
        type: 'error',
        title: 'Error de red',
        message: 'No se pudo cancelar la solicitud.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineFriendRequest = async (friendshipId: string, targetName: string) => {
    setActionLoadingId(friendshipId);
    try {
      const res = await friendshipService.respondFriendRequest(friendshipId, 'decline');
      setToast({
        type: res.success ? 'info' : 'error',
        title: res.success ? 'Solicitud rechazada' : 'Error',
        message: res.success ? `Has rechazado la solicitud de ${targetName}.` : res.message
      });
      if (res.success) {
        await loadFriendsAndActivity();
        window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));
      }
    } catch {
      setToast({
        type: 'error',
        title: 'Error de red',
        message: 'No se pudo rechazar la solicitud.'
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
        await loadFriendsAndActivity();
        window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));
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

  // Libros filtrados en la estantería del lector seleccionado
  const filteredReaderBooks = useMemo(() => {
    let result = readerBooks;

    // Filtro de estado
    if (shelfFilter === 'reading') {
      result = result.filter((b) => (b.progreso || '').toLowerCase().includes('leyendo') || b.progreso === '⏳ Leyendo');
    } else if (shelfFilter === 'paused') {
      result = result.filter((b) => (b.progreso || '').toLowerCase().includes('pausado') || b.progreso === '⏸️ Pausado');
    } else if (shelfFilter === 'read') {
      result = result.filter(isBookRead);
    } else if (shelfFilter === 'unread') {
      result = result.filter((b) => !isBookRead(b) && !(b.progreso || '').toLowerCase().includes('leyendo') && !(b.progreso || '').toLowerCase().includes('pausado'));
    }

    // Búsqueda por texto
    if (shelfSearchQuery.trim()) {
      const q = shelfSearchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.nombre.toLowerCase().includes(q) ||
          b.autor.toLowerCase().includes(q) ||
          (b.sagaNombre && b.sagaNombre.toLowerCase().includes(q))
      );
    }

    return result;
  }, [readerBooks, shelfFilter, shelfSearchQuery]);

  // Sagas del lector agrupadas
  const readerSagas = useMemo(() => {
    const map = new Map<string, Book[]>();
    for (const b of readerBooks) {
      if (b.sagaNombre && b.sagaNombre.trim().length > 0) {
        const sName = b.sagaNombre.trim();
        if (!map.has(sName)) map.set(sName, []);
        map.get(sName)!.push(b);
      }
    }

    return Array.from(map.entries()).map(([sagaName, books]) => {
      const sortedBooks = [...books].sort((a, b) => (a.volumen ?? 999) - (b.volumen ?? 999));
      const readCount = sortedBooks.filter(isBookRead).length;
      const totalCount = sortedBooks.length;
      const progressPercent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
      const ratings = sortedBooks.map((b) => Number(b.puntuacion)).filter((r) => r > 0);
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      const mainAuthor = sortedBooks[0]?.autor || 'Varios autores';

      return {
        sagaName,
        mainAuthor,
        books: sortedBooks,
        readCount,
        totalCount,
        progressPercent,
        avgRating
      };
    });
  }, [readerBooks]);

  const readerVitrineSagas = useMemo<SagaWithBooksItem[]>(() => {
    return readerSagas.map((s, idx) => ({
      saga: {
        id: `reader-saga-${s.sagaName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`,
        nombre: s.sagaName,
        descripcion: s.mainAuthor ? `Por ${s.mainAuthor}` : '',
        createdAt: '',
        updatedAt: ''
      },
      books: s.books,
      readCount: s.readCount,
      pendingCount: s.totalCount - s.readCount,
      registeredCount: s.totalCount,
      progressPercent: s.progressPercent
    }));
  }, [readerSagas]);

  useEffect(() => {
    setOpenVitrineIds(new Set());
  }, [selectedReader?.id]);

  // Países del lector para el Atlas interactivo
  const readerMapCountries = useMemo<CountryMapNode[]>(() => {
    const booksByCode: Record<string, Book[]> = {};
    for (const b of readerBooks) {
      if (b.pais) {
        const country = COUNTRIES_CATALOG[b.pais] || Object.values(COUNTRIES_CATALOG).find((c) => c.name.toLowerCase() === b.pais?.toLowerCase());
        if (country) {
          if (!booksByCode[country.code]) booksByCode[country.code] = [];
          booksByCode[country.code].push(b);
        }
      }
    }

    return Object.values(COUNTRIES_CATALOG).map((info) => {
      const bList = booksByCode[info.code] || [];
      const readBooks = bList.filter(isBookRead);
      const readingBooks = bList.filter(
        (b) => !isBookRead(b) && ((b.progreso || '').toLowerCase().includes('leyendo') || b.progreso === '⏳ Leyendo')
      );
      const unreadBooks = bList.filter(
        (b) => !isBookRead(b) && !((b.progreso || '').toLowerCase().includes('leyendo') || b.progreso === '⏳ Leyendo')
      );

      return {
        code: info.code,
        name: info.name,
        flag: info.flag,
        continent: info.continent,
        readCount: readBooks.length,
        readingCount: readingBooks.length,
        unreadCount: unreadBooks.length,
        totalCount: bList.length,
        canonCount: 0,
        waxColor: info.waxColor,
        waxDarkColor: info.waxDarkColor,
        sealEmblem: info.sealEmblem,
        sealLatinName: info.sealLatinName
      };
    });
  }, [readerBooks]);

  const activeCountryDetail = useMemo(() => {
    if (!selectedCountryCode) return null;
    const country = COUNTRIES_CATALOG[selectedCountryCode];
    if (!country) return null;
    const books = readerBooks.filter((b) => {
      if (!b.pais) return false;
      return b.pais.toUpperCase() === country.code || b.pais.toLowerCase() === country.name.toLowerCase();
    });
    return { country, books };
  }, [selectedCountryCode, readerBooks]);

  // Libros con reseñas, citas o notas
  const readerReviewsAndQuotes = useMemo(() => {
    return readerBooks.filter(
      (b) =>
        (b.resena && b.resena.trim().length > 0) ||
        (b.notasPersonales && b.notasPersonales.trim().length > 0) ||
        (b.citas && b.citas.length > 0) ||
        (b.puntuacion && Number(b.puntuacion) > 0)
    );
  }, [readerBooks]);

  // Render del Toast
  const renderToastNotification = () => {
    if (!toast) return null;
    return (
      <div className="fixed bottom-20 inset-x-4 sm:inset-x-auto sm:bottom-6 sm:right-6 z-50 flex items-start gap-3 rounded-2xl border border-amber-900/30 dark:border-amber-500/30 bg-[#161D2B]/95 text-stone-100 px-4 py-3 shadow-2xl backdrop-blur-md animate-slide-up max-w-md">
        {toast.type === 'success' ? (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-4 h-4" />
          </div>
        ) : toast.type === 'info' ? (
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
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

  // Modal de confirmación para eliminar amigo
  const renderRemoveFriendModal = () => {
    if (!friendToRemove || typeof document === 'undefined') return null;

    return createPortal(
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
            ¿Seguro que deseas eliminar a <strong>{friendToRemove.name}</strong> de tu círculo de amigos?
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
    );
  };

  const handleToastFromModal = (
    message: string,
    optionsOrType?: 'success' | 'error' | 'info' | { type?: 'success' | 'error' | 'info'; action?: { label: string; onClick: () => void }; duration?: number }
  ) => {
    const t = typeof optionsOrType === 'string' ? optionsOrType : optionsOrType?.type || 'info';
    setToast({
      type: t,
      title: t === 'success' ? '¡Éxito!' : t === 'error' ? 'Aviso' : 'Información',
      message
    });
  };

  // Modal enriquecido con animación 3D de apertura ceremonial (BookDetailModal)
  const renderPublicBookModal = () => {
    if (!selectedCommunityBook || typeof document === 'undefined') return null;

    return (
      <BookDetailModal
        book={selectedCommunityBook}
        onClose={() => {
          setSelectedCommunityBook(null);
          setCommunityBookReaderName(null);
        }}
        readOnly={true}
        readerName={communityBookReaderName || selectedReader?.displayName || 'Lector'}
        isAlreadyInLibrary={isAlreadyInMyLibrary(selectedCommunityBook)}
        onAddToLibrary={(b) => handleAddBook(b)}
        onShowToast={handleToastFromModal}
      />
    );
  };

  /* ─────────────────── VISTA 2: PERFIL SOCIAL DEL LECTOR SELECCIONADO ─────────────────── */
  if (selectedReader) {
    const isFriend = friendshipMap[selectedReader.id]?.status === 'accepted';
    const isPendingSent = friendshipMap[selectedReader.id]?.status === 'pending' && friendshipMap[selectedReader.id]?.isRequester;
    const isPendingReceived = friendshipMap[selectedReader.id]?.status === 'pending' && !friendshipMap[selectedReader.id]?.isRequester;

    const readBooksCount = readerBooks.filter(isBookRead).length;
    const totalPagesRead = readerBooks.filter(isBookRead).reduce((acc, b) => acc + (b.paginas || 0), 0);
    const sagasCount = readerSagas.length;
    const conqueredCountries = selectedReaderAtlasStats?.conqueredCount || 0;

    return (
      <div className="space-y-6 animate-fade-in">
        {renderToastNotification()}
        {renderRemoveFriendModal()}
        {renderPublicBookModal()}

        {/* Pasaporte modal */}
        {isPassportModalOpen && (
          <LiteraryPassportModal
            isOpen={isPassportModalOpen}
            onClose={() => setIsPassportModalOpen(false)}
            books={readerBooks}
            displayName={selectedReader.displayName}
            username={selectedReader.username}
            avatarUrl={selectedReader.avatarUrl}
            memberId={selectedReader.id}
            onOpenBookDetail={(book) => handleOpenBookModal(book)}
          />
        )}

        {/* Botón Volver */}
        <button
          type="button"
          onClick={handleBackToReaders}
          className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Círculo de la Comunidad
        </button>

        {/* ─── Cabecera Social Enriquecida Estilo Instagram (Bloque 3) ─── */}
        <div className="catalog-card-panel relative pt-8 sm:pt-9 p-6 sm:p-7 shadow-lg space-y-6">
          <div className="catalog-brass-tab" aria-hidden="true">
            Ficha Consular de Lector
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Avatar y Datos Personales */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              <div className="relative shrink-0">
                <UserAvatar
                  avatarUrl={selectedReader.avatarUrl}
                  displayName={selectedReader.displayName}
                  username={selectedReader.username}
                  size="xl"
                  frameRankId={selectedReader.orderFrame}
                  level={selectedReaderLevelInfo?.level}
                  rank={selectedReaderLevelInfo?.rank}
                />
              </div>

              <div className="min-w-0 space-y-1">
                {/* Insignia de la Orden del Nexus */}
                {selectedReaderLevelInfo && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border shadow-xs ${selectedReaderLevelInfo.rank.badgeStyle}`}>
                      <Award className="w-3 h-3" />
                      Nivel {selectedReaderLevelInfo.level} · {selectedReaderLevelInfo.rank.name}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500 dark:text-slate-400">
                      ({selectedReaderLevelInfo.totalXp.toLocaleString()} XP)
                    </span>
                  </div>
                )}

                <h1 className="font-serif text-2xl sm:text-3xl font-bold truncate text-stone-900 dark:text-slate-100">
                  {selectedReader.displayName}
                </h1>
                <p className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400">
                  @{selectedReader.username}
                </p>

                {selectedReader.bio && (
                  <p className="text-xs text-stone-600 dark:text-slate-300 max-w-lg leading-relaxed pt-1">
                    "{selectedReader.bio}"
                  </p>
                )}
              </div>
            </div>

            {/* Acciones de Cabecera: Pasaporte y Estado de Amistad */}
            <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto justify-start md:justify-end">
              {/* Botón Pasaporte Literario */}
              <button
                type="button"
                onClick={() => setIsPassportModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border border-amber-600/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 transition shadow-xs cursor-pointer active:scale-95"
              >
                <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Pasaporte Literario</span>
              </button>

              {/* Acciones de amistad */}
              {isSelectedReaderSelf ? (
                <span className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-slate-800 text-stone-600 dark:text-slate-400 text-xs font-semibold">
                  Tu Perfil
                </span>
              ) : isFriend ? (
                <div className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-2">
                    <UserCheck className="w-3.5 h-3.5" /> Amigo
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFriendToRemove({
                        id: selectedReader.id,
                        name: selectedReader.displayName || `@${selectedReader.username}`,
                        friendshipId: friendshipMap[selectedReader.id].friendshipId
                      })
                    }
                    className="p-2 rounded-xl border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 transition"
                    title="Dejar de ser amigos"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : isPendingSent ? (
                <button
                  type="button"
                  onClick={() =>
                    handleCancelFriendRequest(
                      friendshipMap[selectedReader.id].friendshipId,
                      selectedReader.displayName
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold px-3.5 py-2 transition hover:bg-amber-500/20"
                >
                  <Clock className="w-3.5 h-3.5" /> Solicitud enviada
                </button>
              ) : isPendingReceived ? (
                <button
                  type="button"
                  onClick={() =>
                    handleAcceptFriendRequest(
                      friendshipMap[selectedReader.id].friendshipId,
                      selectedReader.displayName
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 transition shadow-md"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Aceptar solicitud
                </button>
              ) : currentUserId ? (
                <button
                  type="button"
                  onClick={() => handleSendFriendRequest(selectedReader.id, selectedReader.displayName)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 transition shadow-md active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Conectar como amigo
                </button>
              ) : null}
            </div>
          </div>

          {/* Estadísticas de Lectura Estilo Instagram */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4 pt-3 border-t border-amber-900/15 dark:border-[#253044] text-center">
            <div className="p-2.5 rounded-xl bg-[#f5eddb]/60 dark:bg-[#121824]/60 border border-amber-900/10 dark:border-[#253044]">
              <span className="font-serif font-bold text-lg sm:text-xl text-stone-900 dark:text-slate-100 block">
                {readerBooks.length}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                Libros
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#f5eddb]/60 dark:bg-[#121824]/60 border border-amber-900/10 dark:border-[#253044]">
              <span className="font-serif font-bold text-lg sm:text-xl text-emerald-700 dark:text-emerald-400 block">
                {readBooksCount}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                Leídos
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#f5eddb]/60 dark:bg-[#121824]/60 border border-amber-900/10 dark:border-[#253044]">
              <span className="font-serif font-bold text-lg sm:text-xl text-amber-700 dark:text-amber-400 block">
                {totalPagesRead.toLocaleString()}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                Páginas
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#f5eddb]/60 dark:bg-[#121824]/60 border border-amber-900/10 dark:border-[#253044]">
              <span className="font-serif font-bold text-lg sm:text-xl text-stone-900 dark:text-slate-100 block">
                {sagasCount}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                Sagas
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#f5eddb]/60 dark:bg-[#121824]/60 border border-amber-900/10 dark:border-[#253044] col-span-2 sm:col-span-1">
              <span className="font-serif font-bold text-lg sm:text-xl text-sky-700 dark:text-sky-400 block">
                {conqueredCountries}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                Países
              </span>
            </div>
          </div>
        </div>

        {/* ─── Selector de 5 Pestañas del Perfil (Bloque 4) ─── */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2.5 border-b border-amber-900/15 dark:border-[#242E42] pb-3.5">
          <button
            type="button"
            onClick={() => setProfileTab('shelf')}
            className={
              'inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold transition shadow-xs sm:shadow-sm ' +
              (profileTab === 'shelf'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Estantería</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-950/20 dark:bg-slate-800">
              {readerBooks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('sagas')}
            className={
              'inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold transition shadow-xs sm:shadow-sm ' +
              (profileTab === 'sagas'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Sagas</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-950/20 dark:bg-slate-800">
              {sagasCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('atlas')}
            className={
              'inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold transition shadow-xs sm:shadow-sm ' +
              (profileTab === 'atlas'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>Atlas</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-950/20 dark:bg-slate-800">
              {conqueredCountries}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('reviews')}
            className={
              'inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold transition shadow-xs sm:shadow-sm ' +
              (profileTab === 'reviews'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Quote className="w-4 h-4 shrink-0" />
            <span>Reseñas</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-950/20 dark:bg-slate-800">
              {readerReviewsAndQuotes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('affinity')}
            className={
              'inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold transition shadow-xs sm:shadow-sm ' +
              (profileTab === 'affinity'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <HeartHandshake className="w-4 h-4 shrink-0" />
            <span>En Común</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-950/20 dark:bg-slate-800">
              {bookAffinity.percentage}%
            </span>
          </button>
        </div>

        {/* ─── Contenido de las 5 Pestañas ─── */}
        {!canViewSelectedReaderShelf ? (
          <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] p-12 text-center space-y-3">
            <Lock className="w-8 h-8 mx-auto text-amber-600" />
            <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-slate-200">
              Biblioteca privada
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto">
              Este lector ha configurado su catálogo para ser privado o accesible solo para amigos aceptados.
            </p>
          </div>
        ) : isLoadingLibrary ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            <span className="font-serif text-sm">Cargando biblioteca del lector...</span>
          </div>
        ) : (
          <div>
            {/* 1. PESTAÑA: 📚 ESTANTERÍA */}
            {profileTab === 'shelf' && (
              <div className="space-y-5">
                {/* Barra de Búsqueda, Filtros y Conmutador de Vista */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={shelfSearchQuery}
                        onChange={(e) => setShelfSearchQuery(e.target.value)}
                        placeholder="Buscar por título, autor o saga..."
                        className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] pl-9 pr-8 py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none transition shadow-sm"
                      />
                      {shelfSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setShelfSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Chips de estado */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                      {(
                        [
                          { id: 'all', label: 'Todos' },
                          { id: 'reading', label: '⏳ Leyendo' },
                          { id: 'paused', label: '⏸️ Pausados' },
                          { id: 'read', label: '✅ Leídos' },
                          { id: 'unread', label: '📚 Pendientes' }
                        ] as const
                      ).map((f) => {
                        const isActive = shelfFilter === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setShelfFilter(f.id)}
                            className={
                              'px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition ' +
                              (isActive
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                                : 'border border-amber-900/20 dark:border-slate-800 bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:text-stone-950')
                            }
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conmutador de vista: Balda de madera vs Cuadrícula */}
                  <div className="flex items-center gap-1 bg-[#ecd9b8]/60 dark:bg-[#161D2B] p-1 rounded-xl border border-amber-900/15 dark:border-[#283246] shrink-0 self-end lg:self-auto">
                    <button
                      type="button"
                      onClick={() => setViewMode('shelf')}
                      className={
                        'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition ' +
                        (viewMode === 'shelf'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                      }
                      title="Vista de estantería física de madera"
                    >
                      <Rows3 className="w-3.5 h-3.5" />
                      <span>Balda</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={
                        'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition ' +
                        (viewMode === 'grid'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                      }
                      title="Vista de cuadrícula de fichas"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Cuadrícula</span>
                    </button>
                  </div>
                </div>

                {filteredReaderBooks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-12 text-center space-y-2">
                    <p className="font-serif text-base text-stone-700 dark:text-slate-300">
                      No se encontraron libros en esta sección
                    </p>
                  </div>
                ) : viewMode === 'shelf' ? (
                  <div className="space-y-4">
                    <BookShelf
                      books={filteredReaderBooks}
                      onOpenDetail={(bookId) => {
                        const b = readerBooks.find((x) => x.id === bookId);
                        if (b) handleOpenBookModal(b);
                      }}
                      openedBookId={selectedCommunityBook?.id ?? null}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                    {filteredReaderBooks.map((book) => {
                      const isReading = (book.progreso || '').toLowerCase().includes('leyendo');
                      const isPaused = (book.progreso || '').toLowerCase().includes('pausado');
                      const totalP = book.paginas || 0;
                      const curP = book.paginaActual || 0;
                      const pct = totalP > 0 ? Math.min(100, Math.round((curP / totalP) * 100)) : 0;
                      const isOwned = isAlreadyInMyLibrary(book);

                      return (
                        <div
                          key={book.id}
                          data-book-id={book.id}
                          onClick={() => handleOpenBookModal(book)}
                          className="catalog-card-panel group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between p-3 space-y-2.5"
                        >
                          <div className="space-y-2">
                            <div className="relative aspect-[2/3] rounded-md overflow-hidden shadow-xs">
                              <BookCover
                                nombre={book.nombre}
                                autor={book.autor}
                                portadaUrl={book.portadaUrl}
                                portadaFallbackUrl={book.portadaFallbackUrl}
                                size="md"
                              />
                              <span
                                className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-xs border ${
                                  statusBadgeStyles[book.progreso] || 'bg-stone-500/80 text-white'
                                }`}
                              >
                                {book.progreso}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-serif font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                                {book.nombre}
                              </h4>
                              <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate">
                                {book.autor || '—'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1 border-t border-amber-900/10 dark:border-[#20293C]">
                            {/* Barra de progreso si está leyendo o pausado */}
                            {(isReading || isPaused) && totalP > 0 && curP > 0 && (
                              <div className="space-y-0.5">
                                <div className="flex justify-between text-[10px] font-mono text-stone-500 dark:text-slate-400">
                                  <span>Progreso</span>
                                  <span>{pct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Valoración con medios estrellas */}
                            {book.puntuacion && Number(book.puntuacion) > 0 && (
                              <div className="flex items-center justify-between">
                                <StarRatingDisplay value={book.puntuacion} size="xs" showNumeric={true} />
                              </div>
                            )}

                            {/* Botón rápido para añadir a pendientes */}
                            <button
                              type="button"
                              onClick={(e) => handleAddBook(book, e)}
                              disabled={isOwned || addingBookId === book.id}
                              className={
                                'w-full py-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ' +
                                (isOwned
                                  ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-amber-500/15 text-amber-900 dark:text-amber-300 hover:bg-amber-500 hover:text-slate-950')
                              }
                            >
                              {isOwned ? (
                                <>
                                  <Check className="w-3 h-3" /> En mi biblioteca
                                </>
                              ) : addingBookId === book.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" /> Añadir
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. PESTAÑA: 🏛️ SAGAS EN VITRINAS */}
            {profileTab === 'sagas' && (
              <div className="space-y-5">
                {readerVitrineSagas.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-12 text-center space-y-2">
                    <Layers className="w-8 h-8 mx-auto text-amber-600" />
                    <p className="font-serif text-base text-stone-700 dark:text-slate-300">
                      Este lector no tiene sagas catalogadas en su estantería
                    </p>
                  </div>
                ) : (
                  <div className="vit-grid">
                    {readerVitrineSagas.map((item) => (
                      <SagaVitrine
                        key={item.saga.id}
                        item={item}
                        isOpen={openVitrineIds.has(item.saga.id)}
                        onToggle={() => handleToggleVitrine(item.saga.id)}
                        detailBookId={selectedCommunityBook?.id ?? null}
                        onOpenBookDetail={(bookId) => {
                          const found = readerBooks.find((b) => b.id === bookId);
                          if (found) handleOpenBookModal(found);
                        }}
                        readOnly={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. PESTAÑA: 🌍 ATLAS LITERARIO */}
            {profileTab === 'atlas' && (
              <div className="space-y-6">
                {/* Panel de KPIs del Atlas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="catalog-card-panel p-4 text-center">
                    <span className="font-serif text-2xl font-bold text-amber-700 dark:text-amber-400 block">
                      {selectedReaderAtlasStats?.conqueredCount || 0}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      Países Conquistados
                    </span>
                  </div>

                  <div className="catalog-card-panel p-4 text-center">
                    <span className="font-serif text-2xl font-bold text-stone-800 dark:text-slate-200 block">
                      {selectedReaderAtlasStats?.exploringCount || 0}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      En Exploración
                    </span>
                  </div>

                  <div className="catalog-card-panel p-4 text-center">
                    <span className="font-serif text-2xl font-bold text-stone-800 dark:text-slate-200 block">
                      {selectedReaderAtlasStats?.dominatedRegionsCount || 0}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      Regiones Dominadas
                    </span>
                  </div>

                  <div className="catalog-card-panel p-4 text-center">
                    <span className="font-serif text-2xl font-bold text-amber-700 dark:text-amber-400 block">
                      {selectedReaderAtlasStats?.worldPercentage || 0}%
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      del Mundo
                    </span>
                  </div>
                </div>

                {/* Mapa Cartográfico Interactivo */}
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] overflow-hidden shadow-md">
                  <LiteraryAtlasMap
                    countries={readerMapCountries}
                    selectedCountryCode={selectedCountryCode}
                    activeContinent={activeContinent}
                    onSelectCountry={(code) => setSelectedCountryCode(code)}
                    onSelectContinent={setActiveContinent}
                  />
                </div>

                {/* Detalle del País Seleccionado */}
                {activeCountryDetail && (
                  <div className="catalog-card-panel p-5 sm:p-6 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-amber-900/15 dark:border-[#242E42] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{activeCountryDetail.country.flag}</span>
                        <div>
                          <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-slate-100">
                            {activeCountryDetail.country.name}
                          </h3>
                          <span className="text-xs text-stone-500 font-mono">
                            {activeCountryDetail.books.length} {activeCountryDetail.books.length === 1 ? 'obra leída o en biblioteca' : 'obras leídas o en biblioteca'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCountryCode(null)}
                        className="text-stone-400 hover:text-stone-700 dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {activeCountryDetail.books.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => handleOpenBookModal(b)}
                          className="p-3 rounded-xl border border-amber-900/15 dark:border-[#253044] bg-[#fbf6ea] dark:bg-[#141A26] flex items-center gap-3 cursor-pointer hover:border-amber-600 transition"
                        >
                          <div className="w-10 shrink-0">
                            <BookCover
                              nombre={b.nombre}
                              autor={b.autor}
                              portadaUrl={b.portadaUrl}
                              portadaFallbackUrl={b.portadaFallbackUrl}
                              size="sm"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-serif font-bold text-xs truncate">{b.nombre}</p>
                            <p className="text-[11px] text-stone-500 truncate">{b.autor}</p>
                            {b.puntuacion && <StarRatingDisplay value={b.puntuacion} size="xs" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. PESTAÑA: 💬 RESEÑAS Y CITAS */}
            {profileTab === 'reviews' && (
              <div className="space-y-5">
                {readerReviewsAndQuotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-12 text-center space-y-2">
                    <Quote className="w-8 h-8 mx-auto text-amber-600" />
                    <p className="font-serif text-base text-stone-700 dark:text-slate-300">
                      Este lector aún no ha publicado reseñas ni notas personales
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {readerReviewsAndQuotes.map((b) => {
                      const reviewText = b.resena || b.notasPersonales;
                      return (
                        <div
                          key={b.id}
                          onClick={() => handleOpenBookModal(b)}
                          className="catalog-card-panel p-5 space-y-3.5 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-14 shrink-0 shadow-xs rounded overflow-hidden">
                                <BookCover
                                  nombre={b.nombre}
                                  autor={b.autor}
                                  portadaUrl={b.portadaUrl}
                                  portadaFallbackUrl={b.portadaFallbackUrl}
                                  size="sm"
                                />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <h4 className="font-serif font-bold text-base text-stone-900 dark:text-slate-100 truncate">
                                  {b.nombre}
                                </h4>
                                <p className="text-xs text-stone-500 dark:text-slate-400 truncate">
                                  {b.autor}
                                </p>
                                {b.puntuacion && (
                                  <div className="pt-0.5">
                                    <StarRatingDisplay value={b.puntuacion} size="sm" showNumeric={true} />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Reseña escrita */}
                            {reviewText && (
                              <p className="font-serif italic text-xs sm:text-sm text-stone-800 dark:text-slate-200 leading-relaxed pl-3 border-l-2 border-amber-600/40 line-clamp-4">
                                «{reviewText.trim()}»
                              </p>
                            )}

                            {/* Citas destacadas */}
                            {b.citas && b.citas.length > 0 && (
                              <div className="space-y-1 pt-1">
                                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                                  Cita memorable:
                                </span>
                                <div className="p-2.5 rounded-lg bg-stone-100/70 dark:bg-[#121824] text-[11px] font-serif italic text-stone-700 dark:text-slate-300 line-clamp-3">
                                  «{b.citas[0]}»
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-amber-900/10 dark:border-[#20293C] flex items-center justify-between text-xs">
                            <span className="text-[11px] text-stone-500">{b.progreso}</span>
                            <span className="text-amber-700 dark:text-amber-400 font-semibold group-hover:underline">
                              Ver ficha completa →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 5. PESTAÑA: 🤝 EN COMÚN (AFINIDAD LITERARIA) */}
            {profileTab === 'affinity' && (
              <div className="space-y-6">
                {/* Hero Card de Afinidad */}
                <div className="catalog-card-panel p-6 sm:p-7 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center sm:text-left">
                    <span className="text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400 font-serif">
                      Conexión de Almas Lectoras
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-slate-100">
                      {bookAffinity.percentage}% de Afinidad Literaria
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-300 max-w-md leading-relaxed">
                      Calculado comparando vuestras bibliotecas personales, autores predilectos y calificaciones de obras compartidas.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-20 h-20 rounded-full border-4 border-amber-500/40 bg-amber-500/15 flex items-center justify-center font-serif text-2xl font-bold text-amber-900 dark:text-amber-300 shadow-inner">
                      {bookAffinity.percentage}%
                    </div>
                  </div>
                </div>

                {/* Libros en común: Comparativa cara a cara */}
                <div className="space-y-3">
                  <h4 className="font-serif text-lg font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    <span>Libros que ambos tenéis en común ({bookAffinity.commonBooks.length})</span>
                  </h4>

                  {bookAffinity.commonBooks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-8 text-center text-xs text-stone-500 dark:text-slate-400">
                      Aún no compartís libros idénticos en vuestros catálogos. ¡Explora sus joyas abajo para descubrir tu próxima lectura!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bookAffinity.commonBooks.map((cb, idx) => (
                        <div
                          key={idx}
                          className="catalog-card-panel p-4 flex items-center gap-4 hover:shadow-md transition"
                        >
                          <div className="w-14 shrink-0 shadow-xs rounded overflow-hidden">
                            <BookCover
                              nombre={cb.title}
                              autor={cb.author}
                              portadaUrl={cb.readerBook.portadaUrl || cb.myBook.portadaUrl}
                              portadaFallbackUrl={cb.readerBook.portadaFallbackUrl}
                              size="sm"
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <h5 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 truncate">
                              {cb.title}
                            </h5>
                            <p className="text-xs text-stone-500 dark:text-slate-400 truncate">
                              {cb.author}
                            </p>

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-900/10 dark:border-[#20293C] text-[11px]">
                              <div>
                                <span className="text-stone-400 block text-[10px]">Tu nota:</span>
                                {cb.myRating ? (
                                  <StarRatingDisplay value={cb.myRating} size="xs" showNumeric={true} />
                                ) : (
                                  <span className="text-stone-400 italic">Sin valorar</span>
                                )}
                              </div>
                              <div>
                                <span className="text-stone-400 block text-[10px]">Su nota:</span>
                                {cb.readerRating ? (
                                  <StarRatingDisplay value={cb.readerRating} size="xs" showNumeric={true} />
                                ) : (
                                  <span className="text-stone-400 italic">Sin valorar</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Autores en común */}
                {bookAffinity.commonAuthors.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-serif text-lg font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Autores predilectos en común ({bookAffinity.commonAuthors.length})</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {bookAffinity.commonAuthors.map((author) => (
                        <span
                          key={author}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-xs font-semibold text-stone-800 dark:text-slate-200"
                        >
                          🪶 {author}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Joyas de su estantería para ti */}
                {bookAffinity.gemsForYou.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-amber-900/15 dark:border-[#242E42]">
                    <div className="space-y-0.5">
                      <h4 className="font-serif text-lg font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-600" />
                        <span>Joyas de su estantería recomendadas para ti</span>
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-slate-400">
                        Obras que este lector valoró con 4 o 5 estrellas y que aún no tienes en tu biblioteca.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bookAffinity.gemsForYou.slice(0, 6).map((gem) => (
                        <div
                          key={gem.id}
                          onClick={() => handleOpenBookModal(gem)}
                          className="catalog-card-panel p-4 space-y-3 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-14 shrink-0 shadow-xs rounded overflow-hidden">
                              <BookCover
                                nombre={gem.nombre}
                                autor={gem.autor}
                                portadaUrl={gem.portadaUrl}
                                portadaFallbackUrl={gem.portadaFallbackUrl}
                                size="sm"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <h5 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 line-clamp-2">
                                {gem.nombre}
                              </h5>
                              <p className="text-xs text-stone-500 dark:text-slate-400 truncate">
                                {gem.autor}
                              </p>
                              {gem.puntuacion && (
                                <StarRatingDisplay value={gem.puntuacion} size="xs" showNumeric={true} />
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleAddBook(gem, e)}
                            disabled={addingBookId === gem.id}
                            className="w-full py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-900 dark:text-amber-300 hover:text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5"
                          >
                            {addingBookId === gem.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Añadir a mis pendientes
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ─────────────────── VISTA 1: COMUNIDAD (STORIES + FEED + DIRECTORIO) ─────────────────── */
  return (
    <div className="space-y-6">
      {renderToastNotification()}
      {renderRemoveFriendModal()}
      {renderPublicBookModal()}

      {/* ─── 1. Barra Superior «Círculo de Amigos» (Instagram Stories Bar) (Bloque 2) ─── */}
      {acceptedFriends.length > 0 && (
        <section aria-label="Círculo de Amigos en lectura" className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <span className="font-serif italic text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Círculo de Lectores
            </span>
            <span className="text-[11px] text-stone-500">
              {acceptedFriends.length} {acceptedFriends.length === 1 ? 'amigo conectado' : 'amigos conectados'}
            </span>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2 pt-1 px-1 -mx-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {acceptedFriends.map((f) => {
              const friend = f.friendProfile;
              if (!friend) return null;
              const readingCount = friendsActivity.friendsReadingCounts[friend.id] || 0;
              const isReadingNow = readingCount > 0;
              const friendRankId = friendsActivity.friendsRanks?.[friend.id]?.orderFrame || friend.orderFrame || 'I';
              const friendLevel = friendsActivity.friendsRanks?.[friend.id]?.level ?? friend.level;

              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => handleSelectReader(friend)}
                  className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none group active:scale-95 transition"
                  title={`${friend.displayName} (@${friend.username})${isReadingNow ? ` · Leyendo ${readingCount} libros` : ''}`}
                >
                  <div
                    className={
                      'relative p-1 rounded-full transition-transform group-hover:scale-105 ' +
                      (isReadingNow
                        ? 'bg-gradient-to-tr from-amber-500 via-amber-300 to-yellow-600 shadow-md ring-2 ring-amber-500/40'
                        : 'border border-stone-300/80 dark:border-stone-700/80 hover:border-amber-500/50')
                    }
                  >
                    <UserAvatar
                      avatarUrl={friend.avatarUrl}
                      displayName={friend.displayName}
                      username={friend.username}
                      frameRankId={friendRankId}
                      level={friendLevel}
                      shape="circle"
                      size="md"
                    />
                    {isReadingNow && (
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] shadow-sm flex items-center gap-0.5 border border-amber-300">
                        📖 {readingCount}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-stone-700 dark:text-slate-300 truncate w-16 text-center group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                    {friend.displayName ? friend.displayName.split(' ')[0] : `@${friend.username}`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── 2. Pestañas de Directorio y Feed Social (Bloque 2) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/15 dark:border-[#242E42] pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pestaña 🔥 Actividad */}
          <button
            type="button"
            onClick={() => setDirectoryTab('activity')}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm ' +
              (directoryTab === 'activity'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Actividad</span>
          </button>

          {/* Pestaña 👥 Mis Amigos */}
          <button
            type="button"
            onClick={() => setDirectoryTab('friends')}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm ' +
              (directoryTab === 'friends'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
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

          {/* Pestaña 🔍 Explorar Lectores */}
          <button
            type="button"
            onClick={() => setDirectoryTab('explore')}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm ' +
              (directoryTab === 'explore'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Search className="w-4 h-4" />
            <span>Explorar Lectores</span>
          </button>

          {/* Pestaña 📬 Solicitudes */}
          {currentUserId && (
            <button
              type="button"
              onClick={() => setDirectoryTab('requests')}
              className={
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm ' +
                (directoryTab === 'requests'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
              }
            >
              <UserPlus className="w-4 h-4" />
              <span>Solicitudes</span>
              {pendingRequests.received.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  {pendingRequests.received.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─── PESTAÑA: 🔥 ACTIVIDAD (FEED SOCIAL LITERARIO) ─── */}
      {directoryTab === 'activity' && (
        <div className="space-y-6">
          {friendsActivity.readingNow.length === 0 && friendsActivity.recentReadsAndReviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] p-10 text-center space-y-3 bg-[#fbf6ea]/40 dark:bg-transparent">
              <Flame className="w-9 h-9 mx-auto text-amber-600/70" />
              <h4 className="font-serif font-bold text-lg text-stone-900 dark:text-slate-100">
                Tu Círculo está en calma literaria
              </h4>
              <p className="text-xs text-stone-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Aquí verás las lecturas en curso de tus amigos en tiempo real, sus páginas avanzadas y sus últimas reseñas terminadas.
              </p>
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDirectoryTab('explore')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition"
                >
                  <Search className="w-3.5 h-3.5" /> Explorar nuevos lectores
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 1. Lecturas en curso del Círculo ('⏳ Leyendo') */}
              {friendsActivity.readingNow.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-slate-100 flex items-center gap-2">
                      Lecturas en curso del Círculo
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friendsActivity.readingNow.map((item, idx) => {
                      const { friend, book } = item;
                      const isOwned = isAlreadyInMyLibrary(book);
                      const totalP = book.paginas || 0;
                      const curP = book.paginaActual || 0;
                      const pct = totalP > 0 ? Math.min(100, Math.round((curP / totalP) * 100)) : 0;

                      return (
                        <div
                          key={`reading-${friend.id}-${book.id}-${idx}`}
                          onClick={() => handleOpenBookModal(book, friend.displayName || friend.username)}
                          className="catalog-card-panel p-4 space-y-3 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
                        >
                          {/* Cabecera del amigo */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectReader(friend);
                            }}
                            className="flex items-center gap-2.5 group/friend cursor-pointer"
                          >
                            <UserAvatar
                              avatarUrl={friend.avatarUrl}
                              displayName={friend.displayName}
                              username={friend.username}
                              frameRankId={friendsActivity.friendsRanks?.[friend.id]?.orderFrame || friend.orderFrame}
                              level={friendsActivity.friendsRanks?.[friend.id]?.level ?? friend.level}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-serif font-bold text-xs text-stone-900 dark:text-slate-100 group-hover/friend:text-amber-700 dark:group-hover/friend:text-amber-400 block truncate">
                                {friend.displayName}
                              </span>
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block">
                                está leyendo ahora:
                              </span>
                            </div>
                          </div>

                          {/* Portada y Libro */}
                          <div className="flex items-start gap-3">
                            <div className="w-14 shrink-0 shadow-xs rounded overflow-hidden">
                              <BookCover
                                nombre={book.nombre}
                                autor={book.autor}
                                portadaUrl={book.portadaUrl}
                                portadaFallbackUrl={book.portadaFallbackUrl}
                                size="sm"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 line-clamp-2">
                                {book.nombre}
                              </h4>
                              <p className="text-xs text-stone-500 dark:text-slate-400 truncate">
                                {book.autor}
                              </p>
                              {book.sagaNombre && (
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                                  {book.sagaNombre}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Barra de progreso */}
                          {totalP > 0 && curP > 0 && (
                            <div className="space-y-1 pt-1 border-t border-amber-900/10 dark:border-[#20293C]">
                              <div className="flex justify-between text-[10px] font-mono text-stone-500 dark:text-slate-400">
                                <span>Progreso</span>
                                <span>pág. {curP} / {totalP} ({pct}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Botón rápido */}
                          <button
                            type="button"
                            onClick={(e) => handleAddBook(book, e)}
                            disabled={isOwned || addingBookId === book.id}
                            className={
                              'w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ' +
                              (isOwned
                                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-900 dark:text-amber-300 hover:bg-amber-500 hover:text-slate-950')
                            }
                          >
                            {isOwned ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> En tu biblioteca
                              </>
                            ) : addingBookId === book.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Añadir a pendientes
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Últimos libros leídos y reseñas de amigos ('✅ Leído') */}
              {friendsActivity.recentReadsAndReviews.length > 0 && (
                <div className="space-y-3.5">
                  <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-slate-100 flex items-center gap-2">
                    <Quote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Últimas lecturas completadas y reseñas</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friendsActivity.recentReadsAndReviews.map((item, idx) => {
                      const { friend, book } = item;
                      const isOwned = isAlreadyInMyLibrary(book);
                      const reviewText = book.resena || book.notasPersonales;

                      return (
                        <div
                          key={`read-${friend.id}-${book.id}-${idx}`}
                          onClick={() => handleOpenBookModal(book, friend.displayName || friend.username)}
                          className="catalog-card-panel p-5 space-y-3 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            {/* Amigo header */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectReader(friend);
                              }}
                              className="flex items-center gap-2.5 group/friend cursor-pointer"
                            >
                              <UserAvatar
                                avatarUrl={friend.avatarUrl}
                                displayName={friend.displayName}
                                username={friend.username}
                                frameRankId={friendsActivity.friendsRanks?.[friend.id]?.orderFrame || friend.orderFrame}
                                level={friendsActivity.friendsRanks?.[friend.id]?.level ?? friend.level}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="font-serif font-bold text-xs text-stone-900 dark:text-slate-100 group-hover/friend:text-amber-700 dark:group-hover/friend:text-amber-400 block truncate">
                                  {friend.displayName}
                                </span>
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">
                                  completó esta obra:
                                </span>
                              </div>
                            </div>

                            {/* Portada, título y valoración */}
                            <div className="flex items-start gap-3">
                              <div className="w-14 shrink-0 shadow-xs rounded overflow-hidden">
                                <BookCover
                                  nombre={book.nombre}
                                  autor={book.autor}
                                  portadaUrl={book.portadaUrl}
                                  portadaFallbackUrl={book.portadaFallbackUrl}
                                  size="sm"
                                />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 line-clamp-2">
                                  {book.nombre}
                                </h4>
                                <p className="text-xs text-stone-500 dark:text-slate-400 truncate">
                                  {book.autor}
                                </p>
                                {book.puntuacion && (
                                  <div className="pt-0.5">
                                    <StarRatingDisplay value={book.puntuacion} size="sm" showNumeric={true} />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Reseña si existe */}
                            {reviewText && reviewText.trim().length > 0 && (
                              <p className="font-serif italic text-xs sm:text-sm text-stone-800 dark:text-slate-200 leading-relaxed pl-3 border-l-2 border-amber-600/40 line-clamp-3">
                                «{reviewText.trim()}»
                              </p>
                            )}

                            {/* Cita si existe */}
                            {book.citas && book.citas.length > 0 && (
                              <div className="p-2 rounded bg-stone-100/70 dark:bg-[#121824] text-[11px] font-serif italic text-stone-700 dark:text-slate-300 line-clamp-2">
                                «{book.citas[0]}»
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-amber-900/10 dark:border-[#20293C] flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-stone-500">
                              {book.pais ? `🌍 ${book.pais}` : 'Ficha completa'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleAddBook(book, e)}
                              disabled={isOwned || addingBookId === book.id}
                              className={
                                'py-1 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 ' +
                                (isOwned
                                  ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-amber-500/15 text-amber-900 dark:text-amber-300 hover:bg-amber-500 hover:text-slate-950')
                              }
                            >
                              {isOwned ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> En mi biblioteca
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" /> Añadir
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── PESTAÑA: 👥 MIS AMIGOS ─── */}
      {directoryTab === 'friends' && (
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
                onClick={() => setDirectoryTab('explore')}
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
                    className="community-reader-card group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <UserAvatar
                          avatarUrl={profile.avatarUrl}
                          displayName={profile.displayName}
                          username={profile.username}
                          frameRankId={profile.orderFrame}
                          level={profile.level}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif text-base font-bold truncate text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                            {profile.displayName}
                          </h3>
                          <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400 block truncate">
                            @{profile.username}
                          </span>
                          {profile.bio && (
                            <p className="text-xs text-stone-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              "{profile.bio}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-sans">
                          <Users className="w-2.5 h-2.5" /> Amigo
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-900/10 dark:border-[#20293C] flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-400">
                      <span>Ver estantería y perfil →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── PESTAÑA: 🔍 EXPLORAR LECTORES ─── */}
      {directoryTab === 'explore' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                <Search className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Explorar Lectores
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                Busca a otros lectores por su nombre o su nombre de usuario para consultar sus estanterías o conectaros como amigos.
              </p>
            </div>

            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o @usuario (ej: @lector o María)..."
                className="discover-search-input w-full rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm placeholder-stone-400 dark:placeholder-slate-400 focus:outline-none transition shadow-sm"
              />
              {isLoadingReaders ? (
                <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {isLoadingReaders && readers.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-slate-400">
              <Loader2 className="w-7 h-7 text-amber-600 dark:text-amber-400 animate-spin" />
              <span className="font-serif text-xs">Buscando lectores en el archivo...</span>
            </div>
          ) : readers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-12 text-center space-y-2 text-stone-500 dark:text-slate-400">
              <Users className="w-8 h-8 mx-auto text-amber-600/60 dark:text-amber-400/60" />
              <p className="font-serif text-base font-bold text-stone-800 dark:text-slate-200">
                {searchQuery ? `No encontramos lectores con "${searchQuery}"` : 'Aún no hay otros lectores registrados'}
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

                return (
                  <div
                    key={reader.id}
                    onClick={() => handleSelectReader(reader)}
                    className="community-reader-card group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <UserAvatar
                          avatarUrl={reader.avatarUrl}
                          displayName={reader.displayName}
                          username={reader.username}
                          frameRankId={reader.orderFrame}
                          level={reader.level}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif text-base font-bold truncate text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                            {reader.displayName}
                          </h3>
                          <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400 block truncate">
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

                      <div className="shrink-0 pt-0.5">
                        {reader.visibility === 'public' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-sans">
                            <Globe className="w-2.5 h-2.5" /> Público
                          </span>
                        ) : reader.visibility === 'friends' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 dark:text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full font-sans">
                            <Users className="w-2.5 h-2.5" /> Solo amigos
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-700 dark:text-slate-300 bg-stone-500/15 border border-stone-400/30 px-2 py-0.5 rounded-full font-sans">
                            <Lock className="w-2.5 h-2.5" /> Privado
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-900/10 dark:border-[#20293C] flex items-center justify-between text-xs font-semibold gap-2">
                      {isSelf ? (
                        <span className="text-[11px] text-stone-500">Tú</span>
                      ) : isFriend ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                          <UserIcon className="w-3.5 h-3.5" /> Amigo
                        </span>
                      ) : isPendingSent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3 h-3" /> Solicitud enviada
                        </span>
                      ) : isPendingReceived ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-lg">
                          <UserCheck className="w-3 h-3" /> Te ha enviado solicitud
                        </span>
                      ) : currentUserId ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendFriendRequest(reader.id, reader.displayName);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 px-2.5 py-1 rounded-lg transition"
                        >
                          <UserPlus className="w-3 h-3" /> Conectar
                        </button>
                      ) : null}

                      <span className="text-amber-700 dark:text-amber-400 group-hover:underline text-right text-[11px]">
                        Ver estantería →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── PESTAÑA: 📬 SOLICITUDES ─── */}
      {directoryTab === 'requests' && currentUserId && (
        <div className="space-y-6">
          {/* Solicitudes Recibidas */}
          <div className="space-y-3">
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>Solicitudes Recibidas ({pendingRequests.received.length})</span>
            </h3>

            {pendingRequests.received.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-900/20 dark:border-[#283246] p-8 text-center text-xs text-stone-500 dark:text-slate-400">
                No tienes solicitudes de amistad pendientes por responder.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.received.map((req) => {
                  const p = req.friendProfile;
                  if (!p) return null;

                  return (
                    <div key={req.id} className="catalog-card-panel p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatarUrl={p.avatarUrl}
                          displayName={p.displayName}
                          username={p.username}
                          frameRankId={p.orderFrame}
                          level={p.level}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-serif font-bold text-sm truncate">{p.displayName}</h4>
                          <span className="text-xs font-mono text-amber-700 dark:text-amber-400 truncate block">
                            @{p.username}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAcceptFriendRequest(req.id, p.displayName)}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs"
                        >
                          Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineFriendRequest(req.id, p.displayName)}
                          className="py-1.5 px-3 rounded-xl border border-stone-300 dark:border-slate-700 hover:bg-stone-200/50 dark:hover:bg-slate-800 text-xs font-semibold transition"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Solicitudes Enviadas */}
          {pendingRequests.sent.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-amber-900/15 dark:border-[#242E42]">
              <h3 className="font-serif font-bold text-sm text-stone-700 dark:text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <span>Solicitudes Enviadas ({pendingRequests.sent.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingRequests.sent.map((req) => {
                  const p = req.friendProfile;
                  if (!p) return null;

                  return (
                    <div key={req.id} className="p-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-[#fbf6ea] dark:bg-[#141A26] flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          avatarUrl={p.avatarUrl}
                          displayName={p.displayName}
                          username={p.username}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="font-serif font-bold truncate">{p.displayName}</p>
                          <p className="text-[10px] font-mono text-stone-500 truncate">@{p.username}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelFriendRequest(req.id, p.displayName)}
                        className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline shrink-0 font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
