import React, { useEffect, useState, useTransition, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings,
  Cloud,
  Palette,
  Sparkles,
  HardDrive,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Info,
  LogOut,
  Loader2
} from 'lucide-react';
import { BatchMetadataModal, BatchMetadataMode } from './BatchMetadataModal';
import { SettingsAccountTab } from './settings/SettingsAccountTab';
import { SettingsAppearanceTab } from './settings/SettingsAppearanceTab';
import { SettingsMetadataTab } from './settings/SettingsMetadataTab';
import { SettingsBackupTab } from './settings/SettingsBackupTab';
import { SettingsAppTab } from './settings/SettingsAppTab';
import { calculateReaderLevel } from '../services/levelingService';
import { User } from '@supabase/supabase-js';
import { Book, Saga, UserProfile } from '../types/models';
import {
  clearLocalCacheOnSignOut,
  importCsvBooks,
  requestPersistentStorage,
  restoreBackupPayload,
  SyncMigrationResult
} from '../db/database';
import { supabase } from '../services/supabaseClient';
import {
  exportLibraryToCsv,
  exportLibraryToJson,
  parseBackupJson,
  parseGoodreadsOrStorygraphCsv
} from '../services/importExportService';
import { pwaInstallService, PwaInstallState } from '../services/pwaInstallService';
import {
  getPushSubscriptionStatus,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  PushSubscriptionStatus
} from '../services/pushNotificationService';
import '../dashboard-panels.css';

export type SettingsTab = 'account' | 'appearance' | 'metadata' | 'backup' | 'app';

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
  onOpenBookDetail?: (book: Book) => void;
  onOpenOrderModal?: () => void;
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
  initialTab = 'account',
  onOpenEpubImport,
  onNavigateToLibrary,
  onOpenBookDetail,
  onOpenOrderModal
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [, startTransition] = useTransition();

  const readerLevelInfo = useMemo(() => calculateReaderLevel(books, sagas), [books, sagas]);

  // Mensajes de estado / feedback
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handleTabChange = useCallback((tab: SettingsTab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
    setFeedback(null);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    }
  }, []);

  // Modal de completado en lote (portadas y sinopsis)
  const [batchModalConfig, setBatchModalConfig] = useState<{
    isOpen: boolean;
    mode: BatchMetadataMode;
  } | null>(null);

  // Almacenamiento persistente
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted).catch(() => {});
    }
  }, []);

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

  // PWA / Instalación
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

  // Notificaciones Push
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

  // Copias de Seguridad
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

  // Sesión de Usuario
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

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

  // Conteo de portadas faltantes para la insignia de la pestaña
  const missingCoversCount = useMemo(
    () => books.filter((b) => !b.portadaUrl && !b.portadaDataUrl).length,
    [books]
  );

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
            onClick={() => handleTabChange('account')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm cursor-pointer ' +
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
            onClick={() => handleTabChange('appearance')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm cursor-pointer ' +
              (activeTab === 'appearance'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Palette className="w-4 h-4 shrink-0 pointer-events-none" /> <span className="truncate pointer-events-none">Apariencia</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('metadata')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm cursor-pointer ' +
              (activeTab === 'metadata'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50 hover:bg-[#fffcf5] dark:hover:bg-[#1a2233]')
            }
          >
            <Sparkles className="w-4 h-4 shrink-0 pointer-events-none" /> <span className="truncate pointer-events-none">Catálogo</span>
            {missingCoversCount > 0 && (
              <span className="rounded-full bg-amber-600/20 text-amber-900 dark:text-amber-300 px-1.5 py-0.2 text-[10px] font-bold shrink-0 pointer-events-none">
                {missingCoversCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('backup')}
            className={
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm cursor-pointer ' +
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
              'inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-sm cursor-pointer ' +
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
            className="text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ════════════════════ TAB 1: CUENTA Y SINCRONIZACIÓN ════════════════════ */}
      {activeTab === 'account' && (
        <SettingsAccountTab
          currentUser={currentUser}
          userProfile={userProfile}
          guestAlias={guestAlias}
          guestAvatar={guestAvatar}
          onUpdateGuestAlias={onUpdateGuestAlias}
          onUpdateGuestAvatar={onUpdateGuestAvatar}
          onUpdateProfile={onUpdateProfile}
          readerLevelInfo={readerLevelInfo}
          books={books}
          sagas={sagas}
          isSyncing={isSyncing}
          isSigningOut={isSigningOut}
          onTriggerSync={onTriggerSync}
          onOpenAuthModal={onOpenAuthModal}
          onSignOutClick={() => setShowSignOutConfirm(true)}
          onOpenOrderModal={onOpenOrderModal}
          onOpenBookDetail={onOpenBookDetail}
          onShowFeedback={setFeedback}
        />
      )}

      {/* ════════════════════ TAB 2: APARIENCIA Y ESTILO ════════════════════ */}
      {activeTab === 'appearance' && (
        <SettingsAppearanceTab
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
        />
      )}

      {/* ════════════════════ TAB 3: PORTADAS Y METADATOS ════════════════════ */}
      {activeTab === 'metadata' && (
        <SettingsMetadataTab
          books={books}
          onOpenEpubImport={onOpenEpubImport}
          isPersisted={isPersisted}
          onRequestStorage={handleRequestStorage}
          onOpenBatchModal={(mode) => setBatchModalConfig({ isOpen: true, mode })}
        />
      )}

      {/* ════════════════════ TAB 4: COPIAS DE SEGURIDAD ════════════════════ */}
      {activeTab === 'backup' && (
        <SettingsBackupTab
          books={books}
          sagas={sagas}
          onOpenEpubImport={onOpenEpubImport}
          onDownloadJson={handleDownloadJson}
          onDownloadCsv={handleDownloadCsv}
          onImportCsvFile={handleImportCsvFile}
          onRestoreJsonFile={handleRestoreJsonFile}
        />
      )}

      {/* ════════════════════ TAB 5: INSTALACIÓN Y APP (PWA) ════════════════════ */}
      {activeTab === 'app' && (
        <SettingsAppTab
          pwaState={pwaState}
          isInstallingPwa={isInstallingPwa}
          onInstallPwa={handleInstallPwa}
          pushStatus={pushStatus}
          isPushLoading={isPushLoading}
          onTogglePushNotifications={handleTogglePushNotifications}
        />
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-dialog-title"
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Cerrar diálogo"
              className="fixed inset-0 bg-black/75 backdrop-blur-[2px] cursor-default border-0 p-0"
              onClick={() => !isSigningOut && setShowSignOutConfirm(false)}
            />
            <div
              className="relative w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-6 space-y-4 shadow-2xl z-10"
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
                  className="rounded-xl border border-stone-300 dark:border-slate-700 px-4 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleConfirmSignOut}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold px-4 py-2 text-xs transition shadow-sm cursor-pointer"
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
