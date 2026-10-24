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
  Sun,
  Moon,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Check,
  Info,
  User as UserIcon,
  BookOpen
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

  /* ─────────────────── Enriquecimiento de Portadas ─────────────────── */
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
        // Continuar con el siguiente libro
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    setEnrichProgress(null);
    setIsEnriching(false);
    setFeedback({
      type: 'success',
      text: `¡Catálogo completado! Se han actualizado portadas y datos bibliográficos en ${updatedCount} de ${batch.length} libros.`
    });
  };

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
  const handleSignOut = async () => {
    if (
      !window.confirm(
        '¿Deseas cerrar sesión? Todos tus libros y notas sincronizados seguirán a salvo en la nube para cuando vuelvas a iniciar sesión.'
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
        text: 'Has cerrado sesión. Puedes seguir usando la biblioteca en este equipo o iniciar sesión con otra cuenta.'
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const progressPct = enrichProgress
    ? `${Math.round((enrichProgress.current / enrichProgress.total) * 100)}%`
    : '0%';

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

        {/* ─── Pestañas ─── */}
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
                Elige la estética en la que prefieres disfrutar de tu colección. Nexus Library está
                diseñado especialmente para destacar en el tema claro de papel crema clásico, evocando
                las páginas de un libro tradicional.
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
                        Recomendado / Diseño Principal
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
                    Fondo cálido en papel de lectura, tipografía serif editorial y estanterías de
                    madera para una experiencia natural y sin fatiga visual.
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
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'L'}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center justify-center shadow-sm shrink-0">
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}

                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                    {currentUser?.email || 'Lector en Modo Local'}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                    {currentUser
                      ? 'Tu biblioteca se sincroniza de forma automática y privada con tu cuenta.'
                      : 'Actualmente tus libros se guardan solo en la memoria de este navegador.'}
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
                    <LogIn className="w-4 h-4" /> Iniciar sesión o Crear cuenta
                  </button>
                )}
              </div>
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
                    : `Completar portadas que faltan (${booksMissingCovers.length})`}
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
                      Consultando catálogos de libros...
                    </span>
                    <span>
                      {enrichProgress.current} de {enrichProgress.total} libros procesados
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
    </div>
  );
};
