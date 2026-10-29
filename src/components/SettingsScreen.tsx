import React, { useEffect, useState, useTransition, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings,
  Palette,
  Cloud,
  HardDrive,
  Sparkles,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  LogOut,
  LogIn,
  Sun,
  Moon,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Check,
  Info,
  User as UserIcon,
  Globe,
  Users,
  Lock,
  BookOpen,
  Save,
  FileUp,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Smartphone,
  Laptop,
  Share,
  PlusSquare,
  WifiOff,
  Flame,
  Bell,
  BellOff,
  BellRing,
  Award
} from 'lucide-react';
import { BatchMetadataModal, BatchMetadataMode } from './BatchMetadataModal';
import { UserAvatar } from './UserAvatar';
import { AvatarPickerModal } from './AvatarPickerModal';
import { ShareReaderCardModal } from './ShareReaderCardModal';
import { User } from '@supabase/supabase-js';
import { Book, Saga, UserProfile, ProfileVisibility } from '../types/models';
import {
  clearLocalCacheOnSignOut,
  importCsvBooks,
  requestPersistentStorage,
  restoreBackupPayload,
  SyncMigrationResult,
  updateBookPartialRecord
} from '../db/database';
import { supabase } from '../services/supabaseClient';
import {
  exportLibraryToCsv,
  exportLibraryToJson,
  parseBackupJson,
  parseGoodreadsOrStorygraphCsv
} from '../services/importExportService';
import { bookMetadataService } from '../services/bookMetadataService';
import { profileService } from '../services/profileService';
import { pwaInstallService, PwaInstallState } from '../services/pwaInstallService';
import {
  getPushSubscriptionStatus,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  PushSubscriptionStatus
} from '../services/pushNotificationService';
import '../dashboard-panels.css';

export type SettingsTab = 'appearance' | 'account' | 'metadata' | 'backup' | 'app';

