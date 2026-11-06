import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LayoutDashboard,
  Library,
  Layers,
  Trophy,
  Compass,
  Plus,
  AlertTriangle,
  Menu,
  Settings,
  Mail,
  X,
  Sparkles,
  Users,
  ScanBarcode,
  FileUp
} from 'lucide-react';
import { UserAvatar } from './components/UserAvatar';
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
  updateBookReadingProgress,
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
  BookRecommendationPayload,
  Saga,
  UserProfile
} from './types/models';
import { profileService } from './services/profileService';
import { recommendationInboxService } from './services/recommendationInboxService';
import {
  Genre,
  ReadingStatus
} from './constants/catalogs';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { AnimatedBackground } from './components/AnimatedBackground';
import { BookSidebar, NavigationSection } from './components/BookSidebar';
import { SagasScreen } from './components/SagasScreen';
import { DashboardView } from './components/DashboardView';
import { LibraryView } from './components/LibraryView';
import { candidateToBookInput } from './services/bookMetadataService';
import { formatFriendlyErrorMessage } from './utils/errorUtils';
import './dashboard-panels.css';

import { AppModals } from './components/AppModals';
import { AppToast } from './components/AppToast';
import { ReadingSessionModal } from './components/ReadingSessionModal';
import { ReadingOracleModal } from './components/ReadingOracleModal';
const DiscoverBooksScreen = React.lazy(() =>
  import('./components/DiscoverBooksScreen').then((m) => ({ default: m.DiscoverBooksScreen }))
);
const CommunityReadersView = React.lazy(() =>
  import('./components/CommunityReadersView').then((m) => ({ default: m.CommunityReadersView }))
);
const SettingsScreen = React.lazy(() =>
  import('./components/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);
const ReadingChallengeScreen = React.lazy(() =>
  import('./components/ReadingChallengeScreen').then((m) => ({ default: m.ReadingChallengeScreen }))
);
import { collectionService } from './services/collectionService';
import { readingStreakService } from './services/readingStreakService';
import { readingChallengeService } from './services/readingChallengeService';
import { soundService } from './services/soundService';
import type { SettingsTab } from './components/SettingsScreen';
import { calculateReaderLevel } from './services/levelingService';
import { useLibraryFilters } from './hooks/useLibraryFilters';
import { useLibraryModals } from './hooks/useLibraryModals';
import { useAppNotifications } from './hooks/useAppNotifications';

const VALID_NAVIGATION_SECTIONS = new Set<NavigationSection>([
  'dashboard',
  'library',
  'discover',
  'community',
  'shelf-unread',
  'shelf-reading',
  'shelf-paused',
  'shelf-read',
  'collections',
  'sagas',
  'stats',
  'settings'
]);

const isPageReload = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries && navEntries.length > 0) {
      return navEntries[0].type === 'reload';
    }
    // Fallback para navegadores antiguos
    return window.performance?.navigation?.type === 1;
  } catch {
    return false;
  }
};

