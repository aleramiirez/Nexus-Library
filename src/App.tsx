import React, { useEffect, useMemo, useState, useDeferredValue, useRef, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LayoutDashboard,
  Library,
  Layers,
  BarChart3,
  Trophy,
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
  Settings,
  Mail,
  FileUp,
  X,
  Sparkles,
  Users,
  Loader2
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { triggerBackgroundFallbackNotification, syncPushSubscriptionWithDatabase } from './services/pushNotificationService';
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
  loadSampleLibrary,
  removeSampleLibrary,
  convertSampleBooksToPermanent,
  hasSampleBooks
} from './services/sampleLibraryService';
import {
  fetchSupabaseAuthSettings,
  supabase
} from './services/supabaseClient';
import {
  BibliographicCandidate,
  Book,
  BookRecommendation,
  BookRecommendationPayload,
  LibraryFilters,
  LibraryViewMode,
  Saga,
  SortField,
  StarRating,
  UserProfile
} from './types/models';
import { profileService } from './services/profileService';
import { recommendationInboxService } from './services/recommendationInboxService';
import {
  formatStars,
  GENRES,
  Genre,
  READING_STATUSES,
  ReadingStatus,
  STAR_OPTIONS,
  SUBGENRES,
  Subgenre,
  getRecommendedSubgenres,
  normalizeText
} from './constants/catalogs';
import { BookCard } from './components/BookCard';
import { BookCover } from './components/BookCover';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { AnimatedBackground } from './components/AnimatedBackground';
import { BookSidebar, NavigationSection } from './components/BookSidebar';
import { BookShelf } from './components/BookShelf';
import { SagaProgressBar } from './components/SagaProgressBar';
import { SagaShelf } from './components/SagaShelf';
import { DashboardReadingPanel } from './components/DashboardReadingPanel';
import { DashboardSagasPanel } from './components/DashboardSagasPanel';
import { DashboardFavoritesShelf } from './components/DashboardFavoritesShelf';
import { candidateToBookInput } from './services/bookMetadataService';
import { formatFriendlyErrorMessage } from './utils/errorUtils';
import { LibrarySelect } from './components/LibrarySelect';
import './dashboard-panels.css';

