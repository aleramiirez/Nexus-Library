import React, { useEffect, useState, useTransition } from 'react';
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
  FileText
} from 'lucide-react';
import { BatchMetadataModal, BatchMetadataMode } from './BatchMetadataModal';
import { User } from '@supabase/supabase-js';
import { Book, Saga, UserProfile, ProfileVisibility } from '../types/models';
import {
  clearLocalCacheOnSignOut,
  requestPersistentStorage,
  restoreBackupPayload,
  SyncMigrationResult,
  updateBookPartialRecord
} from '../db/database';
import { supabase } from '../services/supabaseClient';
import {
  exportLibraryToCsv,
  exportLibraryToJson,
  parseBackupJson
} from '../services/importExportService';
import { bookMetadataService } from '../services/bookMetadataService';
import { profileService } from '../services/profileService';

export type SettingsTab = 'appearance' | 'account' | 'metadata' | 'backup';

interface SettingsScreenProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  currentUser: User | null;
  userProfile?: UserProfile | null;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
  guestAlias?: string;
  onUpdateGuestAlias?: (alias: string) => void;
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

  const handleTabChange = (tab: SettingsTab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
    setFeedback(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  // Estado para el modal de completado en lote (portadas y sinopsis)
  const [batchModalConfig, setBatchModalConfig] = useState<{
    isOpen: boolean;
    mode: BatchMetadataMode;
  } | null>(null);

  // Estados de almacenamiento persistente
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);

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
      setFeedback({ type: 'success', text: 'Alias guardado localmente en este dispositivo.' });
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

  const booksMissingCovers = books.filter((b) => !b.portadaUrl && !b.portadaDataUrl);
  const booksWithCoversCount = books.length - booksMissingCovers.length;
  const coverPercentage =
    books.length > 0 ? Math.round((booksWithCoversCount / books.length) * 100) : 100;

  const booksMissingSynopsis = books.filter((b) => !b.sinopsis || b.sinopsis.trim().length === 0);
  const booksWithSynopsisCount = books.length - booksMissingSynopsis.length;
  const synopsisPercentage =
    books.length > 0 ? Math.round((booksWithSynopsisCount / books.length) * 100) : 100;

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
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'appearance'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/20'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <Palette className="w-4 h-4 shrink-0" /> <span className="truncate">Apariencia</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('account')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'account'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/20'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <Cloud className="w-4 h-4 shrink-0" /> <span className="truncate">Cuenta y Nube</span>
            {currentUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('metadata')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'metadata'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/20'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <Sparkles className="w-4 h-4 shrink-0" /> <span className="truncate">Catálogo</span>
            {booksMissingCovers.length > 0 && (
              <span className="rounded-full bg-amber-600/20 text-amber-900 dark:text-amber-300 px-1.5 py-0.2 text-[10px] font-bold shrink-0">
                {booksMissingCovers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('backup')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'backup'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/20'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <HardDrive className="w-4 h-4 shrink-0" /> <span className="truncate">Copias</span>
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
          <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 sm:p-6 shadow-sm space-y-5">
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
          <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#222B3C] pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Tu Cuenta y la Nube
                </h2>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                  Mantén tus libros, sagas y lecturas respaldados y accesibles desde cualquier lugar.
                </p>
              </div>

              {currentUser ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Copia en la nube activa
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Biblioteca local (este equipo)
                </div>
              )}
            </div>

            {/* Perfil actual */}
            <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {currentUser ? (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-xl flex items-center justify-center shadow-md shrink-0">
                    {userProfile?.displayName
                      ? userProfile.displayName.charAt(0).toUpperCase()
                      : currentUser.email
                      ? currentUser.email.charAt(0).toUpperCase()
                      : 'L'}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center justify-center shadow-sm shrink-0 font-serif font-bold text-xl">
                    {guestAlias ? guestAlias.charAt(0).toUpperCase() : <UserIcon className="w-6 h-6" />}
                  </div>
                )}

                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                    {currentUser
                      ? (userProfile?.displayName || currentUser.email)
                      : (guestAlias ? `${guestAlias} (Modo Local)` : 'Lector en Modo Local')}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                    {currentUser ? (
                      userProfile?.username ? (
                        <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">
                          @{userProfile.username} · {currentUser.email}
                        </span>
                      ) : (
                        currentUser.email
                      )
                    ) : (
                      'Tus libros se guardan solo en la memoria de este navegador.'
                    )}
                  </p>
                </div>
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

            {/* ─── Formulario de Identidad / Perfil de Lector ─── */}
            <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-5 space-y-4">
              <div className="border-b border-amber-900/15 dark:border-[#222B3C] pb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Identidad y Alias de Lector
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                    Define cómo quieres que te conozcan en Nexus Library para cuando busques amigos o compartas recomendaciones.
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
                      className="w-full rounded-xl border border-amber-900/20 dark:border-[#283246] bg-white dark:bg-[#141A26] px-3.5 py-2 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                    <p className="text-[11px] text-stone-500 dark:text-slate-500 leading-tight">
                      Tu nombre personal. Puede incluir espacios, tildes y mayúsculas.
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
                          className="w-full rounded-xl border border-amber-900/20 dark:border-[#283246] bg-white dark:bg-[#141A26] pl-7 pr-3.5 py-2 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
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
                      Biografía o Gustos Literarios (opcional)
                    </label>
                    <textarea
                      id="input-bio"
                      rows={2}
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Ej: Lector empedernido de fantasía épica, ciencia ficción, novelas de misterio y no ficción..."
                      maxLength={200}
                      className="w-full rounded-xl border border-amber-900/20 dark:border-[#283246] bg-white dark:bg-[#141A26] p-3 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                    />
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-500">
                      <span>Visible para otros lectores en tu perfil público.</span>
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
                    {isSavingProfile ? 'Guardando...' : 'Guardar Perfil de Lector'}
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
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 3: PORTADAS Y METADATOS ════════════════════ */}
      {activeTab === 'metadata' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 sm:p-6 shadow-sm space-y-5">
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
          <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 sm:p-6 shadow-sm space-y-6">
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