interface SettingsScreenProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  currentUser: User | null;
  userProfile?: UserProfile | null;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
  guestAlias?: string;
  onUpdateGuestAlias?: (alias: string) => void;
  guestAvatar?: string | null;
  onUpdateGuestAvatar?: (avatar: string | null) => void;
  onOpenAuthModal: () => void;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  syncResult?: SyncMigrationResult | null;
  books: Book[];
  sagas: Saga[];
  initialTab?: SettingsTab;
  onOpenEpubImport?: () => void;
  onNavigateToLibrary?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  darkMode,
  onToggleTheme,
  currentUser,
  userProfile,
  onUpdateProfile,
  guestAlias = '',
  onUpdateGuestAlias,
  guestAvatar = null,
  onUpdateGuestAvatar,
  onOpenAuthModal,
  onTriggerSync,
  isSyncing,
  books,
  sagas,
  initialTab = 'appearance',
  onOpenEpubImport,
  onNavigateToLibrary
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [, startTransition] = useTransition();

  const handleTabChange = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    setFeedback(null);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    }
  }, []);

  // Estado para el modal de completado en lote (portadas y sinopsis)
  const [batchModalConfig, setBatchModalConfig] = useState<{
    isOpen: boolean;
    mode: BatchMetadataMode;
  } | null>(null);

  // Estados de almacenamiento persistente
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);

  // Estados de PWA / Instalación
  const [pwaState, setPwaState] = useState<PwaInstallState>(() => pwaInstallService.getState());
  const [isInstallingPwa, setIsInstallingPwa] = useState(false);

  useEffect(() => {
    const unsub = pwaInstallService.subscribe(setPwaState);
    return unsub;
  }, []);

  const handleInstallPwa = async () => {
    setIsInstallingPwa(true);
    const result = await pwaInstallService.promptInstall();
    setIsInstallingPwa(false);
    if (result === 'accepted') {
      setFeedback({
        type: 'success',
        text: '¡Instalación completada! Nexus Library se ha añadido a tu dispositivo.'
      });
    }
  };

  // Estados de Notificaciones Push
  const [pushStatus, setPushStatus] = useState<PushSubscriptionStatus | null>(null);
  const [isPushLoading, setIsPushLoading] = useState(false);

  const refreshPushStatus = useCallback(async () => {
    try {
      const status = await getPushSubscriptionStatus();
      setPushStatus(status);
    } catch {
      // Silencioso
    }
  }, []);

  useEffect(() => {
    refreshPushStatus();
  }, [refreshPushStatus, currentUser]);

  const handleTogglePushNotifications = async () => {
    if (!currentUser?.id) {
      setFeedback({
        type: 'error',
        text: 'Inicia sesión con tu cuenta para configurar las notificaciones Push.'
      });
      return;
    }

    setIsPushLoading(true);
    try {
      if (pushStatus?.isSubscribed) {
        const res = await unsubscribeUserFromPush(currentUser.id);
        if (res.success) {
          setFeedback({
            type: 'success',
            text: res.message || 'Notificaciones Push desactivadas en este dispositivo.'
          });
        } else {
          setFeedback({
            type: 'error',
            text: res.error || 'No se pudieron desactivar las notificaciones.'
          });
        }
      } else {
        const res = await subscribeUserToPush(currentUser.id);
        if (res.success) {
          setFeedback({
            type: 'success',
            text: res.message || '¡Notificaciones Push activadas con éxito en este dispositivo!'
          });
        } else {
          setFeedback({
            type: 'error',
            text: res.error || 'No se pudieron activar las notificaciones.'
          });
        }
      }
      await refreshPushStatus();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al modificar las notificaciones Push.'
      });
    } finally {
      setIsPushLoading(false);
    }
  };

  // Estados de perfil de lector (Alias y Usuario)
  const [profileDisplayName, setProfileDisplayName] = useState(
    currentUser ? (userProfile?.displayName || '') : guestAlias
  );
  const [profileUsername, setProfileUsername] = useState(userProfile?.username || '');
  const [profileBio, setProfileBio] = useState(userProfile?.bio || '');
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>(
    userProfile?.visibility ?? (userProfile?.isPublic === false ? 'private' : 'public')
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isExportCarnetOpen, setIsExportCarnetOpen] = useState(false);

  const handleAvatarSelect = async (avatarUrl: string | null) => {
    if (currentUser) {
      if (onUpdateProfile) {
        await onUpdateProfile({ avatarUrl });
      }
      setFeedback({
        type: 'success',
        text: '¡Sello heráldico actualizado con éxito en tu Carnet de Lector!'
      });
    } else {
      onUpdateGuestAvatar?.(avatarUrl);
      setFeedback({
        type: 'success',
        text: 'Sello de lector guardado en este dispositivo.'
      });
    }
  };
  const [usernameCheck, setUsernameCheck] = useState<{
    status: 'idle' | 'checking' | 'available' | 'unavailable';
    message?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    if (currentUser && userProfile) {
      setProfileDisplayName(userProfile.displayName || '');
      setProfileUsername(userProfile.username || '');
      setProfileBio(userProfile.bio || '');
      setProfileVisibility(userProfile.visibility ?? (userProfile.isPublic === false ? 'private' : 'public'));
    } else if (!currentUser) {
      setProfileDisplayName(guestAlias);
    }
  }, [currentUser, userProfile, guestAlias]);

  const handleUsernameBlur = async () => {
    if (!currentUser || !profileUsername.trim()) return;
    const clean = profileUsername.trim().toLowerCase();
    if (clean === userProfile?.username) {
      setUsernameCheck({ status: 'available', message: 'Tu nombre de usuario actual' });
      return;
    }
    setUsernameCheck({ status: 'checking' });
    const res = await profileService.checkUsernameAvailable(clean, currentUser.id);
    if (res.available) {
      setUsernameCheck({ status: 'available', message: '¡Disponible!' });
    } else {
      setUsernameCheck({ status: 'unavailable', message: res.reason || 'Nombre no disponible' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onUpdateGuestAlias?.(profileDisplayName);
      setFeedback({ type: 'success', text: 'Nombre guardado en este dispositivo.' });
      return;
    }

    if (!profileDisplayName.trim()) {
      setFeedback({ type: 'error', text: 'Por favor, introduce un nombre visible o alias.' });
      return;
    }

    if (!profileUsername.trim()) {
      setFeedback({ type: 'error', text: 'Por favor, introduce un nombre de usuario.' });
      return;
    }

    setIsSavingProfile(true);
    try {
      const cleanUsername = profileUsername.trim().toLowerCase();
      if (cleanUsername !== userProfile?.username) {
        const check = await profileService.checkUsernameAvailable(cleanUsername, currentUser.id);
        if (!check.available) {
          setFeedback({ type: 'error', text: check.reason || 'El nombre de usuario no está disponible.' });
          setIsSavingProfile(false);
          return;
        }
      }

      if (onUpdateProfile) {
        await onUpdateProfile({
          displayName: profileDisplayName.trim(),
          username: cleanUsername,
          bio: profileBio.trim(),
          isPublic: profileVisibility === 'public',
          visibility: profileVisibility
        });
      }

      setFeedback({
        type: 'success',
        text: '¡Perfil actualizado! Tu alias y nombre de usuario ya están activos.'
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar el perfil.'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Mensajes de estado / feedback
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted).catch(() => {});
    }
  }, []);

  const {
    booksMissingCovers,
    booksWithCoversCount,
    coverPercentage,
    booksMissingSynopsis,
    booksWithSynopsisCount,
    synopsisPercentage
  } = useMemo(() => {
    const missingCovers = books.filter((b) => !b.portadaUrl && !b.portadaDataUrl);
    const withCovers = books.length - missingCovers.length;
    const cPct = books.length > 0 ? Math.round((withCovers / books.length) * 100) : 100;
    const missingSyn = books.filter((b) => !b.sinopsis || b.sinopsis.trim().length === 0);
    const withSyn = books.length - missingSyn.length;
    const sPct = books.length > 0 ? Math.round((withSyn / books.length) * 100) : 100;
    return {
      booksMissingCovers: missingCovers,
      booksWithCoversCount: withCovers,
      coverPercentage: cPct,
      booksMissingSynopsis: missingSyn,
      booksWithSynopsisCount: withSyn,
      synopsisPercentage: sPct
    };
  }, [books]);

  /* ─────────────────── Protección de almacenamiento en el equipo ─────────────────── */
  const handleRequestStorage = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      setFeedback({
        type: 'success',
        text: 'Protección activada. Tu navegador conservará tu biblioteca de forma permanente sin peligro de borrado automático.'
      });
    } else {
      setFeedback({
        type: 'info',
        text: 'El navegador gestiona el almacenamiento con la cuota estándar del sistema.'
      });
    }
  };

  /* ─────────────────── Copias de Seguridad ─────────────────── */
  const handleDownloadJson = () => {
    try {
      const json = exportLibraryToJson(books, sagas);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-library-copia-completa-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'success',
        text: 'Copia de seguridad completa descargada correctamente en tu dispositivo.'
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Hubo un inconveniente al generar la copia de seguridad. Por favor, inténtalo de nuevo.'
      });
    }
  };

  const handleDownloadCsv = () => {
    try {
      const csv = exportLibraryToCsv(books);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-library-libros-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'success',
        text: 'Lista de libros exportada en formato compatible con Excel y Google Sheets.'
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Hubo un inconveniente al generar la exportación a hoja de cálculo.'
      });
    }
  };

  const handleRestoreJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);
    try {
      const text = await file.text();
      const backup = parseBackupJson(text);
      const { addedBooks, skippedDuplicates } = await restoreBackupPayload(backup);

      setFeedback({
        type: 'success',
        text: `Restauración completada con éxito: se añadieron ${addedBooks} libros a tu biblioteca (${skippedDuplicates} ya existían y se mantuvieron intactos).`
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'El archivo de copia seleccionado no es válido o está dañado.'
      });
    }
    e.target.value = '';
  };

  const handleImportCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);
    try {
      const text = await file.text();
      const parsed = parseGoodreadsOrStorygraphCsv(text);
      const sourceName =
        parsed.source === 'goodreads'
          ? 'Goodreads'
          : parsed.source === 'storygraph'
          ? 'StoryGraph'
          : 'CSV';

      const { addedBooks, skippedDuplicates, sagasCreated } = await importCsvBooks(parsed.books);

      setFeedback({
        type: 'success',
        text: `¡Importación desde ${sourceName} completada con éxito! Se añadieron ${addedBooks} libros y ${sagasCreated} sagas (${skippedDuplicates} registros omitidos por ya estar en tu biblioteca). Las portadas disponibles se vincularon automáticamente.`
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo procesar el archivo CSV seleccionado.'
      });
    }
    e.target.value = '';
  };

  /* ─────────────────── Sesión de Usuario ─────────────────── */
  const handleSignOutClick = () => {
    setShowSignOutConfirm(true);
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await clearLocalCacheOnSignOut();
      await supabase.auth.signOut();
      setShowSignOutConfirm(false);
      setFeedback({
        type: 'info',
        text: 'Has cerrado sesión. Puedes seguir usando la biblioteca en este equipo o iniciar sesión con otra cuenta.'
      });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setIsSigningOut(false);
    }
  };



  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ─── Encabezado de Ajustes ─── */}
      <div className="border-b border-amber-900/20 dark:border-[#242E42] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-600/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-300">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              Ajustes de la Biblioteca
            </h1>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
              Personaliza la apariencia, gestiona tu cuenta y asegura tus libros y lecturas.
            </p>
          </div>
        </div>

        {/* ─── Pestañas (cuadrícula 2x2 en móvil, fila en escritorio) ─── */}
        <div className="mt-5 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('appearance')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'appearance'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Palette className="w-4 h-4 shrink-0 pointer-events-none" /> <span className="truncate pointer-events-none">Apariencia</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('account')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'account'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Cloud className="w-4 h-4 shrink-0 pointer-events-none" /> <span className="truncate pointer-events-none">Cuenta y Nube</span>
            {currentUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0 pointer-events-none" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('metadata')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'metadata'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Sparkles className="w-4 h-4 shrink-0 pointer-events-none" /> <span className="truncate pointer-events-none">Catálogo</span>
            {booksMissingCovers.length > 0 && (
              <span className="rounded-full bg-amber-600/20 text-amber-900 dark:text-amber-300 px-1.5 py-0.2 text-[10px] font-bold shrink-0 pointer-events-none">
                {booksMissingCovers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('backup')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'backup'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <HardDrive className="w-4 h-4 shrink-0 pointer-events-none" /> <span className="truncate pointer-events-none">Copias</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('app')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'app'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Smartphone className="w-4 h-4 shrink-0 pointer-events-none" /> <span className="truncate pointer-events-none">Instalar App</span>
            {pwaState.isInstalled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0 pointer-events-none" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Mensaje de Feedback ─── */}
      {feedback && (
        <div
          className={
            'rounded-2xl border p-4 text-xs flex items-start justify-between gap-3 shadow-sm transition-all ' +
            (feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : feedback.type === 'error'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200')
          }
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            ) : (
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="leading-relaxed">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ════════════════════ TAB 1: APARIENCIA ════════════════════ */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="rounded-2xl editorial-card-surface p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Tema Visual de la
                Biblioteca
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 leading-relaxed">
                Elige la estética en la que prefieres disfrutar de tu colección. Nexus Library está
                diseñado especialmente para destacar en el tema claro de papel crema clásico, evocando
                las páginas de un libro tradicional.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Opción Tema Claro */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (darkMode) onToggleTheme();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (darkMode) onToggleTheme();
                  }
                }}
                className={
                  'group relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 ' +
                  (!darkMode
                    ? 'border-amber-600 bg-[#fffcf5] dark:bg-[#151D2A] shadow-md shadow-amber-900/10 ring-1 ring-amber-600/30'
                    : 'border-amber-900/20 dark:border-[#283246] bg-[#f4ebd6]/60 dark:bg-[#101520] hover:border-amber-500/50 hover:bg-[#fffcf5]/70 dark:hover:bg-[#141A26]')
                }
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                        Papel Crema Clásico
                      </h3>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                        Recomendado / Diseño Principal
                      </span>
                    </div>
                  </div>
                  {!darkMode ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-0.5 shadow-sm">
                      <Check className="w-3 h-3" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 dark:border-[#283246] bg-white/40 dark:bg-[#161D2B] text-stone-500 dark:text-slate-400 text-[10px] font-semibold px-2.5 py-0.5 group-hover:border-amber-500/50 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                      Seleccionar
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-amber-900/15 bg-[#f7f0df] p-3 text-xs text-stone-800 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] font-serif font-bold text-amber-900">
                    <span>Estantería de Lectura</span>
                    <span className="text-amber-700">★★★★★</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Fondo cálido en papel de lectura, tipografía serif editorial y estanterías de
                    madera para una experiencia natural y sin fatiga visual.
                  </p>
                </div>
              </div>

              {/* Opción Tema Oscuro */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!darkMode) onToggleTheme();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!darkMode) onToggleTheme();
                  }
                }}
                className={
                  'group relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 ' +
                  (darkMode
                    ? 'border-amber-400 bg-[#0E131E] shadow-xl shadow-black/40 ring-1 ring-amber-400/30'
                    : 'border-amber-900/20 dark:border-[#283246] bg-[#f4ebd6]/60 dark:bg-[#101520] hover:border-amber-500/50 hover:bg-[#fffcf5]/70 dark:hover:bg-[#141A26]')
                }
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                        Biblioteca Nocturna
                      </h3>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                        Lectura en penumbra
                      </span>
                    </div>
                  </div>
                  {darkMode ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-0.5 shadow-sm">
                      <Check className="w-3 h-3" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 dark:border-[#283246] bg-white/40 dark:bg-[#161D2B] text-stone-500 dark:text-slate-400 text-[10px] font-semibold px-2.5 py-0.5 group-hover:border-amber-500/50 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                      Seleccionar
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-slate-700/60 bg-[#080C15] p-3 text-xs text-slate-200 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] font-serif font-bold text-amber-300">
                    <span>Estantería de Lectura</span>
                    <span className="text-amber-400">★★★★★</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Fondo pizarra oscuro con acentos dorados y carmesí. Ideal si prefieres leer de
                    noche o reducir el brillo de la pantalla.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/60 dark:bg-[#101520] p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Nexus Library prioriza siempre el tema claro por diseño. Si eliges el tema oscuro,
                tu preferencia se recordará en este navegador para tus próximas visitas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 2: CUENTA Y NUBE ════════════════════ */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="catalog-card-panel relative pt-8 sm:pt-9 p-5 sm:p-7 shadow-xl space-y-6">
            <div className="catalog-brass-tab">
              Expediente de Lector · Carnet Oficial
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#222B3C] pb-4">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-slate-100">
                  <Cloud className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Carnet de Lector & Sincronización
                </h2>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                  Tu credencial bibliotecaria histórica, heráldica personal y copia de seguridad en la nube.
                </p>
              </div>

              {currentUser ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Copia en la nube activa
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Guardado en este dispositivo
                </div>
              )}
            </div>

            {/* ═══ TARJETA FÍSICA: CARNET DE LECTOR OFICIAL ═══ */}
            <div className="relative rounded-2xl border-2 border-amber-900/25 dark:border-amber-500/30 bg-gradient-to-br from-[#fbf6ec] via-[#f5ebd6] to-[#eee0c4] dark:from-[#131926] dark:via-[#0f1420] dark:to-[#0a0d14] p-5 sm:p-7 shadow-lg overflow-hidden">
              {/* Filigrana de fondo */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -bottom-6 w-56 h-56 opacity-5 dark:opacity-10 text-amber-900 dark:text-amber-400 select-none flex items-center justify-center font-serif text-9xl font-black rotate-12"
              >
                NL
              </div>

              {/* Borde interior diploma */}
              <div className="pointer-events-none absolute inset-2.5 rounded-xl border border-amber-900/15 dark:border-amber-400/15" />

              {/* Encabezado de la credencial */}
              <div className="relative flex items-center justify-between gap-3 border-b border-amber-900/15 dark:border-amber-400/20 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600/60 dark:bg-amber-400/60" />
                  <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest uppercase text-amber-950/70 dark:text-amber-300/80">
                    Nexus Librarivm · Carnet Bibliotecario
                  </span>
                </div>
                <div className="font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-amber-900/10 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 border border-amber-900/20 dark:border-amber-400/20">
                  № NL-{(currentUser?.id ? currentUser.id.slice(0, 8) : 'INVITADO').toUpperCase()}
                </div>
              </div>

              {/* Contenido: Avatar + Datos del lector */}
              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Avatar heráldico interactivo con botón de edición */}
                <div
                  onClick={() => setIsAvatarModalOpen(true)}
                  title="Haz clic para personalizar tu Sello o Avatar"
                  className="relative group shrink-0 cursor-pointer"
                >
                  <div className="p-1 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-md transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg">
                    <UserAvatar
                      avatarUrl={currentUser ? userProfile?.avatarUrl : guestAvatar}
                      displayName={profileDisplayName}
                      username={profileUsername}
                      size="2xl"
                      className="rounded-xl"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAvatarModalOpen(true);
                    }}
                    title="Personalizar Sello o Avatar"
                    className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 text-[10px] shadow-lg border-2 border-white dark:border-[#131926] transition transform hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sello</span>
                  </button>
                </div>

                {/* Info lector */}
                <div className="flex-1 min-w-0 text-center sm:text-left space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100 tracking-tight">
                        {profileDisplayName.trim() || (currentUser ? currentUser.email : 'Lector Invitado')}
                      </h3>
                      <p className="text-xs font-mono font-semibold text-amber-800 dark:text-amber-400 mt-0.5">
                        {currentUser && profileUsername ? (
                          <span>@{profileUsername}</span>
                        ) : currentUser ? (
                          <span className="text-stone-600 dark:text-slate-400">{currentUser.email}</span>
                        ) : (
                          <span className="text-stone-500 italic">Sin identificador @usuario</span>
                        )}
                      </p>
                    </div>

                    <div className="self-center sm:self-start">
                      <button
                        type="button"
                        onClick={() => setIsExportCarnetOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition shadow-sm transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Award className="w-4 h-4 text-slate-950" />
                        <span>Exportar Carnet Oficial</span>
                      </button>
                    </div>
                  </div>

                  {/* Cita o Biografía en cursiva clásica */}
                  <div className="text-xs italic font-serif text-stone-700 dark:text-slate-300 border-l-2 border-amber-600/40 pl-3 py-1 bg-amber-500/5 dark:bg-amber-400/5 rounded-r">
                    &ldquo;{profileBio.trim() || 'Custodio de volúmenes, páginas devoradas y pasajes memorables en Nexus Library.'}&rdquo;
                  </div>

                  {/* Cifras de biblioteca en carnet */}
                  <div className="pt-1.5 grid grid-cols-3 gap-2 text-center sm:text-left">
                    <div className="rounded-lg bg-amber-900/5 dark:bg-amber-400/5 border border-amber-900/10 dark:border-amber-400/10 p-2">
                      <div className="font-serif text-base sm:text-lg font-bold text-amber-900 dark:text-amber-300">
                        {books.length}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400">
                        Libros
                      </div>
                    </div>
                    <div className="rounded-lg bg-amber-900/5 dark:bg-amber-400/5 border border-amber-900/10 dark:border-amber-400/10 p-2">
                      <div className="font-serif text-base sm:text-lg font-bold text-amber-900 dark:text-amber-300">
                        {sagas.length}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400">
                        Sagas
                      </div>
                    </div>
                    <div className="rounded-lg bg-amber-900/5 dark:bg-amber-400/5 border border-amber-900/10 dark:border-amber-400/10 p-2">
                      <div className="font-serif text-base sm:text-lg font-bold text-amber-900 dark:text-amber-300">
                        {books.filter((b) => b.progreso && b.progreso.includes('Leído')).length}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400">
                        Leídos
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción del carnet */}
              <div className="relative mt-5 pt-4 border-t border-amber-900/15 dark:border-amber-400/20 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-stone-600 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>
                    {currentUser
                      ? `Sesión activa como ${currentUser.email}`
                      : 'Modo local activo. Conéctate para sincronizar tu colección.'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {currentUser ? (
                    <>
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={onTriggerSync}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 text-xs transition shadow-sm"
                      >
                        <RefreshCw className={'w-3.5 h-3.5 ' + (isSyncing ? 'animate-spin' : '')} />
                        {isSyncing ? 'Guardando en la nube...' : 'Sincronizar ahora'}
                      </button>
                      <button
                        type="button"
                        disabled={isSigningOut}
                        onClick={handleSignOutClick}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold px-3.5 py-2 text-xs transition"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenAuthModal}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-md"
                    >
                      <LogIn className="w-4 h-4" /> Iniciar sesión o Crear cuenta
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Formulario de Identidad / Perfil de Lector ─── */}
            <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-5 space-y-4">
              <div className="border-b border-amber-900/15 dark:border-[#222B3C] pb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Datos de la Credencial & Privacidad
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                    Modifica tu nombre público, identificador único, cita bibliotecaria y visibilidad comunitaria.
                  </p>
                </div>
                {currentUser && (
                  <span
                    className={`hidden sm:inline-flex items-center gap-1.5 rounded-full text-[10px] font-semibold px-2.5 py-0.5 border ${
                      profileVisibility === 'public'
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                        : profileVisibility === 'friends'
                        ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30'
                        : 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-400/30'
                    }`}
                  >
                    {profileVisibility === 'public' && (
                      <>
                        <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Público
                      </>
                    )}
                    {profileVisibility === 'friends' && (
                      <>
                        <Users className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                        Solo amigos
                      </>
                    )}
                    {profileVisibility === 'private' && (
                      <>
                        <Lock className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                        Privado
                      </>
                    )}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Alias o Nombre visible */}
                  <div className="space-y-1.5">
                    <label htmlFor="input-alias" className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                      Alias o Nombre Visible
                    </label>
                    <input
                      id="input-alias"
                      type="text"
                      value={profileDisplayName}
                      onChange={(e) => setProfileDisplayName(e.target.value)}
                      placeholder="Ej: Alejandro Ramírez"
                      maxLength={50}
                      className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0e1420] px-3.5 py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none shadow-xs transition"
                    />
                    <p className="text-[11px] text-stone-500 dark:text-slate-500 leading-tight">
                      Tu nombre personal en la credencial. Puede incluir espacios, tildes y mayúsculas.
                    </p>
                  </div>

                  {/* Nombre de usuario */}
                  {currentUser ? (
                    <div className="space-y-1.5">
                      <label htmlFor="input-username" className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                        Nombre de usuario
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-amber-700 dark:text-amber-400 select-none">@</span>
                        <input
                          id="input-username"
                          type="text"
                          value={profileUsername}
                          onChange={(e) => {
                            setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                            setUsernameCheck({ status: 'idle' });
                          }}
                          onBlur={handleUsernameBlur}
                          placeholder="usuario"
                          maxLength={25}
                          className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0e1420] pl-7 pr-3.5 py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none shadow-xs transition font-mono"
                        />
                      </div>
                      {usernameCheck.status === 'checking' && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Comprobando si está libre...
                        </p>
                      )}
                      {usernameCheck.status === 'available' && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                          <Check className="w-3 h-3" /> {usernameCheck.message || '¡Disponible!'}
                        </p>
                      )}
                      {usernameCheck.status === 'unavailable' && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3" /> {usernameCheck.message}
                        </p>
                      )}
                      {usernameCheck.status === 'idle' && (
                        <p className="text-[11px] text-stone-500 dark:text-slate-500 leading-tight">
                          Identificador único para que otros lectores puedan encontrarte.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#fbf6ea]/70 dark:bg-[#141A26] p-3 text-xs text-stone-600 dark:text-slate-400 flex flex-col justify-center">
                      <span className="font-semibold text-stone-800 dark:text-slate-200">¿Quieres tu @usuario único?</span>
                      <p className="text-[11px] mt-0.5">
                        Inicia sesión con tu cuenta para reservar tu nombre de usuario y compartir lecturas con amigos.
                      </p>
                    </div>
                  )}
                </div>

                {/* Biografía / Gustos de lectura */}
                {currentUser && (
                  <div className="space-y-1.5">
                    <label htmlFor="input-bio" className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                      Cita o Biografía Literaria (opcional)
                    </label>
                    <textarea
                      id="input-bio"
                      rows={2}
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Ej: Lector empedernido de clásicos, novelas de misterio, filosofía y fantasía oscura..."
                      maxLength={200}
                      className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0e1420] p-3 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none shadow-xs transition resize-none"
                    />
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-500">
                      <span>Aparece estampada en tu Carnet de Lector y perfil comunitario.</span>
                      <span>{profileBio.length} / 200</span>
                    </div>
                  </div>
                )}

                {/* Selector de Privacidad de la Estantería */}
                {currentUser && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                      Privacidad de tu estantería y lecturas
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Opción 1: Público */}
                      <button
                        type="button"
                        onClick={() => setProfileVisibility('public')}
                        className={`flex flex-col text-left p-3.5 rounded-xl border transition ${
                          profileVisibility === 'public'
                            ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/30'
                            : 'border-amber-900/15 dark:border-[#242E42] bg-white dark:bg-[#141A26] hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-slate-100">
                            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Público
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              profileVisibility === 'public'
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-stone-400 dark:border-stone-600'
                            }`}
                          >
                            {profileVisibility === 'public' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-tight">
                          Cualquier lector de la comunidad puede explorar tu estantería y ver tus libros.
                        </p>
                      </button>

                      {/* Opción 2: Solo amigos */}
                      <button
                        type="button"
                        onClick={() => setProfileVisibility('friends')}
                        className={`flex flex-col text-left p-3.5 rounded-xl border transition ${
                          profileVisibility === 'friends'
                            ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-500/15 ring-2 ring-sky-500/30'
                            : 'border-amber-900/15 dark:border-[#242E42] bg-white dark:bg-[#141A26] hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-slate-100">
                            <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            Solo amigos
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              profileVisibility === 'friends'
                                ? 'border-sky-600 bg-sky-600 text-white'
                                : 'border-stone-400 dark:border-stone-600'
                            }`}
                          >
                            {profileVisibility === 'friends' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-tight">
                          Tu perfil es visible en la comunidad, pero solo tus amigos aceptados pueden ver tus libros.
                        </p>
                      </button>

                      {/* Opción 3: Privado */}
                      <button
                        type="button"
                        onClick={() => setProfileVisibility('private')}
                        className={`flex flex-col text-left p-3.5 rounded-xl border transition ${
                          profileVisibility === 'private'
                            ? 'border-amber-700 dark:border-amber-400 bg-amber-500/10 dark:bg-amber-500/15 ring-2 ring-amber-500/30'
                            : 'border-amber-900/15 dark:border-[#242E42] bg-white dark:bg-[#141A26] hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-slate-100">
                            <Lock className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                            Privado
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              profileVisibility === 'private'
                                ? 'border-stone-600 dark:border-stone-400 bg-stone-700 dark:bg-stone-300 text-white dark:text-slate-900'
                                : 'border-stone-400 dark:border-stone-600'
                            }`}
                          >
                            {profileVisibility === 'private' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-tight">
                          Nadie puede ver tus libros ni tu estantería. Solo verán tu @usuario para agregarte.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 text-xs shadow-md transition"
                  >
                    {isSavingProfile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {isSavingProfile ? 'Guardando...' : 'Guardar Credencial de Lector'}
                  </button>
                </div>
              </form>
            </div>

            {/* Información amigable de sincronización */}
            {currentUser ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Tu colección está al día en la nube</span>
                </div>
                <p className="text-stone-600 dark:text-slate-400 leading-relaxed pl-6">
                  Tus <strong>{books.length} libros</strong> y <strong>{sagas.length} sagas</strong> están
                  guardados de forma segura. Si abres Nexus Library en tu teléfono móvil o en otro
                  ordenador e inicias sesión, encontrarás exactamente la misma biblioteca.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/60 dark:bg-[#101520] p-4 text-xs space-y-2">
                <span className="font-semibold text-stone-800 dark:text-slate-200 block">
                  ¿Por qué vincular una cuenta gratuita?
                </span>
                <ul className="space-y-1 text-stone-600 dark:text-slate-400 list-disc list-inside leading-relaxed">
                  <li>Tus lecturas y notas estarán protegidas si limpias el navegador o cambias de equipo.</li>
                  <li>Podrás consultar tu catálogo y añadir libros desde cualquier dispositivo (móvil, tablet o PC).</li>
                  <li>Tus datos son completamente privados y solo tú puedes acceder a ellos.</li>
                </ul>
              </div>
            )}

            {/* Modal de selección de Sello Heráldico / Avatar */}
            <AvatarPickerModal
              isOpen={isAvatarModalOpen}
              onClose={() => setIsAvatarModalOpen(false)}
              currentAvatarUrl={currentUser ? (userProfile?.avatarUrl ?? null) : guestAvatar}
              displayName={profileDisplayName}
              username={profileUsername}
              onSaveAvatar={handleAvatarSelect}
            />

            {/* Modal de Exportación Oficial de Carnet */}
            <ShareReaderCardModal
              isOpen={isExportCarnetOpen}
              onClose={() => setIsExportCarnetOpen(false)}
              displayName={profileDisplayName}
              username={profileUsername}
              avatarUrl={currentUser ? (userProfile?.avatarUrl ?? null) : guestAvatar}
              bio={profileBio}
              memberId={currentUser?.id}
              totalBooks={books.length}
              readBooks={books.filter((b) => b.progreso && b.progreso.includes('Leído')).length}
              totalSagas={sagas.length}
              onShowToast={(msg, type) =>
                setFeedback({ type: type === 'error' ? 'error' : 'success', text: msg })
              }
            />
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 3: PORTADAS Y METADATOS ════════════════════ */}
      {activeTab === 'metadata' && (
        <div className="space-y-6">
          <div className="rounded-2xl editorial-card-surface p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Portadas y Datos de Libros
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 leading-relaxed">
                Completa automáticamente las portadas que falten y añade detalles como la sinopsis,
                editorial, fecha de publicación e ISBN buscando en los catálogos bibliográficos oficiales.
              </p>
            </div>

            {/* Grid con las dos tarjetas asistidas: Portadas y Sinopsis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta 1: Portadas de Libros */}
              <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-5 flex flex-col justify-between gap-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-stone-600 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                      <ImageIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      Portadas de Libros
                    </span>
                    <span className="rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-bold px-2 py-0.5">
                      {coverPercentage}%
                    </span>
                  </div>

                  <div>
                    <span className="font-serif text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-300">
                      {booksWithCoversCount} de {books.length}
                    </span>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                      libros con portada registrada
                    </p>
                  </div>

                  {/* Barra de progreso */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                        style={{ width: `${coverPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-400">
                      <span>{booksWithCoversCount} con portada</span>
                      <span>{booksMissingCovers.length} sin portada</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setBatchModalConfig({ isOpen: true, mode: 'covers' })}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {booksMissingCovers.length === 0
                      ? 'Revisar portadas del catálogo'
                      : `Completar portadas (${booksMissingCovers.length} faltantes)`}
                  </span>
                </button>
              </div>

              {/* Tarjeta 2: Sinopsis & Argumentos */}
              <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-5 flex flex-col justify-between gap-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-stone-600 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                      <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      Sinopsis & Argumentos
                    </span>
                    <span className="rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-bold px-2 py-0.5">
                      {synopsisPercentage}%
                    </span>
                  </div>

                  <div>
                    <span className="font-serif text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-300">
                      {booksWithSynopsisCount} de {books.length}
                    </span>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                      libros con sinopsis registrada
                    </p>
                  </div>

                  {/* Barra de progreso */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                        style={{ width: `${synopsisPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-400">
                      <span>{booksWithSynopsisCount} con sinopsis</span>
                      <span>{booksMissingSynopsis.length} sin sinopsis</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setBatchModalConfig({ isOpen: true, mode: 'synopsis' })}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {booksMissingSynopsis.length === 0
                      ? 'Revisar sinopsis del catálogo'
                      : `Completar sinopsis (${booksMissingSynopsis.length} faltantes)`}
                  </span>
                </button>
              </div>
            </div>


            {onOpenEpubImport && (
              <div className="rounded-xl border border-amber-600/35 dark:border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-[#f4ebd6] to-[#efe3c8] dark:from-amber-500/10 dark:via-[#161E2E] dark:to-[#101520] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-600/30 shrink-0 mt-0.5">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                      Cargar Libros desde Archivos (.epub, .fb2, .pdf)
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 leading-relaxed max-w-xl">
                      Sube uno o varios archivos de libros desde tu ordenador o móvil. Nexus Library lee sus metadatos internos para rellenar título, autor, portada original, sinopsis, páginas y saga automáticamente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenEpubImport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-md shrink-0"
                >
                  <FileUp className="w-4 h-4" /> Subir archivos (.epub)
                </button>
              </div>
            )}

            {/* Blindaje de almacenamiento en el navegador */}
            <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/70 dark:bg-[#101520] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-slate-100">
                    Protección de datos en este equipo
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                    {isPersisted
                      ? 'Activado: Tu navegador no borrará tu biblioteca aunque quede poco espacio en disco.'
                      : 'Protege tu biblioteca local contra limpiezas automáticas de archivos temporales del navegador.'}
                  </p>
                </div>
              </div>

              {!isPersisted && (
                <button
                  type="button"
                  onClick={handleRequestStorage}
                  className="rounded-xl border border-amber-900/25 dark:border-slate-700 hover:border-amber-500 bg-[#fffcf5] dark:bg-[#0D1017] px-3.5 py-2 text-xs font-semibold text-stone-800 dark:text-slate-200 transition shrink-0"
                >
                  Activar protección
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 4: COPIAS DE SEGURIDAD ════════════════════ */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="rounded-2xl editorial-card-surface p-5 sm:p-6 space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Copias de Seguridad y
                Portabilidad
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 leading-relaxed">
                Tus lecturas te pertenecen. Puedes guardar una copia completa de seguridad para conservarla
                en tu ordenador o exportar tus libros para abrirlos en una hoja de cálculo.
              </p>
            </div>


            {onOpenEpubImport && (
              <div className="rounded-xl border border-amber-600/35 dark:border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-[#f4ebd6] to-[#efe3c8] dark:from-amber-500/10 dark:via-[#161E2E] dark:to-[#101520] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-600/30 shrink-0 mt-0.5">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                      Cargar Libros desde Archivos (.epub, .fb2, .pdf)
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 leading-relaxed max-w-xl">
                      Sube uno o varios archivos de libros desde tu ordenador o móvil. Nexus Library lee sus metadatos internos para rellenar título, autor, portada original, sinopsis, páginas y saga automáticamente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenEpubImport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-md shrink-0"
                >
                  <FileUp className="w-4 h-4" /> Subir archivos (.epub)
                </button>
              </div>
            )}

            {/* Opciones de Exportación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                    <FileCode className="w-4 h-4" />
                    <span>Copia Completa de Seguridad (JSON)</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                    Guarda toda tu biblioteca con libros, sagas, fechas de lectura, valoraciones y
                    notas personales. Es el formato ideal para restaurar tu colección en cualquier momento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition shadow-sm w-full"
                >
                  <Download className="w-4 h-4" /> Descargar Copia ({books.length} libros)
                </button>
              </div>

              <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-sm">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Hoja de Cálculo (Excel / CSV)</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                    Genera una tabla con tus títulos, autores, fechas, géneros y estados de lectura.
                    Compatible con Microsoft Excel, Google Sheets y Notion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/40 dark:border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-bold px-4 py-2 text-xs transition shadow-sm w-full"
                >
                  <Download className="w-4 h-4" /> Exportar a Excel / CSV
                </button>
              </div>
            </div>

            {/* Importación desde Goodreads o StoryGraph */}
            <div className="rounded-xl border border-amber-600/40 dark:border-amber-500/40 bg-gradient-to-br from-[#f8f0dc] via-[#f4ead4] to-[#ede0c4] dark:from-[#171F2F] dark:via-[#141A26] dark:to-[#101520] p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-serif text-base font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    Migrar desde Goodreads o StoryGraph
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed max-w-xl">
                    Importa tu archivo <code>goodreads_library_export.csv</code>. Traspasaremos todos tus libros, puntuaciones con estrellas, estados de lectura, fechas y reseñas personales agrupando tus sagas automáticamente.
                  </p>
                </div>
                <label className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition cursor-pointer shrink-0 active:scale-95">
                  <Upload className="w-4 h-4" /> Importar CSV de Goodreads
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportCsvFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Restauración de archivo */}
            <div className="rounded-xl border border-dashed border-amber-900/30 dark:border-[#283246] bg-[#f4ebd6]/50 dark:bg-[#101520] p-5 text-center space-y-3">
              <Upload className="w-8 h-8 mx-auto text-amber-700 dark:text-amber-400" />
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                  Restaurar desde archivo de copia
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Selecciona un archivo <code>.json</code> descargado previamente. Nexus Library añadirá
                  los libros y sagas sin sobreescribir ni duplicar los que ya tengas guardados.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" /> Seleccionar archivo de copia (.json)
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleRestoreJsonFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Resumen amigable de almacenamiento en este dispositivo */}
            <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/70 dark:bg-[#101520] p-4 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span className="font-semibold text-stone-800 dark:text-slate-200">
                  Almacenamiento en este equipo:
                </span>
                <span className="text-stone-600 dark:text-slate-400">
                  <strong>{books.length} libros</strong> y <strong>{sagas.length} sagas</strong> guardados
                  para leer en cualquier momento, incluso sin conexión a internet.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 5: INSTALACIÓN Y APP (PWA) ════════════════════ */}
      {activeTab === 'app' && (
        <div className="space-y-6">
          <div className="rounded-2xl editorial-card-surface p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#222B3C] pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Instalación y Aplicación
                </h2>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                  Usa Nexus Library en tu teléfono, tableta u ordenador como una app nativa independiente.
                </p>
              </div>

              {pwaState.isInstalled ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Modo App Activo
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto">
                  <Globe className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  Navegador Web
                </div>
              )}
            </div>

            {/* Ventajas PWA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="rounded-2xl border border-amber-900/15 dark:border-[#232C3F] bg-white/60 dark:bg-[#111623] p-4 space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-white">
                  Pantalla Completa
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                  Sin barras del navegador ni distracciones. Tu biblioteca luce exactamente como una app nativa.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-900/15 dark:border-[#232C3F] bg-white/60 dark:bg-[#111623] p-4 space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <WifiOff className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-white">
                  Lectura Sin Conexión
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                  Tus libros, notas y estanterías están guardados en tu dispositivo para consultarlos sin internet.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-900/15 dark:border-[#232C3F] bg-white/60 dark:bg-[#111623] p-4 space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Flame className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-white">
                  Acceso en 1 Toque
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                  Directamente desde tu pantalla de inicio o dock, con arranque instantáneo y memoria eficiente.
                </p>
              </div>
            </div>

            {/* Acción principal de instalación */}
            {pwaState.isInstalled ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h3 className="font-serif text-base font-bold text-emerald-950 dark:text-emerald-200">
                  Nexus Library ya está instalada en tu dispositivo
                </h3>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 max-w-md mx-auto">
                  Puedes abrirla en cualquier momento desde el icono de tu pantalla de inicio, escritorio o lista de aplicaciones.
                </p>
              </div>
            ) : pwaState.canPrompt ? (
              <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10 p-5 sm:p-6 text-center space-y-3">
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                  ¿Listo para instalar Nexus Library?
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 max-w-md mx-auto">
                  Tu navegador permite instalar la aplicación con un solo clic, sin descargas pesadas ni tiendas de terceros.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleInstallPwa}
                    disabled={isInstallingPwa}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold px-6 py-3.5 text-sm shadow-lg shadow-amber-900/15 dark:shadow-amber-500/15 transition active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstallingPwa ? 'Instalando...' : 'Instalar Nexus Library Ahora'}</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Tarjeta de Notificaciones Push en este dispositivo */}
            <div className="rounded-2xl border border-amber-900/15 dark:border-[#222B3C] bg-white/70 dark:bg-[#111623] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#20293B] pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                      Notificaciones Push en este dispositivo
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                      Recibe alertas instantáneas en tu móvil u ordenador cuando un amigo te envíe una solicitud de amistad o te recomiende un libro, incluso con la aplicación cerrada.
                    </p>
                  </div>
                </div>

                {/* Badge de estado actual */}
                {pushStatus?.isSubscribed ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-semibold shrink-0 self-start sm:self-auto">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Activas
                  </div>
                ) : pushStatus?.permission === 'denied' ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 px-3.5 py-1.5 text-xs font-semibold shrink-0 self-start sm:self-auto">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    Bloqueadas
                  </div>
                ) : !pushStatus?.supported ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 text-xs font-semibold shrink-0 self-start sm:self-auto">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    No Soportadas
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-stone-500/15 border border-stone-500/30 text-stone-700 dark:text-stone-300 px-3.5 py-1.5 text-xs font-semibold shrink-0 self-start sm:self-auto">
                    <BellOff className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                    Inactivas
                  </div>
                )}
              </div>

              {/* Aviso específico para iPhone / iPad si corresponde */}
              {pushStatus?.isIos && !pushStatus.isIosStandalone && (
                <div className="rounded-xl border border-amber-600/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
                  <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Aviso para iPhone e iPad (iOS / iPadOS):</p>
                    <p className="leading-relaxed opacity-90">
                      Apple requiere que añadas primero la web a tu Pantalla de Inicio (toca el botón Compartir <Share className="w-3.5 h-3.5 inline mx-0.5" /> y selecciona <strong>"Añadir a pantalla de inicio"</strong>) para poder recibir notificaciones Push con la aplicación cerrada.
                    </p>
                  </div>
                </div>
              )}

              {pushStatus?.permission === 'denied' && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-3 text-xs text-rose-950 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Permiso de notificaciones bloqueado</p>
                    <p className="leading-relaxed opacity-90">
                      Has bloqueado los permisos de notificación en este navegador. Para activarlas, abre la configuración de permisos del sitio en tu navegador y selecciona "Permitir notificaciones".
                    </p>
                  </div>
                </div>
              )}

              {/* Botón de acción */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  {pushStatus?.isSubscribed
                    ? 'Este navegador está suscrito y listo para recibir alertas cuando te envíen solicitudes o recomendaciones.'
                    : 'Puedes activar o desactivar las notificaciones de forma independiente en cada uno de tus dispositivos.'}
                </p>

                <button
                  type="button"
                  onClick={handleTogglePushNotifications}
                  disabled={isPushLoading || !pushStatus?.supported}
                  className={
                    'inline-flex items-center justify-center gap-2 rounded-xl font-bold px-4 py-2.5 text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 ' +
                    (pushStatus?.isSubscribed
                      ? 'border border-amber-900/20 dark:border-[#2A344A] bg-stone-200/60 dark:bg-[#1A2232] text-stone-800 dark:text-slate-200 hover:bg-rose-500/15 hover:text-rose-700 dark:hover:text-rose-300'
                      : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 shadow-md shadow-amber-900/15')
                  }
                >
                  {isPushLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : pushStatus?.isSubscribed ? (
                    <BellOff className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  <span>
                    {isPushLoading
                      ? 'Actualizando...'
                      : pushStatus?.isSubscribed
                      ? 'Desactivar en este dispositivo'
                      : 'Activar Notificaciones Push'}
                  </span>
                </button>
              </div>
            </div>

            {/* Guía paso a paso por plataforma */}
            <div className="space-y-4 pt-2">
              <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-700 dark:text-amber-400" /> Cómo instalarla según tu dispositivo
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* iOS Safari */}
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-4 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-xs text-stone-900 dark:text-white">
                    <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="space-y-2 text-xs text-stone-600 dark:text-slate-400 list-decimal list-inside leading-relaxed">
                    <li>
                      Abre este enlace en <span className="font-semibold text-stone-800 dark:text-slate-200">Safari</span>.
                    </li>
                    <li>
                      Pulsa el botón <span className="font-semibold inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><Share className="w-3.5 h-3.5 inline" /> Compartir</span> en la barra inferior.
                    </li>
                    <li>
                      Selecciona <span className="font-semibold text-stone-800 dark:text-slate-200 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline text-amber-700 dark:text-amber-400" /> «Añadir a pantalla de inicio»</span>.
                    </li>
                  </ol>
                </div>

                {/* Android Chrome */}
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-4 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-xs text-stone-900 dark:text-white">
                    <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Android (Chrome / Edge)</span>
                  </div>
                  <ol className="space-y-2 text-xs text-stone-600 dark:text-slate-400 list-decimal list-inside leading-relaxed">
                    <li>
                      Pulsa el menú de opciones <span className="font-bold text-stone-800 dark:text-slate-200">⋮</span> (arriba a la derecha).
                    </li>
                    <li>
                      Elige <span className="font-semibold text-stone-800 dark:text-slate-200">«Instalar aplicación»</span> o <span className="font-semibold text-stone-800 dark:text-slate-200">«Añadir a pantalla de inicio»</span>.
                    </li>
                    <li>
                      Confirma la instalación y aparecerá en tu cajón de apps.
                    </li>
                  </ol>
                </div>

                {/* Desktop */}
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-4 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-xs text-stone-900 dark:text-white">
                    <Laptop className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Ordenador (PC / Mac)</span>
                  </div>
                  <ol className="space-y-2 text-xs text-stone-600 dark:text-slate-400 list-decimal list-inside leading-relaxed">
                    <li>
                      En Chrome, Edge o Brave, mira al final de la barra de URL.
                    </li>
                    <li>
                      Haz clic en el icono de instalación <span className="font-bold text-amber-700 dark:text-amber-400">⊕</span> o en Menú &gt; Instalar Nexus Library.
                    </li>
                    <li>
                      La app se abrirá en su propia ventana sin pestañas.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Pie de Página Amigable ─── */}
      <div className="rounded-2xl border border-amber-900/15 dark:border-[#222B3C] bg-[#fbf6ea]/70 dark:bg-[#111622] p-5 text-xs text-stone-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-serif font-bold text-stone-800 dark:text-slate-200 text-sm block">
            NEXUS LIBRARY · Tu Biblioteca Personal
          </span>
          <span className="text-[11px] mt-0.5 block">
            Organización de libros, estanterías temáticas y lectura sin distracciones.
          </span>
        </div>
        <div className="text-[11px] text-stone-500 dark:text-slate-500 self-start sm:self-auto shrink-0">
          Versión 1.0.0
        </div>
      </div>

      {/* Modal de confirmación de Cerrar Sesión (sin bloquear el hilo principal / 0ms INP) */}
      {showSignOutConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-dialog-title"
            onClick={() => !isSigningOut && setShowSignOutConfirm(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="signout-dialog-title" className="font-serif text-lg font-bold text-stone-900 dark:text-slate-100">
                    ¿Cerrar sesión?
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400">
                    Tu colección permanecerá sincronizada
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed">
                Todos tus libros, estanterías y notas sincronizados seguirán a salvo en la nube para cuando vuelvas a iniciar sesión.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={() => setShowSignOutConfirm(false)}
                  className="rounded-xl border border-stone-300 dark:border-slate-700 px-4 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleConfirmSignOut}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold px-4 py-2 text-xs transition shadow-sm"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cerrando sesión...
                    </>
                  ) : (
                    'Cerrar sesión'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de completado de metadatos en lote (portadas o sinopsis) */}
      {batchModalConfig?.isOpen && (
        <BatchMetadataModal
          isOpen={batchModalConfig.isOpen}
          mode={batchModalConfig.mode}
          books={books}
          sagas={sagas}
          onClose={() => setBatchModalConfig(null)}
          onNavigateToLibrary={onNavigateToLibrary}
          onCompleted={(updated, total) => {
            setFeedback({
              type: 'success',
              text: `¡Catálogo actualizado! Se completaron con éxito los datos de ${updated} de ${total} libros procesados.`
            });
          }}
        />
      )}
    </div>
  );
};