import { BookDetailModal } from './components/BookDetailModal';
import { PwaInstallModal } from './components/PwaInstallModal';
const AddEditBookModal = React.lazy(() =>
  import('./components/AddEditBookModal').then((m) => ({ default: m.AddEditBookModal }))
);
import { ParsedEbookFile } from './services/epubParserService';
const ImportModal = React.lazy(() =>
  import('./components/ImportModal').then((m) => ({ default: m.ImportModal }))
);
const EpubImportModal = React.lazy(() =>
  import('./components/EpubImportModal').then((m) => ({ default: m.EpubImportModal }))
);
const AuthSyncModal = React.lazy(() =>
  import('./components/AuthSyncModal').then((m) => ({ default: m.AuthSyncModal }))
);
const DiscoverBooksScreen = React.lazy(() =>
  import('./components/DiscoverBooksScreen').then((m) => ({ default: m.DiscoverBooksScreen }))
);
const SettingsScreen = React.lazy(() =>
  import('./components/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);
const ReadingChallengeScreen = React.lazy(() =>
  import('./components/ReadingChallengeScreen').then((m) => ({ default: m.ReadingChallengeScreen }))
);
import { ReadingChallengeDashboardWidget } from './components/ReadingChallengeDashboardWidget';
const BookInboxModal = React.lazy(() =>
  import('./components/BookInboxModal').then((m) => ({ default: m.BookInboxModal }))
);
const CollectionsScreen = React.lazy(() =>
  import('./components/CollectionsScreen').then((m) => ({ default: m.CollectionsScreen }))
);
import { collectionService } from './services/collectionService';
import { readingChallengeService } from './services/readingChallengeService';
import { FirstLoginProfileModal } from './components/FirstLoginProfileModal';
import { ProfileSetupBanner } from './components/ProfileSetupBanner';
import { SettingsTab } from './components/SettingsScreen';

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

const VALID_NAVIGATION_SECTIONS = new Set<NavigationSection>([
  'dashboard',
  'library',
  'discover',
  'shelf-unread',
  'shelf-reading',
  'shelf-paused',
  'shelf-read',
  'collections',
  'sagas',
  'stats',
  'settings'
]);

const getInitialActiveSection = (): NavigationSection => {
  if (typeof window === 'undefined') return 'dashboard';
  try {
    const urlParam = new URLSearchParams(window.location.search).get('section') as NavigationSection;
    if (urlParam && VALID_NAVIGATION_SECTIONS.has(urlParam)) {
      return urlParam;
    }
    const stored = localStorage.getItem('nexus_active_section') as NavigationSection;
    if (stored && VALID_NAVIGATION_SECTIONS.has(stored)) {
      return stored;
    }
  } catch {
    // ignorar
  }
  return 'dashboard';
};

export const App: React.FC = () => {
  const books = useLiveQuery(() => db.books.toArray(), [], [] as Book[]);
  const sagas = useLiveQuery(() => db.sagas.toArray(), [], [] as Saga[]);

  const [activeSection, setActiveSection] = useState<NavigationSection>(getInitialActiveSection);
  const [, startTransition] = React.useTransition();

  const handleNavigate = (section: NavigationSection) => {
    startTransition(() => {
      setActiveSection(section);
    });
    try {
      localStorage.setItem('nexus_active_section', section);
      const url = new URL(window.location.href);
      url.searchParams.set('section', section);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignorar
    }
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  // Sincroniza activeSection con localStorage y URL para persistir tras F5
  useEffect(() => {
    try {
      localStorage.setItem('nexus_active_section', activeSection);
      const url = new URL(window.location.href);
      if (url.searchParams.get('section') !== activeSection) {
        url.searchParams.set('section', activeSection);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // ignorar
    }
  }, [activeSection]);

  // Manejar navegación con botones de adelante/atrás del navegador
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParam = new URLSearchParams(window.location.search).get('section') as NavigationSection;
        if (urlParam && VALID_NAVIGATION_SECTIONS.has(urlParam)) {
          setActiveSection(urlParam);
        }
      } catch {
        // ignorar
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Restablece el scroll a la parte superior al cambiar de pantalla
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [activeSection]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('nexus_library_theme');
    // Predomina el tema claro por defecto; solo se activa si el usuario lo configuró explícitamente en la app
    return stored === 'dark';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<LibraryViewMode>('shelf');
  const [filters, setFilters] = useState<LibraryFilters>(initialFilters);
  const deferredSearch = useDeferredValue(filters.search);
  const [showFilters, setShowFilters] = useState(false);

  const subgenreSelectGroups = useMemo(() => {
    if (!filters.genero) return undefined;
    const recommended = getRecommendedSubgenres(filters.genero);
    const recNormSet = new Set(recommended.map((s) => normalizeText(s)));
    const otherSubgenres = SUBGENRES.filter(
      (s, idx, arr) =>
        !recNormSet.has(normalizeText(s)) &&
        arr.findIndex((x) => normalizeText(x) === normalizeText(s)) === idx
    );
    return [
      {
        groupLabel: 'Recomendados para este género',
        options: [
          { value: '' as Subgenre | '', label: 'Todos los subgéneros' },
          ...recommended.map((sub) => ({ value: sub, label: sub }))
        ]
      },
      ...(otherSubgenres.length > 0
        ? [
            {
              groupLabel: 'Otros subgéneros',
              options: otherSubgenres.map((sub) => ({ value: sub, label: sub }))
            }
          ]
        : [])
    ];
  }, [filters.genero]);

  const allSubgenresOptions = useMemo(() => {
    return [
      { value: '' as Subgenre | '', label: 'Todos los subgéneros' },
      ...SUBGENRES.filter(
        (s, idx, arr) => arr.findIndex((x) => normalizeText(x) === normalizeText(s)) === idx
      ).map((sub) => ({ value: sub, label: sub }))
    ];
  }, []);

  const [detailBookId, setDetailBookId] = useState<string | null>(null);
  const handleOpenBookDetail = React.useCallback(
    (id: string) => {
      startTransition(() => {
        setDetailBookId(id);
      });
    },
    []
  );
  const handleOpenCardDetail = React.useCallback(
    (b: Book) => {
      startTransition(() => {
        setDetailBookId(b.id);
      });
    },
    []
  );
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedInitialCandidate, setSelectedInitialCandidate] = useState<BibliographicCandidate | null>(null);
  const [selectedParsedEbook, setSelectedParsedEbook] = useState<ParsedEbookFile | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEpubImportOpen, setIsEpubImportOpen] = useState(false);
  const [initialEpubFiles, setInitialEpubFiles] = useState<File[] | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('type=recovery') || search.includes('type=recovery');
  });
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [sagaToDelete, setSagaToDelete] = useState<Saga | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const lastAuthUserIdRef = useRef<string | null | undefined>(undefined);
  const lastAuthUserIsAnonRef = useRef<boolean>(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [guestAlias, setGuestAlias] = useState<string>(() => profileService.getGuestAlias());
  const [guestAvatar, setGuestAvatar] = useState<string | null>(() => profileService.getGuestAvatar());
  const [collectionsCount, setCollectionsCount] = useState<number>(() =>
    collectionService.getCollections(currentUser?.id).length
  );

  useEffect(() => {
    const update = () => {
      setCollectionsCount(collectionService.getCollections(currentUser?.id).length);
    };
    update();
    const unsub = collectionService.subscribe(update);
    return unsub;
  }, [currentUser?.id]);
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

  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [inboxInitialTab, setInboxInitialTab] = useState<'recommendations' | 'friend_requests'>('recommendations');
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('appearance');
  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = useState(false);

  const handleNavigateToSettingsAccount = React.useCallback(() => {
    setSettingsInitialTab('account');
    setActiveSection('settings');
    setIsInboxOpen(false);
    setIsFirstLoginModalOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, []);

  const isProfileSetupPending = React.useMemo(() => {
    if (!currentUser || !currentUserProfile) return false;
    try {
      if (localStorage.getItem(`nexus_profile_setup_done_${currentUser.id}`) === 'true') {
        return false;
      }
      // Si el usuario ya tiene libros en su catálogo, un avatar elegido o un nombre de usuario
      // que no sea el autogenerado (_xxxx), su perfil está plenamente activo y configurado.
      if (books.length > 0 || Boolean(currentUserProfile.avatarUrl)) {
        return false;
      }
      const isAutoGenerated = /_[a-f0-9]{4}$/.test(currentUserProfile.username);
      return isAutoGenerated;
    } catch {
      return false;
    }
  }, [currentUser, currentUserProfile, books.length]);

  useEffect(() => {
    if (currentUser && currentUserProfile && isProfileSetupPending) {
      try {
        const dismissed = localStorage.getItem(`nexus_onboarding_modal_dismissed_${currentUser.id}`) === 'true';
        if (!dismissed) {
          const timer = setTimeout(() => {
            setIsFirstLoginModalOpen(true);
          }, 700);
          return () => clearTimeout(timer);
        }
      } catch {
        // Ignore storage error
      }
    }
  }, [currentUser, currentUserProfile, isProfileSetupPending]);

  // Estado para el Banner Flotante In-App de Notificaciones en vivo
  interface InAppBannerData {
    id: string;
    title: string;
    body: string;
    avatarUrl?: string;
    tab: 'recommendations' | 'friend_requests';
  }
  const [inAppBanner, setInAppBanner] = useState<InAppBannerData | null>(null);
  const inAppBannerTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showInAppBanner = React.useCallback(
    (banner: InAppBannerData) => {
      if (inAppBannerTimeoutRef.current) {
        clearTimeout(inAppBannerTimeoutRef.current);
        inAppBannerTimeoutRef.current = null;
      }
      setInAppBanner(banner);
      inAppBannerTimeoutRef.current = setTimeout(() => {
        setInAppBanner((curr) => (curr?.id === banner.id ? null : curr));
      }, 7500);
    },
    []
  );

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback(
    (
      message: string,
      optionsOrType: 'success' | 'error' | 'info' | { type?: 'success' | 'error' | 'info'; action?: { label: string; onClick: () => void }; duration?: number } = 'info'
    ) => {
      const opts = typeof optionsOrType === 'string' ? { type: optionsOrType } : optionsOrType;
      const type = opts.type ?? 'info';
      const action = opts.action;
      const duration = opts.duration ?? 4500;

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }

      setToast({ message, type, action });

      toastTimeoutRef.current = setTimeout(() => {
        setToast((curr) => (curr?.message === message ? null : curr));
      }, duration);
    },
    []
  );

  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isRemovingSample, setIsRemovingSample] = useState(false);

  const isSampleActive = useMemo(() => hasSampleBooks(books), [books]);

  const handleLoadSampleBooks = React.useCallback(async () => {
    setIsLoadingSample(true);
    try {
      const count = await loadSampleLibrary(currentUser?.id);
      showToast(
        `¡Biblioteca de muestra cargada! Se añadieron ${count} obras maestras con citas, portadas y sagas.`,
        'success'
      );
    } catch {
      showToast('No se pudieron cargar los libros de muestra', 'error');
    } finally {
      setIsLoadingSample(false);
    }
  }, [currentUser?.id, showToast]);

  const handleRemoveSampleBooks = React.useCallback(async () => {
    setIsRemovingSample(true);
    try {
      const count = await removeSampleLibrary(currentUser?.id);
      showToast(
        `Se eliminaron los ${count} libros de muestra. Tu biblioteca está lista para tus propios libros.`,
        'info'
      );
    } catch {
      showToast('Error al eliminar los libros de muestra', 'error');
    } finally {
      setIsRemovingSample(false);
    }
  }, [currentUser?.id, showToast]);

  const handleKeepSampleBooks = React.useCallback(async () => {
    try {
      const count = await convertSampleBooksToPermanent(currentUser?.id);
      showToast(
        `¡Las ${count} obras de muestra ahora forman parte permanente de tu colección personal!`,
        'success'
      );
    } catch {
      showToast('Error al conservar los libros', 'error');
    }
  }, [currentUser?.id, showToast]);

  const refreshInboxCount = React.useCallback(async () => {
    if (!currentUser?.id) {
      setInboxUnreadCount(0);
      return;
    }
    try {
      let count = await recommendationInboxService.getTotalInboxNotificationsCount(currentUser.id);
      // Solo sumamos el despacho de bienvenida si el usuario es nuevo y tiene el perfil pendiente
      const isAutoGenerated = currentUserProfile?.username
        ? /_[a-f0-9]{4}$/.test(currentUserProfile.username)
        : false;
      const isEstablishedUser = !isAutoGenerated || books.length > 0 || Boolean(currentUserProfile?.avatarUrl);
      const isWelcomeRead =
        isEstablishedUser ||
        localStorage.getItem(`nexus_welcome_read_${currentUser.id}`) === 'true' ||
        localStorage.getItem(`nexus_profile_setup_done_${currentUser.id}`) === 'true';

      if (!isWelcomeRead) {
        count += 1;
      }
      setInboxUnreadCount(count);
    } catch {
      // Ignore background unread check errors silently
    }
  }, [currentUser?.id, currentUserProfile?.username, currentUserProfile?.avatarUrl, books.length]);

  useEffect(() => {
    refreshInboxCount();
    if (!currentUser?.id) return;
    const interval = setInterval(refreshInboxCount, 45000);

    // Auto-sincronizar la suscripción Push existente del navegador con la tabla en Supabase
    syncPushSubscriptionWithDatabase(currentUser.id).catch(() => null);

    const onFocus = () => refreshInboxCount();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshInboxCount();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshInboxCount, currentUser?.id]);

  // Manejo de apertura de buzón desde URL query param (?openInbox=...) y mensajes del Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const openInboxParam = params.get('openInbox');
      if (openInboxParam === 'friend_requests' || openInboxParam === 'recommendations') {
        setInboxInitialTab(openInboxParam);
        setIsInboxOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('openInbox');
        window.history.replaceState(
          {},
          document.title,
          url.pathname + (url.search ? url.search : '') + url.hash
        );
      }
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'OPEN_INBOX') {
          const tab = data.tab === 'friend_requests' ? 'friend_requests' : 'recommendations';
          setInboxInitialTab(tab);
          setIsInboxOpen(true);
        } else if (data.type === 'PUSH_RECEIVED_FOREGROUND') {
          const payload = data.payload || {};
          const tab = payload.tab === 'friend_requests' ? 'friend_requests' : 'recommendations';
          showInAppBanner({
            id: `sw-${Date.now()}`,
            title: payload.title || 'Nueva notificación',
            body: payload.body || 'Tienes una novedad en tu buzón literario.',
            tab
          });
          refreshInboxCount();
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);

      const handleCustomOpenInbox = (e: Event) => {
        const customEvent = e as CustomEvent<{ tab?: 'recommendations' | 'friend_requests' }>;
        const tab = customEvent.detail?.tab === 'friend_requests' ? 'friend_requests' : 'recommendations';
        setInboxInitialTab(tab);
        setIsInboxOpen(true);
      };
      window.addEventListener('nexus:open-inbox', handleCustomOpenInbox);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        window.removeEventListener('nexus:open-inbox', handleCustomOpenInbox);
      };
    }
  }, [refreshInboxCount, showInAppBanner]);

  // Escucha Realtime de Supabase (Broadcast instantáneo + Postgres Changes)
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel('nexus-inbox-broadcast')
      // 1. Escucha Broadcast instantáneo entre clientes (bypassea la BD para 0ms de latencia)
      .on(
        'broadcast',
        { event: 'inbox_notification' },
        (event) => {
          const payload = event.payload as {
            recipientId?: string;
            type?: 'friend_request' | 'recommendation';
            title?: string;
            body?: string;
            tab?: 'friend_requests' | 'recommendations';
            avatarUrl?: string;
          } | undefined;

          if (payload?.recipientId === currentUser.id) {
            refreshInboxCount();
            window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));

            const title = payload.title || 'Nueva novedad en tu buzón';
            const body = payload.body || '';
            const tab = payload.tab || 'recommendations';

            showInAppBanner({
              id: `bc-${Date.now()}`,
              title,
              body,
              avatarUrl: payload.avatarUrl,
              tab
            });

            triggerBackgroundFallbackNotification({
              title,
              body,
              tag: `bc-${Date.now()}`,
              data: { tab }
            });
          }
        }
      )
      // 2. Escucha sincronización de amistades instantánea por WebSocket (aceptar, rechazar, cancelar, eliminar)
      .on(
        'broadcast',
        { event: 'friendship_sync' },
        (event) => {
          const payload = event.payload as {
            userId1?: string;
            userId2?: string;
            requesterId?: string;
            addresseeId?: string;
          } | undefined;

          if (
            payload?.userId1 === currentUser.id ||
            payload?.userId2 === currentUser.id ||
            payload?.requesterId === currentUser.id ||
            payload?.addresseeId === currentUser.id
          ) {
            refreshInboxCount();
            window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));
          }
        }
      )
      // 3. Escucha cambios en base de datos (Postgres Changes)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        async (payload) => {
          refreshInboxCount();
          window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));

          const newRecord = payload.new as { id?: string; requester_id?: string; addressee_id?: string; status?: string } | null;
          if (newRecord?.addressee_id === currentUser.id && newRecord?.status === 'pending') {
            refreshInboxCount();
            let senderName = 'Un usuario';
            let avatarUrl = '';
            try {
              if (newRecord.requester_id) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('username, display_name, avatar_url')
                  .eq('id', newRecord.requester_id)
                  .maybeSingle();
                if (profile) {
                  senderName = profile.display_name || profile.username || 'Un usuario';
                  avatarUrl = profile.avatar_url || '';
                }
              }
            } catch {
              // Silencioso
            }

            const title = '¡Nueva solicitud de amistad!';
            const body = `${senderName} quiere conectar contigo en Nexus Library.`;

            showInAppBanner({
              id: `req-${newRecord?.id || Date.now()}`,
              title,
              body,
              avatarUrl,
              tab: 'friend_requests'
            });

            triggerBackgroundFallbackNotification({
              title,
              body,
              tag: `req-${newRecord?.id}`,
              data: { tab: 'friend_requests' }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'book_recommendations'
        },
        async (payload) => {
          const newRecord = payload.new as {
            id?: string;
            receiver_id?: string;
            sender_id?: string;
            book_data?: { nombre?: string };
          } | null;

          if (newRecord?.receiver_id === currentUser.id) {
            refreshInboxCount();

            let senderName = 'Un amigo';
            let avatarUrl = '';
            try {
              if (newRecord?.sender_id) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('username, display_name, avatar_url')
                  .eq('id', newRecord.sender_id)
                  .maybeSingle();
                if (profile) {
                  senderName = profile.display_name || profile.username || 'Un amigo';
                  avatarUrl = profile.avatar_url || '';
                }
              }
            } catch {
              // Silencioso
            }

            const bookTitle = newRecord?.book_data?.nombre || 'un libro';
            const title = '¡Te han recomendado un libro!';
            const body = `${senderName} te ha recomendado "${bookTitle}".`;

            showInAppBanner({
              id: `rec-${newRecord?.id || Date.now()}`,
              title,
              body,
              avatarUrl,
              tab: 'recommendations'
            });

            triggerBackgroundFallbackNotification({
              title,
              body,
              tag: `rec-${newRecord?.id}`,
              data: { tab: 'recommendations' }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, refreshInboxCount, showInAppBanner]);

  const isAnyModalOpen = Boolean(
    mobileMenuOpen ||
    isAddEditOpen ||
    detailBookId ||
    isImportOpen ||
    isEpubImportOpen ||
    isAuthModalOpen ||
    isInstallModalOpen ||
    bookToDelete ||
    sagaToDelete ||
    sagaFormOpen ||
    isInboxOpen
  );

  // Bloquea el scroll del fondo mientras cualquier modal o menú móvil está abierto
  useEffect(() => {
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : '';
    document.documentElement.classList.toggle('modal-open', isAnyModalOpen);
    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('modal-open');
    };
  }, [isAnyModalOpen]);

  // Soporte de tecla Escape para cerrar modales y paneles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isInboxOpen) {
          setIsInboxOpen(false);
          refreshInboxCount();
        } else if (bookToDelete) {
          setBookToDelete(null);
        } else if (sagaToDelete) {
          setSagaToDelete(null);
        } else if (isAddEditOpen) {
          setIsAddEditOpen(false);
          setSelectedInitialCandidate(null);
          setSelectedParsedEbook(null);
        } else if (detailBookId) {
          // El cierre por Escape lo gestiona BookDetailModal para ejecutar la animación inversa (380ms)
          return;
        } else if (isEpubImportOpen) {
          setIsEpubImportOpen(false);
          setInitialEpubFiles(undefined);
        } else if (isImportOpen) {
          setIsImportOpen(false);
        } else if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        } else if (isInstallModalOpen) {
          setIsInstallModalOpen(false);
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
    isInboxOpen,
    bookToDelete,
    sagaToDelete,
    isAddEditOpen,
    detailBookId,
    isImportOpen,
    isEpubImportOpen,
    isAuthModalOpen,
    isInstallModalOpen,
    sagaFormOpen,
    mobileMenuOpen,
    refreshInboxCount
  ]);

  const runCloudSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAndMigrateWithSupabase();
      setSyncResult(res);
      if (res.error) {
        setGlobalError(
          formatFriendlyErrorMessage(
            res.error,
            'No se pudo sincronizar la colección con la nube en este momento. Revisa tu conexión a internet.'
          )
        );
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
          const user = data.session.user;
          lastAuthUserIdRef.current = user.id;
          lastAuthUserIsAnonRef.current = Boolean(user.is_anonymous);
          setCurrentUser(user);
          const cached = profileService.getCachedProfile(user.id);
          if (cached) setCurrentUserProfile(cached);
          setAuthLoading(false);
          profileService.fetchUserProfile(user.id, user.email).then((prof) => {
            if (mounted && prof) setCurrentUserProfile(prof);
          });
          collectionService.syncFromCloud(user.id).catch(() => {});
          readingChallengeService.syncFromCloud(user.id).catch(() => {});
          await runCloudSync();
        } else {
          const settings = await fetchSupabaseAuthSettings();
          if (mounted && settings.anonymousEnabled) {
            const { data: anonData } = await supabase.auth.signInAnonymously();
            if (mounted && anonData.user) {
              lastAuthUserIdRef.current = anonData.user.id;
              lastAuthUserIsAnonRef.current = true;
              setCurrentUser(anonData.user);
              setAuthLoading(false);
              await runCloudSync();
              return;
            }
          }
          if (mounted) {
            lastAuthUserIdRef.current = null;
            lastAuthUserIsAnonRef.current = false;
            setAuthLoading(false);
          }
        }
      } catch {
        if (mounted) {
          lastAuthUserIdRef.current = null;
          lastAuthUserIsAnonRef.current = false;
          setAuthLoading(false);
        }
      }
    };

    initAuthAndSync();

    // Comprobar si se accede mediante enlace de recuperación de contraseña en la URL
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setIsRecoveryMode(true);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const nextIsAnon = Boolean(nextUser?.is_anonymous);

      const prevUserId = lastAuthUserIdRef.current;
      const prevIsAnon = lastAuthUserIsAnonRef.current;
      const isInitialEvent = prevUserId === undefined;

      // Evento de recuperación de contraseña disparado por Supabase al hacer clic en el enlace del email
      if (_event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }

      // Al cerrar sesión, restablecer la navegación a la pantalla de Inicio
      if (_event === 'SIGNED_OUT') {
        lastAuthUserIdRef.current = null;
        lastAuthUserIsAnonRef.current = false;
        setCurrentUser(null);
        setCurrentUserProfile(null);
        setSyncResult(null);
        setIsRecoveryMode(false);
        setActiveSection('dashboard');
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
        return;
      }

      if (_event === 'SIGNED_IN') {
        // Un inicio de sesión genuino ocurre cuando cambia de usuario (o pasa de anónimo/invitado a cuenta real)
        const isRealNewSignIn =
          !isInitialEvent &&
          nextUserId !== null &&
          (prevUserId !== nextUserId || (prevIsAnon && !nextIsAnon));

        lastAuthUserIdRef.current = nextUserId;
        lastAuthUserIsAnonRef.current = nextIsAnon;
        setCurrentUser(nextUser);

        // Si es un inicio de sesión nuevo y explícito, cerrar el modal de login y llevar a Inicio
        if (isRealNewSignIn) {
          setIsAuthModalOpen(false);
          setActiveSection('dashboard');
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
          }
        }

        // Si fue solo un re-enfoque de pestaña o revalidación de token (mismo usuario),
        // preservamos intacta la pantalla actual, el scroll y los modales abiertos.
        if (nextUser) {
          setOfflineGuestMode(false);
          const cached = profileService.getCachedProfile(nextUser.id);
          if (cached) setCurrentUserProfile(cached);
          profileService.fetchUserProfile(nextUser.id, nextUser.email).then((prof) => {
            if (mounted && prof) setCurrentUserProfile(prof);
          });
          // Solo lanzar sincronización pesada en inicio de sesión real
          if (isRealNewSignIn) {
            collectionService.syncFromCloud(nextUser.id).catch(() => {});
            readingChallengeService.syncFromCloud(nextUser.id).catch(() => {});
            runCloudSync();
          }
        } else {
          setCurrentUserProfile(null);
          setSyncResult(null);
        }
        return;
      }

      // Otros eventos (TOKEN_REFRESHED, USER_UPDATED, etc.)
      lastAuthUserIdRef.current = nextUserId;
      lastAuthUserIsAnonRef.current = nextIsAnon;
      setCurrentUser(nextUser);
      if (!nextUser) {
        setCurrentUserProfile(null);
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
    const q = deferredSearch.trim().toLowerCase();

    const matches = books.filter((book) => {
      if (q) {
        const normQ = normalizeText(q);
        const inTitle = book.nombre.toLowerCase().includes(q) || (normQ && normalizeText(book.nombre).includes(normQ));
        const inAuthor = book.autor.toLowerCase().includes(q) || (normQ && normalizeText(book.autor).includes(normQ));
        const inIsbn = book.isbn.toLowerCase().includes(q);
        const inGenre = book.genero
          ? book.genero.toLowerCase().includes(q) || (normQ && normalizeText(book.genero).includes(normQ))
          : false;
        const inSubgenres =
          Array.isArray(book.subgeneros) &&
          book.subgeneros.some(
            (s) => s.toLowerCase().includes(q) || (normQ && normalizeText(s).includes(normQ))
          );
        if (!inTitle && !inAuthor && !inIsbn && !inGenre && !inSubgenres) return false;
      }
      if (filters.genero && book.genero !== filters.genero) return false;
      if (filters.subgenero) {
        const normFilter = normalizeText(filters.subgenero);
        const hasSub = book.subgeneros.some(
          (s) => s === filters.subgenero || normalizeText(s) === normFilter
        );
        if (!hasSub) return false;
      }
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
  }, [books, deferredSearch, filters]);

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
    setSelectedParsedEbook(null);
    setEditingBook(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEditBook = (book: Book) => {
    setSelectedInitialCandidate(null);
    setSelectedParsedEbook(null);
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

  const handleAddBookFromCommunity = async (book: Book) => {
    await saveBookRecord({
      nombre: book.nombre,
      autor: book.autor,
      genero: book.genero,
      subgeneros: book.subgeneros || [],
      fechaPublicacion: book.fechaPublicacion,
      paginas: book.paginas,
      puntuacion: null,
      progreso: '❌ No Leído',
      sagaId: null,
      sagaNombre: '',
      volumen: null,
      fechaInicio: '',
      fechaFin: '',
      lecturaVirtual: '',
      tiempoLectura: '',
      isbn: book.isbn,
      editorial: book.editorial,
      idioma: book.idioma,
      edicion: book.edicion,
      sinopsis: book.sinopsis,
      portadaUrl: book.portadaUrl,
      portadaFallbackUrl: book.portadaFallbackUrl
    });
  };

  const handleAddRecommendedBook = async (payload: BookRecommendationPayload) => {
    await saveBookRecord({
      nombre: payload.nombre,
      autor: payload.autor,
      genero: (payload.genero || '') as Genre,
      subgeneros: payload.subgeneros || [],
      fechaPublicacion: payload.fechaPublicacion ?? null,
      paginas: payload.paginas || null,
      puntuacion: null,
      progreso: '❌ No Leído',
      sagaId: null,
      sagaNombre: '',
      volumen: null,
      fechaInicio: '',
      fechaFin: '',
      lecturaVirtual: '',
      tiempoLectura: '',
      isbn: payload.isbn || '',
      editorial: payload.editorial || '',
      idioma: 'Español',
      edicion: '',
      sinopsis: payload.sinopsis || '',
      portadaUrl: payload.portadaUrl || '',
      portadaFallbackUrl: payload.portadaFallbackUrl || ''
    });
    setInboxUnreadCount((c) => Math.max(0, c - 1));
  };

  const confirmDeleteBook = async () => {
    if (!bookToDelete) return;
    const bookTitle = bookToDelete.nombre;
    try {
      await deleteBookRecord(bookToDelete.id);
      collectionService.removeBookFromAllCollections(bookToDelete.id, currentUser?.id);
      collectionService.removeBookLentRecords(bookToDelete.id, currentUser?.id);
      if (detailBookId === bookToDelete.id) setDetailBookId(null);
      setBookToDelete(null);
      showToast(`Se ha eliminado "${bookTitle}" de tu biblioteca.`, 'info');
    } catch (err: unknown) {
      setGlobalError(
        formatFriendlyErrorMessage(err, 'No se pudo eliminar el libro de tu biblioteca.')
      );
    }
  };

  const confirmDeleteSaga = async () => {
    if (!sagaToDelete) return;
    const sagaTitle = sagaToDelete.nombre;
    try {
      await deleteSagaAndUnlinkBooks(sagaToDelete.id);
      setSagaToDelete(null);
      showToast(`Se ha eliminado la saga "${sagaTitle}". Los libros se conservan.`, 'info');
    } catch (err: unknown) {
      setGlobalError(
        formatFriendlyErrorMessage(err, 'No pudimos eliminar la saga en este momento.')
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
      setSagaError(
        formatFriendlyErrorMessage(err, 'No se pudo guardar la saga en este momento.')
      );
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
        formatFriendlyErrorMessage(err, 'No se pudo vincular el libro a la saga.')
      );
    }
  };

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
              onClick={() => handleNavigate(tab.id)}
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
            onClick={handleOpenCreateBook}
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
                onOpenDetail={handleOpenCardDetail}
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

  const handleCancelRecovery = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setIsRecoveryMode(false);
    setCurrentUser(null);
    setCurrentUserProfile(null);
  };

  const handleSuccessRecovery = () => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setIsRecoveryMode(false);
    setActiveSection('dashboard');
    showToast('Tu contraseña se ha actualizado correctamente.', 'success');
  };

  if (isRecoveryMode) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-[#f7f0df] dark:bg-[#080C15] p-4 overflow-hidden">
        <AnimatedBackground />
        <ResetPasswordModal
          isOpen={true}
          onCancel={handleCancelRecovery}
          onSuccess={handleSuccessRecovery}
        />
      </div>
    );
  }

  if (!currentUser && !offlineGuestMode) {
    return (
      <AuthScreen
        onContinueOffline={() => {
          setOfflineGuestMode(true);
          setActiveSection('dashboard');
        }}
      />
    );
  }

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = await profileService.updateUserProfile(currentUser.id, updates);
    setCurrentUserProfile(updated);
  };

  const handleUpdateGuestAlias = (alias: string) => {
    profileService.setGuestAlias(alias);
    setGuestAlias(alias);
  };

  const handleUpdateGuestAvatar = (avatar: string | null) => {
    profileService.setGuestAvatar(avatar);
    setGuestAvatar(avatar);
  };

  const userInitial = (
    currentUserProfile?.displayName ||
    currentUser?.email ||
    guestAlias ||
    'L'
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f7f0df] dark:bg-[#080C15] text-stone-900 dark:text-slate-100 relative">
      <AnimatedBackground />

      <BookSidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onLeaveGuestMode={() => setOfflineGuestMode(false)}
        metrics={metrics}
        collectionsCount={collectionsCount}
        sagasCount={sagas.length}
        hasUser={Boolean(currentUser)}
        userEmail={currentUser?.email}
        userDisplayName={currentUserProfile?.displayName || (!currentUser ? guestAlias : null)}
        username={currentUserProfile?.username}
        avatarUrl={currentUser ? currentUserProfile?.avatarUrl : guestAvatar}
        userInitial={userInitial}
        isSyncing={isSyncing}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        inboxUnreadCount={inboxUnreadCount}
        onOpenInbox={() => setIsInboxOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-amber-900/20 dark:border-[#222B3C] bg-[#efe4cb]/95 dark:bg-[#111622]/95 backdrop-blur-md px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir índice y menú lateral"
            className="w-9 h-9 -ml-1 inline-flex items-center justify-center rounded-xl text-stone-700 dark:text-slate-200 hover:bg-amber-900/10 dark:hover:bg-slate-800 active:scale-95 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="flex items-center gap-2 min-w-0 text-left"
          >
            <img
              src="/logo.svg"
              alt="Nexus Library Logo"
              className="w-7 h-7 shrink-0 drop-shadow-sm"
            />
            <span className="font-serif text-base font-bold tracking-wide truncate">
              <span className="text-amber-700 dark:text-amber-400">N</span>EXUS
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreateBook}
            title="Añadir libro"
            aria-label="Añadir libro"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => setIsInboxOpen(true)}
            className="relative w-9 h-9 inline-flex items-center justify-center rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea]/80 dark:bg-[#151C28] text-stone-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 active:scale-95 transition"
            title="Buzón Literario"
            aria-label="Buzón Literario"
          >
            <Mail className="w-4 h-4" />
            {inboxUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shadow-sm">
                {inboxUnreadCount > 9 ? '9+' : inboxUnreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('settings')}
            aria-label="Ajustes y Perfil"
            title="Ajustes y Perfil"
            className={
              'w-9 h-9 inline-flex items-center justify-center rounded-xl border transition active:scale-95 ' +
              (activeSection === 'settings'
                ? 'border-amber-600 bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold'
                : 'border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea]/80 dark:bg-[#151C28] text-stone-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400')
            }
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-w-0 lg:pl-64 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div key={activeSection} className="book-turn max-w-7xl mx-auto px-3 py-4 sm:p-6 lg:p-8">
          {globalError && (
            <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 shadow-sm">
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
                    onClick={() => handleNavigate('library')}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-lg shadow-black/50 transition"
                  >
                    <Library className="w-4 h-4" /> Ver Mi Biblioteca
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('discover')}
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
                  onGoToSettings={handleNavigateToSettingsAccount}
                />
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5">
                <button
                  type="button"
                  onClick={() => handleNavigate('library')}
                  className="rounded-xl editorial-card-surface editorial-card-interactive p-3 sm:p-4 text-left active:scale-[0.98]"
                >
                  <span className="text-[11px] sm:text-xs text-stone-600 dark:text-slate-400">Total de Libros</span>
                  <p className="font-serif text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{metrics.total}</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('shelf-reading')}
                  className="rounded-xl border border-amber-600/40 dark:border-amber-500/30 bg-amber-500/15 dark:bg-amber-500/10 p-3 sm:p-4 text-left active:scale-[0.98] sm:hover:-translate-y-1 hover:border-amber-600 dark:hover:border-amber-400 hover:shadow-[0_10px_24px_-6px_rgba(245,158,11,0.22)] transition-all duration-300"
                >
                  <span className="text-[11px] sm:text-xs font-semibold text-amber-800 dark:text-amber-300">⏳ Leyendo</span>
                  <p className="font-serif text-xl sm:text-3xl font-bold text-amber-900 dark:text-amber-200 mt-0.5 sm:mt-1">
                    {metrics.reading}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('shelf-unread')}
                  className="rounded-xl editorial-card-surface editorial-card-interactive p-3 sm:p-4 text-left active:scale-[0.98]"
                >
                  <span className="text-[11px] sm:text-xs text-stone-600 dark:text-slate-400">❌ Por leer</span>
                  <p className="font-serif text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{metrics.unread}</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('shelf-paused')}
                  className="rounded-xl editorial-card-surface editorial-card-interactive p-3 sm:p-4 text-left active:scale-[0.98]"
                >
                  <span className="text-[11px] sm:text-xs font-semibold text-rose-700 dark:text-rose-300">⏸️ Pausados</span>
                  <p className="font-serif text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{metrics.paused}</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('shelf-read')}
                  className="rounded-xl border border-emerald-600/40 dark:border-emerald-500/30 bg-emerald-500/15 dark:bg-emerald-500/10 p-3 sm:p-4 text-left active:scale-[0.98] sm:hover:-translate-y-1 hover:border-emerald-600 dark:hover:border-emerald-400 hover:shadow-[0_10px_24px_-6px_rgba(16,185,129,0.22)] transition-all duration-300 col-span-2 sm:col-span-1 flex sm:block items-center justify-between"
                >
                  <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 dark:text-emerald-300">✅ Leídos</span>
                  <p className="font-serif text-xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-200 sm:mt-1">
                    {metrics.read}
                  </p>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-7 xl:col-span-8">
                  <DashboardReadingPanel
                    readingBooks={books.filter((b) => b.progreso === '⏳ Leyendo')}
                    onOpenDetail={handleOpenBookDetail}
                    onNavigateToShelf={() => handleNavigate('shelf-reading')}
                  />
                </div>

                <div className="lg:col-span-5 xl:col-span-4">
                  <DashboardSagasPanel
                    sagasWithBooks={sagasWithBooks}
                    totalSagasCount={sagas.length}
                    onNavigateToSagas={() => handleNavigate('sagas')}
                  />
                </div>
              </div>

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
                onOpenDetail={handleOpenBookDetail}
                onNavigateToLibrary={() => handleNavigate('library')}
                onLoadSampleBooks={handleLoadSampleBooks}
                isLoadingSample={isLoadingSample}
                onOpenImport={() => setIsImportOpen(true)}
                openedBookId={detailBookId}
              />
            </div>
          )}

          {activeSection === 'library' && (
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
                    onClick={handleOpenCreateBook}
                    title="Añadir libro"
                    aria-label="Añadir libro"
                    className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm transition shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInitialEpubFiles(undefined);
                      setIsEpubImportOpen(true);
                    }}
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
                      onClick={handleRemoveSampleBooks}
                      disabled={isRemovingSample}
                      className="px-3 py-1.5 rounded-lg border border-amber-600/40 hover:bg-amber-500/20 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      {isRemovingSample ? 'Limpiando...' : 'Limpiar muestra'}
                    </button>
                    <button
                      type="button"
                      onClick={handleKeepSampleBooks}
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
                        onClick={handleLoadSampleBooks}
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
                        onClick={() => setIsImportOpen(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#1B2333] hover:bg-amber-500/10 text-stone-800 dark:text-slate-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
                      >
                        <FileUp className="w-4 h-4 text-amber-600" />
                        <span>Importar Goodreads / CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenCreateBook}
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
                      onOpenDetail={handleOpenCardDetail}
                      onEdit={handleOpenEditBook}
                      onDelete={(b) => setBookToDelete(b)}
                      onQuickStatusChange={updateBookQuickStatus}
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
                        onClick={() => handleOpenBookDetail(book.id)}
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
                            onClick={() => handleOpenBookDetail(book.id)}
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
                <BookShelf books={filteredBooks} onOpenDetail={handleOpenBookDetail} openedBookId={detailBookId} />
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
                currentUserId={currentUser?.id}
                onAddBookFromCommunity={handleAddBookFromCommunity}
                onOpenBookDetail={handleOpenCardDetail}
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

          {activeSection === 'collections' && (
            <React.Suspense
              fallback={
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-slate-400">
                  <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-600 dark:border-amber-400/30 dark:border-t-amber-400 rounded-full animate-spin" />
                  <span className="font-serif text-sm">Cargando colecciones & estanterías...</span>
                </div>
              }
            >
              <CollectionsScreen
                books={books}
                currentUserId={currentUser?.id}
                onOpenBookDetail={(target) => {
                  const id = typeof target === 'string' ? target : target.id;
                  handleOpenBookDetail(id);
                }}
                openedBookId={detailBookId}
                onShowToast={showToast}
                onEditBook={handleOpenEditBook}
                onDeleteBook={(b) => setBookToDelete(b)}
                onQuickStatusChange={updateBookQuickStatus}
              />
            </React.Suspense>
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
                      className="catalog-card-panel saga-card space-y-4"
                    >
                      <div className="catalog-brass-tab" aria-hidden="true">
                        {item.registeredCount}{' '}
                        {item.registeredCount === 1 ? 'volumen' : 'volúmenes'}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 break-words leading-tight">
                            {item.saga.nombre}
                          </h2>
                          <p className="font-serif italic text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
                            {item.readCount} leídos · {item.pendingCount} pendientes
                            {item.saga.descripcion ? ` — ${item.saga.descripcion}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
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
                                'saga-action-btn' +
                                (activeSagaIdForAssign === item.saga.id ? ' is-active' : '')
                              }
                              title={activeSagaIdForAssign === item.saga.id ? 'Cancelar' : 'Asignar libro'}
                              aria-label={activeSagaIdForAssign === item.saga.id ? 'Cancelar' : 'Asignar libro'}
                            >
                              {activeSagaIdForAssign === item.saga.id ? (
                                <X className="w-3.5 h-3.5" />
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Asignar libro</span>
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
                              className="saga-action-btn"
                              title="Editar nombre o descripción de la saga"
                              aria-label="Editar saga"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSagaToDelete(item.saga)}
                              className="saga-action-btn is-danger"
                              title="Eliminar saga"
                              aria-label="Eliminar saga"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                            <LibrarySelect
                              value={assignBookId}
                              onChange={(val) => setAssignBookId(val)}
                              placeholder="— Selecciona un libro —"
                              options={[
                                { value: '', label: '— Selecciona un libro —' },
                                ...books
                                  .filter((b) => b.sagaId !== item.saga.id)
                                  .map((b) => ({
                                    value: b.id,
                                    label: `${b.nombre} (${b.autor || 'Sin autor'})`
                                  }))
                              ]}
                            />
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
                        <SagaShelf
                          books={item.books}
                          onOpenDetail={handleOpenBookDetail}
                          openedBookId={detailBookId}
                        />
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'stats' && (
            <React.Suspense
              fallback={
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-slate-400">
                  <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-600 dark:border-amber-400/30 dark:border-t-amber-400 rounded-full animate-spin" />
                  <span className="font-serif text-sm">Cargando reto & estadísticas...</span>
                </div>
              }
            >
              <ReadingChallengeScreen
                books={books}
                sagas={sagas}
                currentUserId={currentUser?.id}
                userName={currentUserProfile?.displayName || currentUserProfile?.username || guestAlias || 'Lector Nexus'}
                darkMode={darkMode}
                onOpenBookDetail={handleOpenCardDetail}
                onShowToast={showToast}
                onUpdateBookDates={updateBookQuickDates}
              />
            </React.Suspense>
          )}

          {activeSection === 'settings' && (
            <React.Suspense
              fallback={
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-slate-400">
                  <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-600 dark:border-amber-400/30 dark:border-t-amber-400 rounded-full animate-spin" />
                  <span className="font-serif text-sm">Cargando ajustes de la biblioteca...</span>
                </div>
              }
            >
              <SettingsScreen
                darkMode={darkMode}
                onToggleTheme={() => setDarkMode((d) => !d)}
                currentUser={currentUser}
                userProfile={currentUserProfile}
                onUpdateProfile={handleUpdateProfile}
                guestAlias={guestAlias}
                onUpdateGuestAlias={handleUpdateGuestAlias}
                guestAvatar={guestAvatar}
                onUpdateGuestAvatar={handleUpdateGuestAvatar}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onTriggerSync={runCloudSync}
                isSyncing={isSyncing}
                syncResult={syncResult}
                books={books}
                sagas={sagas}
                initialTab={settingsInitialTab}
                onOpenEpubImport={() => {
                  setInitialEpubFiles(undefined);
                  setIsEpubImportOpen(true);
                }}
                onNavigateToLibrary={() => handleNavigate('library')}
              />
            </React.Suspense>
          )}
        </div>
      </main>

      <nav
        aria-label="Navegación principal móvil"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-amber-900/20 dark:border-[#222B3C] bg-[#fbf6ea]/95 dark:bg-[#111622]/95 backdrop-blur-md grid grid-cols-5 px-1 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] text-[11px] shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.2)]"
      >
        {([
          {
            id: 'dashboard' as NavigationSection,
            label: 'Inicio',
            icon: LayoutDashboard,
            isActive: activeSection === 'dashboard'
          },
          {
            id: 'library' as NavigationSection,
            label: 'Biblioteca',
            icon: Library,
            isActive: activeSection === 'library' || activeSection.startsWith('shelf-')
          },
          {
            id: 'discover' as NavigationSection,
            label: 'Descubrir',
            icon: Compass,
            isActive: activeSection === 'discover'
          },
          {
            id: 'sagas' as NavigationSection,
            label: 'Sagas',
            icon: Layers,
            isActive: activeSection === 'sagas'
          },
          {
            id: 'stats' as NavigationSection,
            label: 'Reto & Stats',
            icon: Trophy,
            isActive: activeSection === 'stats'
          }
        ]).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={
                'flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition active:scale-95 ' +
                (item.isActive
                  ? 'text-amber-800 dark:text-amber-400 font-bold'
                  : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200')
              }
            >
              <span
                className={
                  'inline-flex items-center justify-center rounded-full px-3 py-1 transition-all ' +
                  (item.isActive
                    ? 'bg-amber-600/15 dark:bg-amber-500/20 border border-amber-600/30 text-amber-900 dark:text-amber-300 shadow-xs'
                    : 'bg-transparent border border-transparent')
                }
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="leading-tight tracking-tight">{item.label}</span>
            </button>
          );
        })}
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
            currentUserId={currentUser?.id}
            readerName={currentUserProfile?.displayName || (!currentUser ? guestAlias : null) || undefined}
            onShowToast={showToast}
          />
        )}

        {isAddEditOpen && (
          <AddEditBookModal
            isOpen={isAddEditOpen}
            editingBook={editingBook}
            initialCandidate={selectedInitialCandidate}
            initialParsedEbook={selectedParsedEbook}
            sagas={sagas}
            existingBooks={books}
            onClose={() => {
              setIsAddEditOpen(false);
              setSelectedInitialCandidate(null);
              setSelectedParsedEbook(null);
            }}
            onSave={async (data, id) => {
              await saveBookRecord(data, id);
            }}
            onOpenMultiEpubImport={(files) => {
              setInitialEpubFiles(files);
              setIsEpubImportOpen(true);
            }}
          />
        )}

        {isEpubImportOpen && (
          <EpubImportModal
            isOpen={isEpubImportOpen}
            existingBooks={books}
            sagas={sagas}
            initialFiles={initialEpubFiles}
            onClose={() => {
              setIsEpubImportOpen(false);
              setInitialEpubFiles(undefined);
            }}
            onSaveBook={async (data, id) => {
              await saveBookRecord(data, id);
            }}
            onOpenInEditor={(parsed) => {
              setIsEpubImportOpen(false);
              setInitialEpubFiles(undefined);
              setEditingBook(null);
              setSelectedInitialCandidate(null);
              setSelectedParsedEbook(parsed);
              setIsAddEditOpen(true);
            }}
            onShowToast={(msg) => showToast(msg, 'success')}
          />
        )}

        {isImportOpen && (
          <ImportModal
            isOpen={isImportOpen}
            books={books}
            sagas={sagas}
            onClose={() => setIsImportOpen(false)}
            onOpenEpubImport={() => {
              setInitialEpubFiles(undefined);
              setIsEpubImportOpen(true);
            }}
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


        {isInboxOpen && (
          <BookInboxModal
            isOpen={isInboxOpen}
            currentUserId={currentUser?.id}
            userProfile={currentUserProfile}
            initialTab={inboxInitialTab}
            onClose={() => {
              setIsInboxOpen(false);
              refreshInboxCount();
            }}
            onAddBookToLibrary={handleAddRecommendedBook}
            onShowToast={showToast}
            onInboxUpdated={refreshInboxCount}
            onNavigateToSettingsAccount={handleNavigateToSettingsAccount}
          />
        )}
      </React.Suspense>

      {currentUser && currentUserProfile && (
        <FirstLoginProfileModal
          isOpen={isFirstLoginModalOpen}
          onClose={() => setIsFirstLoginModalOpen(false)}
          userProfile={currentUserProfile}
          userId={currentUser.id}
          onUpdateProfile={handleUpdateProfile}
          onGoToSettings={handleNavigateToSettingsAccount}
          onShowToast={showToast}
        />
      )}

      {bookToDelete &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={() => setBookToDelete(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
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
                ¿Seguro que deseas eliminar <strong>"{bookToDelete.nombre}"</strong> de tu biblioteca?
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookToDelete(null)}
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

      {sagaToDelete &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-saga-dialog-title"
            onClick={() => setSagaToDelete(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
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
                ¿Eliminar la saga <strong>"{sagaToDelete.nombre}"</strong>? Los libros asociados se conservarán en tu biblioteca como libros independientes.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSagaToDelete(null)}
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
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* ─── Banner Flotante In-App estilo Instagram / Notificación Nativa ─── */}
      {inAppBanner &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed top-3 sm:top-5 right-3 sm:right-6 left-3 sm:left-auto z-[9999] max-w-md animate-in slide-in-from-top-4 fade-in duration-300"
            role="status"
            aria-live="polite"
          >
            <div className="relative flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#131722]/95 dark:bg-[#111623]/95 text-white border border-amber-500/35 shadow-2xl backdrop-blur-md">
              {/* Avatar o Icono */}
              <div className="relative shrink-0">
                {inAppBanner.avatarUrl ? (
                  <img
                    src={inAppBanner.avatarUrl}
                    alt="Remitente"
                    className="w-11 h-11 rounded-full object-cover border border-amber-500/40"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold font-serif shadow-sm">
                    {inAppBanner.tab === 'friend_requests' ? (
                      <Users className="w-5 h-5 text-slate-950" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-slate-950" />
                    )}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-[#131722] flex items-center justify-center text-[9px] text-slate-950 font-black">
                  ✦
                </span>
              </div>

              {/* Textos */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-amber-300 truncate">
                    {inAppBanner.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">Ahora</span>
                </div>
                <p className="text-xs text-slate-200 mt-0.5 line-clamp-2 leading-relaxed">
                  {inAppBanner.body}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInboxInitialTab(inAppBanner.tab);
                      setIsInboxOpen(true);
                      setInAppBanner(null);
                    }}
                    className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 text-xs transition shadow-sm active:scale-95 cursor-pointer"
                  >
                    Abrir buzón
                  </button>
                  <button
                    type="button"
                    onClick={() => setInAppBanner(null)}
                    className="rounded-lg text-slate-400 hover:text-white px-2 py-1 text-xs transition cursor-pointer"
                  >
                    Descartar
                  </button>
                </div>
              </div>

              {/* Botón cerrar */}
              <button
                type="button"
                onClick={() => setInAppBanner(null)}
                className="self-start text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>,
          document.body
        )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 inset-x-4 sm:inset-x-auto sm:bottom-6 sm:right-6 z-[9999] flex items-center justify-between sm:justify-start gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-amber-500/30 text-xs sm:text-sm font-serif transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 bg-stone-900/95 text-amber-100 dark:bg-stone-950/95 dark:text-amber-200"
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                setToast(null);
              }}
              className="ml-2 px-2.5 py-1 rounded-lg text-xs font-sans font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-95 transition"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-stone-400 hover:text-white ml-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded p-0.5"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
