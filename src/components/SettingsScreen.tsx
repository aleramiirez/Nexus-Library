import React, { useEffect, useState } from 'react';
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
  Database,
  Sun,
  Moon,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Check,
  Info
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Book, Saga } from '../types/models';
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

export type SettingsTab = 'appearance' | 'account' | 'metadata' | 'backup';

interface SettingsScreenProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  syncResult: SyncMigrationResult | null;
  books: Book[];
  sagas: Saga[];
  initialTab?: SettingsTab;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  darkMode,
  onToggleTheme,
  currentUser,
  onOpenAuthModal,
  onTriggerSync,
  isSyncing,
  syncResult,
  books,
  sagas,
  initialTab = 'appearance'
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Estados de enriquecimiento de portadas
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  // Estados de almacenamiento persistente
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);

  // Mensajes de estado / feedback
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted).catch(() => {});
    }
  }, []);

  const booksMissingCovers = books.filter((b) => !b.portadaUrl);
  const booksWithCoversCount = books.length - booksMissingCovers.length;
  const coverPercentage =
    books.length > 0 ? Math.round((booksWithCoversCount / books.length) * 100) : 100;

  /* ─────────────────── Manejadores de Enriquecimiento ─────────────────── */
  const handleEnrichMissingCovers = async () => {
    if (booksMissingCovers.length === 0 || isEnriching) return;
    setIsEnriching(true);
    setFeedback(null);
    let updatedCount = 0;
    const batch = booksMissingCovers;
    setEnrichProgress({ current: 0, total: batch.length });

    for (let i = 0; i < batch.length; i++) {
      const book = batch[i];
      setEnrichProgress({ current: i + 1, total: batch.length });
      try {
        const match = await bookMetadataService.findBestMatchForBook({
          nombre: book.nombre,
          autor: book.autor,
          isbn: book.isbn
        });

        if (match) {
          await updateBookPartialRecord(book.id, {
            portadaUrl: book.portadaUrl || match.portadaUrl,
            portadaFallbackUrl: book.portadaFallbackUrl || match.portadaFallbackUrl,
            isbn: book.isbn || match.isbn,
            paginas: book.paginas ?? match.paginas,
            fechaPublicacion: book.fechaPublicacion ?? match.fechaPublicacion,
            editorial: book.editorial || match.editorial,
            idioma: book.idioma || match.idioma,
            sinopsis: book.sinopsis || match.sinopsis,
            genero: book.genero || match.suggestedGenre,
            subgeneros:
              book.subgeneros.length > 0 ? book.subgeneros : match.suggestedSubgenres
          });
          updatedCount++;
        }
      } catch {
        // Continuar con el siguiente
      }
      await new Promise((r) => setTimeout(r, 320));
    }

    setEnrichProgress(null);
    setIsEnriching(false);
    setFeedback({
      type: 'success',
      text: `¡Catálogo actualizado! Se completaron portadas y datos bibliográficos en ${updatedCount} de ${batch.length} libros.`
    });
  };

  /* ─────────────────── Almacenamiento Persistente ─────────────────── */
  const handleRequestStorage = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      setFeedback({
        type: 'success',
        text: 'Almacenamiento persistente concedido por el navegador. Tus libros no se borrarán aunque el dispositivo tenga poco espacio.'
      });
    } else {
      setFeedback({
        type: 'info',
        text: 'El navegador gestiona el almacenamiento con la cuota estándar actual.'
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
      a.download = `nexus-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'success',
        text: 'Copia de seguridad completa en formato JSON descargada correctamente.'
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Error al generar la copia de seguridad JSON.'
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
      a.download = `nexus-library-coleccion-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'success',
        text: 'Catálogo de libros exportado a formato CSV (Excel / Hojas de cálculo).'
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Error al generar la exportación en formato CSV.'
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
        text: `Restauración completada: ${addedBooks} libros añadidos (${skippedDuplicates} ya existentes conservados sin sobrescribir).`
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'El archivo JSON de copia no es válido.'
      });
    }
    e.target.value = '';
  };

  /* ─────────────────── Sesión de Usuario ─────────────────── */
  const handleSignOut = async () => {
    if (
      !window.confirm(
        '¿Deseas cerrar sesión en esta cuenta? Los datos locales sincronizados se conservarán de forma segura en tu cuenta en la nube de Supabase.'
      )
    ) {
      return;
    }
    setIsSigningOut(true);
    try {
      await clearLocalCacheOnSignOut();
      await supabase.auth.signOut();
      setFeedback({
        type: 'info',
        text: 'Has cerrado sesión. Puedes continuar usando la biblioteca en modo local o iniciar sesión con otra cuenta.'
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const progressPct = enrichProgress
    ? `${Math.round((enrichProgress.current / enrichProgress.total) * 100)}%`
    : '0%';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ─── Encabezado de Sección ─── */}
      <div className="border-b border-amber-900/20 dark:border-[#242E42] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-600/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-300">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              Ajustes y Configuración
            </h1>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
              Personaliza la apariencia, gestiona tu cuenta en la nube, optimiza portadas y
              asegura tus copias de seguridad.
            </p>
          </div>
        </div>

        {/* ─── Selector de Pestañas ─── */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('appearance');
              setFeedback(null);
            }}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'appearance'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/20'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <Palette className="w-4 h-4" /> Apariencia
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('account');
              setFeedback(null);
            }}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'account'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/20'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <Cloud className="w-4 h-4" /> Cuenta y Nube
            {currentUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('metadata');
              setFeedback(null);
            }}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'metadata'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/20'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <Sparkles className="w-4 h-4" /> Portadas y Catálogo
            {booksMissingCovers.length > 0 && (
              <span className="rounded-full bg-amber-600/20 text-amber-900 dark:text-amber-300 px-1.5 py-0.2 text-[10px] font-bold">
                {booksMissingCovers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('backup');
              setFeedback(null);
            }}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm ' +
              (activeTab === 'backup'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/20'
                : 'border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:border-amber-600/50')
            }
          >
            <HardDrive className="w-4 h-4" /> Copias de Seguridad
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
                Elige la estética en la que prefieres consultar tu colección. El tema claro es el
                diseño principal de NEXUS LIBRARY, inspirado en el papel de lino crema y la encuadernación clásica.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Opción Tema Claro */}
              <div
                onClick={() => {
                  if (darkMode) onToggleTheme();
                }}
                className={
                  'group relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 ' +
                  (!darkMode
                    ? 'border-amber-600 bg-[#fffcf5] shadow-lg shadow-amber-900/10 ring-1 ring-amber-600/30'
                    : 'border-amber-900/20 dark:border-[#283246] bg-[#f4ebd6]/60 dark:bg-[#101520] hover:border-amber-500/50')
                }
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-stone-900">
                        Papel Crema Clásico
                      </h3>
                      <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                        Recomendado / Por defecto
                      </span>
                    </div>
                  </div>
                  {!darkMode && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-0.5">
                      <Check className="w-3 h-3" /> Activo
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-amber-900/15 bg-[#f7f0df] p-3 text-xs text-stone-800 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] font-serif font-bold text-amber-900">
                    <span>Estantería de Lectura</span>
                    <span>★★★★★</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Fondo cálido en papel de lectura, tipografía serif editorial y baldas de roble
                    para una experiencia natural y sin fatiga visual.
                  </p>
                </div>
              </div>

              {/* Opción Tema Oscuro */}
              <div
                onClick={() => {
                  if (!darkMode) onToggleTheme();
                }}
                className={
                  'group relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 ' +
                  (darkMode
                    ? 'border-amber-400 bg-[#0E131E] shadow-xl shadow-black/40 ring-1 ring-amber-400/30'
                    : 'border-amber-900/20 dark:border-[#283246] bg-[#f4ebd6]/60 dark:bg-[#101520] hover:border-amber-500/50')
                }
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-slate-100">
                        Biblioteca Nocturna
                      </h3>
                      <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                        Lectura en penumbra
                      </span>
                    </div>
                  </div>
                  {darkMode && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-0.5">
                      <Check className="w-3 h-3" /> Activo
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-slate-700/60 bg-[#080C15] p-3 text-xs text-slate-200 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] font-serif font-bold text-amber-300">
                    <span>Estantería de Lectura</span>
                    <span>★★★★★</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Fondo pizarra oscuro con acentos de oro brillante y carmesí. Ideal si prefieres
                    leer de noche o reducir el brillo de la pantalla.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/60 dark:bg-[#101520] p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Nexus Library prioriza siempre el tema claro por diseño. Si activas el tema oscuro,
                tu preferencia se recordará de forma persistente en este navegador para futuras visitas.
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
                  <Cloud className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Sincronización en la
                  Nube
                </h2>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                  Respalda tu biblioteca en tiempo real en la nube segura de Supabase.
                </p>
              </div>

              {currentUser ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Conectado a Supabase
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Modo Local Offline
                </div>
              )}
            </div>

            {/* Perfil actual */}
            <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-xl flex items-center justify-center shadow-md">
                  {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'L'}
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                    {currentUser?.email || 'Lector en Modo Local (Invitado)'}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                    {currentUser
                      ? `ID de usuario: ${currentUser.id.slice(0, 18)}...`
                      : 'Tus libros están guardados en el almacenamiento local de este navegador.'}
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
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                    </button>
                    <button
                      type="button"
                      disabled={isSigningOut}
                      onClick={handleSignOut}
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
                    <LogIn className="w-4 h-4" /> Iniciar Sesión / Crear Cuenta en la Nube
                  </button>
                )}
              </div>
            </div>

            {/* Resumen de Sincronización */}
            {syncResult && (
              <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/70 dark:bg-[#101520] p-4 text-xs space-y-2">
                <span className="font-semibold text-stone-800 dark:text-slate-200 block">
                  Último informe de sincronización en la nube:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-600 dark:text-slate-400">
                  <div>
                    Libros remotos: <strong>{syncResult.totalRemoteBooks}</strong>
                  </div>
                  <div>
                    Sagas remotas: <strong>{syncResult.totalRemoteSagas}</strong>
                  </div>
                  <div>
                    Libros migrados: <strong>{syncResult.migratedBooks}</strong>
                  </div>
                  <div>
                    Sagas migradas: <strong>{syncResult.migratedSagas}</strong>
                  </div>
                </div>
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
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Enriquecimiento de
                Portadas y Datos Editoriales
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 leading-relaxed">
                Nexus Library puede consultar automáticamente las bases de datos de{' '}
                <strong>Open Library</strong> y <strong>Google Books</strong> para buscar cubiertas en
                alta resolución, sinopsis oficial, año de publicación e ISBN para los libros que
                agregaste sin portada.
              </p>
            </div>

            {/* Tarjeta de métricas de portadas */}
            <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-stone-600 dark:text-slate-400">
                    Estado de las portadas en tu biblioteca
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-serif text-2xl font-bold text-amber-800 dark:text-amber-300">
                      {booksWithCoversCount} de {books.length} libros con portada
                    </span>
                    <span className="rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-bold px-2 py-0.5">
                      {coverPercentage}%
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isEnriching || booksMissingCovers.length === 0}
                  onClick={handleEnrichMissingCovers}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-md self-start sm:self-auto"
                >
                  {isEnriching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isEnriching
                    ? 'Buscando portadas...'
                    : booksMissingCovers.length === 0
                    ? 'Todas las portadas al día'
                    : `Completar portadas (${booksMissingCovers.length})`}
                </button>
              </div>

              {/* Barra de progreso de cubiertas */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                    style={{ width: `${coverPercentage}%` }}
                  />
                </div>
              </div>

              {/* Barra durante el proceso de autocompletado */}
              {enrichProgress && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
                  <div className="flex justify-between text-xs text-amber-900 dark:text-amber-300 font-semibold">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Consultando Open Library & Google Books...
                    </span>
                    <span>
                      {enrichProgress.current} de {enrichProgress.total} libros
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 dark:bg-amber-400 transition-all"
                      style={{ width: progressPct }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Almacenamiento persistente */}
            <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/70 dark:bg-[#101520] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-slate-100">
                    Almacenamiento Persistente en el Navegador
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                    {isPersisted
                      ? 'Concedido: El navegador no eliminará los datos locales de tu biblioteca por falta de espacio.'
                      : 'Solicita permiso al navegador para blindar la base de datos local contra limpiezas automáticas.'}
                  </p>
                </div>
              </div>

              {!isPersisted && (
                <button
                  type="button"
                  onClick={handleRequestStorage}
                  className="rounded-xl border border-amber-900/25 dark:border-slate-700 hover:border-amber-500 bg-[#fffcf5] dark:bg-[#0D1017] px-3.5 py-2 text-xs font-semibold text-stone-800 dark:text-slate-200 transition shrink-0"
                >
                  Solicitar Persistencia
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
                Tus libros y lecturas te pertenecen. Puedes descargar una copia completa en JSON o
                exportar en formato CSV para abrir tu biblioteca en Excel o Google Sheets.
              </p>
            </div>

            {/* Opciones de Exportación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                    <FileCode className="w-4 h-4" />
                    <span>Copia Completa JSON</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                    Incluye todos los libros, sagas, fechas de inicio y fin, notas y valoraciones.
                    Es el archivo ideal para restaurar tu biblioteca en otro dispositivo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition shadow-sm w-full"
                >
                  <Download className="w-4 h-4" /> Descargar Copia JSON ({books.length} libros)
                </button>
              </div>

              <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-sm">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Hoja de Cálculo CSV</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                    Formato estándar tabular compatible con Microsoft Excel, Google Sheets,
                    Numbers o Notion para analizar tus estadísticas de lectura.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/40 dark:border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-bold px-4 py-2 text-xs transition shadow-sm w-full"
                >
                  <Download className="w-4 h-4" /> Exportar a CSV
                </button>
              </div>
            </div>

            {/* Restauración de archivo */}
            <div className="rounded-xl border border-dashed border-amber-900/30 dark:border-[#283246] bg-[#f4ebd6]/50 dark:bg-[#101520] p-5 text-center space-y-3">
              <Upload className="w-8 h-8 mx-auto text-amber-700 dark:text-amber-400" />
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                  Restaurar Copia de Seguridad JSON
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Selecciona un archivo <code>.json</code> exportado previamente. Nexus Library
                  incorporará los libros sin duplicar los que ya tengas registrados.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" /> Seleccionar archivo JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleRestoreJsonFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Diagnóstico de Base de Datos */}
            <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/70 dark:bg-[#101520] p-4 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span className="font-semibold text-stone-800 dark:text-slate-200">
                  Base de Datos Local Dexie (IndexedDB):
                </span>
                <span className="text-stone-600 dark:text-slate-400">
                  {books.length} libros · {sagas.length} sagas registradas
                </span>
              </div>
              <span className="text-[11px] text-stone-500 dark:text-slate-500">
                NexusLibraryDatabase v2
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Acerca de Nexus Library ─── */}
      <div className="rounded-2xl border border-amber-900/15 dark:border-[#222B3C] bg-[#fbf6ea]/70 dark:bg-[#111622] p-5 text-xs text-stone-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-serif font-bold text-stone-800 dark:text-slate-200 text-sm block">
            NEXUS LIBRARY · v1.0.0
          </span>
          <span className="text-[11px] mt-0.5 block">
            Gestión de biblioteca personal offline-first con sincronización en la nube, catálogos
            bibliográficos y lectura visual.
          </span>
        </div>
        <div className="text-[11px] text-stone-500 dark:text-slate-500 self-start sm:self-auto shrink-0">
          Open Library & Google Books API
        </div>
      </div>
    </div>
  );
};