const getInitialActiveSection = (): NavigationSection => {
  if (typeof window === 'undefined') return 'dashboard';
  try {
    // Si la página se está recargando (F5, recarga manual en la pestaña), preservamos la sección actual
    if (isPageReload()) {
      const urlParam = new URLSearchParams(window.location.search).get('section') as NavigationSection;
      if (urlParam && VALID_NAVIGATION_SECTIONS.has(urlParam)) {
        return urlParam;
      }
      const stored = sessionStorage.getItem('nexus_active_section') as NavigationSection;
      if (stored && VALID_NAVIGATION_SECTIONS.has(stored)) {
        return stored;
      }
    }
  } catch {
    // ignorar
  }

  // Si la aplicación se abre de nuevo (tras haberla cerrado, pestaña nueva o inicio fresco):
  // La ventana que se abre es SIEMPRE la de Inicio ('dashboard')
  try {
    localStorage.removeItem('nexus_active_section');
    sessionStorage.setItem('nexus_active_section', 'dashboard');
    sessionStorage.removeItem('nexus_discover_tab');
    if (window.location.search) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('section') || url.searchParams.has('tab')) {
        url.searchParams.delete('section');
        url.searchParams.delete('tab');
        window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
      }
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
    if (section === 'settings') {
      setSettingsInitialTab('account');
    }
    startTransition(() => {
      setActiveSection(section);
    });
    try {
      sessionStorage.setItem('nexus_active_section', section);
      const url = new URL(window.location.href);
      if (section === 'dashboard') {
        url.searchParams.delete('section');
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('section', section);
        if (section !== 'discover' && section !== 'library') { url.searchParams.delete('tab'); }
      }
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

  // Sincroniza activeSection con sessionStorage y URL para persistir tras F5
  useEffect(() => {
    try {
      sessionStorage.setItem('nexus_active_section', activeSection);
      const url = new URL(window.location.href);
      if (activeSection === 'dashboard') {
        if (url.searchParams.has('section')) {
          url.searchParams.delete('section');
          url.searchParams.delete('tab');
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        if (url.searchParams.get('section') !== activeSection) {
          url.searchParams.set('section', activeSection);
          if (activeSection !== 'discover' && activeSection !== 'library') { url.searchParams.delete('tab'); }
          window.history.replaceState({}, '', url.toString());
        }
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
  const {
    filters,
    setFilters,
    showFilters,
    setShowFilters,
    subgenreSelectGroups,
    allSubgenresOptions,
    filteredBooks
  } = useLibraryFilters(books);

  const modals = useLibraryModals();
  const [sessionBook, setSessionBook] = useState<Book | null>(null);
  const [isOracleOpen, setIsOracleOpen] = useState(false);
  const handleStartReadingSession = useCallback((book: Book) => {
    setSessionBook(book);
  }, []);
  const {
    detailBookId,
    setDetailBookId,
    handleOpenBookDetail,
    handleOpenCardDetail,
    isAddEditOpen,
    setIsAddEditOpen,
    setSelectedInitialCandidate,
    setSelectedParsedEbook,
    handleOpenCreateBook,
    handleOpenEditBook,
    handleCustomizeFromDiscover,
    isImportOpen,
    setIsImportOpen,
    isEpubImportOpen,
    setIsEpubImportOpen,
    setInitialEpubFiles,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isInstallModalOpen,
    setIsInstallModalOpen,
    bookToDelete,
    setBookToDelete,
    sagaToDelete,
    setSagaToDelete,
    setCelebrationBook,
    setIsOrderModalOpen,
    isInboxOpen,
    setIsInboxOpen,
    setInboxInitialTab,
    setIsFirstLoginModalOpen,
    isAnyLibraryModalOpen
  } = modals;

  const [isMobileQuickAddOpen, setIsMobileQuickAddOpen] = useState(false);

  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('type=recovery') || search.includes('type=recovery');
  });

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

  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('account');

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

  const {
    inAppBanner,
    setInAppBanner,
    showInAppBanner,
    toast,
    showToast,
    dismissToast
  } = useAppNotifications();

  const setGlobalError = useCallback(
    (msg: string | null) => {
      if (msg) {
        showToast(msg, 'error');
      }
    },
    [showToast]
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
    isAnyLibraryModalOpen
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
          readingStreakService.syncFromCloud(user.id).catch(() => {});
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
            readingStreakService.syncFromCloud(nextUser.id).catch(() => {});
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

  const readerLevelInfo = useMemo(() => {
    try {
      return calculateReaderLevel(books, sagas);
    } catch (err) {
      console.warn('[App] Error al calcular nivel del lector:', err);
      return calculateReaderLevel([], []);
    }
  }, [books, sagas]);

  const handleBookStatusChange = useCallback(
    async (bookId: string, nextStatus: ReadingStatus) => {
      const currentBook = books.find((b) => b.id === bookId);
      await updateBookQuickStatus(bookId, nextStatus);

      // Si la obra pasa a estar completada / leída, activar la celebración con sello de lacre
      if (nextStatus === '✅ Leído' && currentBook && currentBook.progreso !== '✅ Leído') {
        setCelebrationBook({ ...currentBook, progreso: '✅ Leído' });
      }
    },
    [books]
  );

  const handleUpdateBookReadingProgress = useCallback(
    async (bookId: string, paginaActual: number, totalPaginas?: number) => {
      try {
        const result = await updateBookReadingProgress(bookId, paginaActual, totalPaginas);

        if (result.justFinished) {
          soundService.playWaxSeal(true);
          soundService.playBrassBell(true);
          setCelebrationBook(result.book);
          showToast(`¡Enhorabuena! Has completado "${result.book.nombre}" 🎉`, {
            type: 'success'
          });
        } else {
          showToast(
            `Progreso actualizado: pág. ${result.book.paginaActual} de ${result.book.paginas || '?'}`,
            { type: 'info' }
          );
        }
      } catch (err) {
        console.error('Error al actualizar el progreso de lectura:', err);
        showToast('Error al actualizar el progreso de lectura', { type: 'error' });
      }
    },
    [showToast, setCelebrationBook]
  );

  const handleSelectOracleBook = useCallback(
    async (book: Book) => {
      setIsOracleOpen(false);
      if (book.progreso !== '⏳ Leyendo') {
        await handleBookStatusChange(book.id, '⏳ Leyendo');
      }
      setSessionBook(book);
    },
    [handleBookStatusChange]
  );

  const handleQuickAddFromDiscover = async (candidate: BibliographicCandidate) => {
    const bookInput = candidateToBookInput(candidate);
    await saveBookRecord(bookInput);
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
      formato: 'digital',
      propiedad: 'propio',
      sagaId: null,
      sagaNombre: '',
      volumen: null,
      fechaInicio: '',
      fechaFin: '',
      lecturaVirtual: book.lecturaVirtual || 'Digital (.epub / eBook)',
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
      formato: 'digital',
      propiedad: 'propio',
      sagaId: null,
      sagaNombre: '',
      volumen: null,
      fechaInicio: '',
      fechaFin: '',
      lecturaVirtual: 'Digital (.epub / eBook)',
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
        onOpenCreateBook={handleOpenCreateBook}
        onOpenBarcodeScanner={modals.handleOpenBarcodeScanner}
        levelInfo={readerLevelInfo}
        onOpenOrderModal={() => setIsOrderModalOpen(true)}
      />

      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-amber-900/20 dark:border-[#222B3C] bg-[#efe4cb]/95 dark:bg-[#111622]/95 backdrop-blur-md px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir índice y menú lateral"
            className="w-9 h-9 -ml-1 inline-flex items-center justify-center rounded-xl text-stone-700 dark:text-slate-200 hover:bg-amber-900/10 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Botón táctil para Añadir / Escanear / Importar */}
          <button
            type="button"
            onClick={() => setIsMobileQuickAddOpen(true)}
            title="Añadir libro o escanear ISBN"
            aria-label="Añadir libro o escanear ISBN"
            className="h-9 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold shadow-xs transition shrink-0 cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden xs:inline font-serif">Añadir</span>
          </button>

          {/* Buzón Literario */}
          <button
            type="button"
            onClick={() => setIsInboxOpen(true)}
            className="relative w-9 h-9 inline-flex items-center justify-center rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea]/80 dark:bg-[#151C28] text-stone-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 active:scale-95 transition cursor-pointer"
            title="Buzón Literario"
            aria-label="Buzón Literario"
          >
            <Mail className="w-4 h-4" />
            {inboxUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shadow-xs animate-pulse">
                {inboxUnreadCount > 9 ? '9+' : inboxUnreadCount}
              </span>
            )}
          </button>

          {/* Carnet & Perfil del Lector con Marco de la Orden */}
          <button
            type="button"
            onClick={() => handleNavigate('settings')}
            aria-label="Mi Carnet y Perfil de Lector"
            title="Mi Carnet y Perfil de Lector"
            className={
              'relative p-0.5 rounded-full transition active:scale-95 cursor-pointer ' +
              (activeSection === 'settings'
                ? 'ring-2 ring-amber-500 shadow-sm'
                : 'hover:ring-2 hover:ring-amber-500/50')
            }
          >
            <UserAvatar
              avatarUrl={currentUser ? currentUserProfile?.avatarUrl : guestAvatar}
              displayName={currentUserProfile?.displayName || (!currentUser ? guestAlias : null) || 'Lector'}
              username={currentUserProfile?.username}
              frameRankId={currentUserProfile?.orderFrame}
              level={readerLevelInfo?.level}
              rank={readerLevelInfo?.rank}
              size="sm"
              shape="circle"
              isCurrentUser={true}
            />
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-w-0 lg:pl-64 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div key={activeSection} className="book-turn max-w-7xl mx-auto px-3 py-4 sm:p-6 lg:p-8">
          {activeSection === 'dashboard' && (
            <DashboardView
              darkMode={darkMode}
              currentUser={currentUser}
              currentUserProfile={currentUserProfile}
              isProfileSetupPending={isProfileSetupPending}
              metrics={metrics}
              books={books}
              sagas={sagas}
              sagasWithBooks={sagasWithBooks}
              detailBookId={detailBookId}
              isLoadingSample={isLoadingSample}
              onNavigate={handleNavigate}
              onNavigateToSettingsAccount={handleNavigateToSettingsAccount}
              onOpenBookDetail={handleOpenBookDetail}
              onLoadSampleBooks={handleLoadSampleBooks}
              onOpenImport={() => setIsImportOpen(true)}
              onUpdateProgress={handleUpdateBookReadingProgress}
              onStartReadingSession={handleStartReadingSession}
              onOpenOracle={() => setIsOracleOpen(true)}
              onShowToast={showToast}
            />
          )}

          {(activeSection === 'library' || activeSection === 'collections' || activeSection === 'sagas' || activeSection.startsWith('shelf-')) && (
            <LibraryView
              activeSection={activeSection}
              books={books}
              filteredBooks={filteredBooks}
              sagas={sagas}
              sagasWithBooks={sagasWithBooks}
              onSaveSaga={upsertSaga}
              onDeleteSaga={setSagaToDelete}
              onAssignBookToSaga={assignBookToSagaRecord}
              onSagasError={setGlobalError}
              filters={filters}
              setFilters={setFilters}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              subgenreSelectGroups={subgenreSelectGroups}
              allSubgenresOptions={allSubgenresOptions}
              metrics={metrics}
              collectionsCount={collectionsCount}
              currentUserId={currentUser?.id}
              onShowToast={showToast}
              isSampleActive={isSampleActive}
              isLoadingSample={isLoadingSample}
              isRemovingSample={isRemovingSample}
              detailBookId={detailBookId}
              onNavigate={handleNavigate}
              onOpenCreateBook={handleOpenCreateBook}
              onOpenBarcodeScanner={modals.handleOpenBarcodeScanner}
              onOpenEpubImport={() => {
                setInitialEpubFiles(undefined);
                setIsEpubImportOpen(true);
              }}
              onOpenImport={() => setIsImportOpen(true)}
              onOpenCardDetail={handleOpenCardDetail}
              onOpenBookDetail={handleOpenBookDetail}
              onOpenEditBook={handleOpenEditBook}
              onDeleteBook={(b) => setBookToDelete(b)}
              onBookStatusChange={handleBookStatusChange}
              onLoadSampleBooks={handleLoadSampleBooks}
              onRemoveSampleBooks={handleRemoveSampleBooks}
              onKeepSampleBooks={handleKeepSampleBooks}
              onOpenOracle={() => setIsOracleOpen(true)}
            />
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
                onOpenBookDetail={handleOpenCardDetail}
                userDisplayName={currentUserProfile?.displayName || (!currentUser ? guestAlias : null) || undefined}
                username={currentUserProfile?.username}
                avatarUrl={currentUser ? currentUserProfile?.avatarUrl : guestAvatar}
                onOpenBarcodeScanner={modals.handleOpenBarcodeScanner}
                onShowToast={showToast}
              />
            </React.Suspense>
          )}

          {activeSection === 'community' && (
            <React.Suspense
              fallback={
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-stone-500 dark:text-slate-400">
                  <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-600 dark:border-amber-400/30 dark:border-t-amber-400 rounded-full animate-spin" />
                  <span className="font-serif text-sm">Cargando Comunidad de Lectores...</span>
                </div>
              }
            >
              <CommunityReadersView
                currentUserId={currentUser?.id}
                existingBooks={books}
                onAddBookToMyLibrary={handleAddBookFromCommunity}
                onOpenBookDetail={handleOpenCardDetail}
              />
            </React.Suspense>
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
                username={currentUserProfile?.username}
                avatarUrl={currentUserProfile?.avatarUrl || guestAvatar}
                memberId={currentUser?.id}
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
                onOpenBookDetail={handleOpenCardDetail}
                onOpenOrderModal={() => setIsOrderModalOpen(true)}
                onShowToast={showToast}
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
            isActive:
              activeSection === 'library' ||
              activeSection === 'collections' ||
              activeSection.startsWith('shelf-') ||
              activeSection === 'sagas'
          },
          {
            id: 'community' as NavigationSection,
            label: 'Comunidad',
            icon: Users,
            isActive: activeSection === 'community'
          },
          {
            id: 'discover' as NavigationSection,
            label: 'Descubrir',
            icon: Compass,
            isActive: activeSection === 'discover'
          },
          {
            id: 'stats' as NavigationSection,
            label: 'Reto',
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
                'flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition active:scale-95 cursor-pointer ' +
                (item.isActive
                  ? 'text-amber-800 dark:text-amber-400 font-bold'
                  : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200')
              }
            >
              <span
                className={
                  'inline-flex items-center justify-center rounded-full px-3 py-1 transition-all relative ' +
                  (item.isActive
                    ? 'bg-amber-600/15 dark:bg-amber-500/20 border border-amber-600/30 text-amber-900 dark:text-amber-300 shadow-xs'
                    : 'bg-transparent border border-transparent')
                }
              >
                <Icon className="w-4 h-4" />
                {item.id === 'community' && inboxUnreadCount > 0 && (
                  <span className="absolute top-0.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </span>
              <span className="leading-tight tracking-tight text-[11px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modal / Action Sheet de Acceso Rápido para Añadir Obra en Móvil */}
      {isMobileQuickAddOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-quick-add-title"
          >
            <div
              aria-hidden="true"
              className="fixed inset-0 bg-black/70 backdrop-blur-xs cursor-default"
              onClick={() => setIsMobileQuickAddOpen(false)}
            />
            <div
              className="catalog-card-panel relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 z-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="catalog-brass-tab">Incorporar Obra a la Biblioteca</div>

              {/* Indicador táctil superior */}
              <div className="w-12 h-1 rounded-full bg-amber-900/20 dark:bg-amber-400/20 mx-auto -mt-1 mb-2 sm:hidden" />

              <div className="flex items-center justify-between pb-2 border-b border-amber-900/15 dark:border-[#242E42]">
                <div>
                  <h3 id="mobile-quick-add-title" className="font-serif text-lg font-bold text-stone-900 dark:text-slate-100">
                    Añadir a tu Colección
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400">
                    Selecciona cómo deseas catalogar tu próxima obra.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileQuickAddOpen(false)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* Opción 1: Escanear código de barras */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileQuickAddOpen(false);
                    modals.handleOpenBarcodeScanner();
                  }}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121824] hover:border-amber-500 hover:bg-amber-500/10 transition text-left group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                    <ScanBarcode className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 block">
                      Escanear Código de Barras (ISBN)
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-slate-400 block mt-0.5 leading-tight">
                      Apunta la cámara al dorso del libro para obtener portada y datos al instante.
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">📷</span>
                </button>

                {/* Opción 2: Añadir manualmente */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileQuickAddOpen(false);
                    handleOpenCreateBook();
                  }}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121824] hover:border-amber-500 hover:bg-amber-500/10 transition text-left group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 block">
                      Añadir Obra Manualmente
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-slate-400 block mt-0.5 leading-tight">
                      Escribe título, autor o busca en el catálogo de Google Books y OpenLibrary.
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">✍️</span>
                </button>

                {/* Opción 3: Importar EPUB */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileQuickAddOpen(false);
                    setInitialEpubFiles(undefined);
                    setIsEpubImportOpen(true);
                  }}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121824] hover:border-amber-500 hover:bg-amber-500/10 transition text-left group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 block">
                      Importar Archivo EPUB / Backup
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-slate-400 block mt-0.5 leading-tight">
                      Carga un libro digital desde tu teléfono o restaura una copia de seguridad.
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">📥</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <AppModals
        modals={modals}
        books={books}
        sagas={sagas}
        currentUser={currentUser}
        currentUserProfile={currentUserProfile}
        guestAlias={guestAlias}
        guestAvatar={guestAvatar}
        readerLevelInfo={readerLevelInfo}
        syncResult={syncResult}
        isSyncing={isSyncing}
        runCloudSync={runCloudSync}
        refreshInboxCount={refreshInboxCount}
        showToast={showToast}
        onOpenEditBook={handleOpenEditBook}
        onBookStatusChange={handleBookStatusChange}
        onUpdateBookReadingProgress={handleUpdateBookReadingProgress}
        onStartReadingSession={handleStartReadingSession}
        updateBookQuickRating={updateBookQuickRating}
        updateBookQuickDates={updateBookQuickDates}
        saveBookRecord={saveBookRecord}
        handleAddRecommendedBook={handleAddRecommendedBook}
        handleUpdateProfile={handleUpdateProfile}
        handleNavigateToSettingsAccount={handleNavigateToSettingsAccount}
        handleNavigate={handleNavigate}
        confirmDeleteBook={confirmDeleteBook}
        confirmDeleteSaga={confirmDeleteSaga}
      />

      {sessionBook && (
        <ReadingSessionModal
          book={sessionBook}
          isOpen={Boolean(sessionBook)}
          onClose={() => setSessionBook(null)}
          onSaveProgress={handleUpdateBookReadingProgress}
          onShowToast={showToast}
        />
      )}

      <ReadingOracleModal
        isOpen={isOracleOpen}
        books={books}
        sagas={sagas}
        onClose={() => setIsOracleOpen(false)}
        onSelectBookToRead={handleSelectOracleBook}
        onOpenBookDetail={handleOpenBookDetail}
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

      <AppToast toast={toast} onDismiss={dismissToast} />
    </div>
  );
};
