import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
  Check,
  Timer,
  Clock,
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Book } from '../types/models';
import { BookCover } from './BookCover';
import { soundService } from '../services/soundService';
import {
  updateUserReadingSpeed,
  getUserReadingSpeedPph
} from '../utils/readingTime';
import { useFocusTrap } from '../hooks/useFocusTrap';

export interface ReadingSessionModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onSaveProgress: (bookId: string, newPage: number, totalPages?: number) => Promise<void>;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type SessionMode = 'stopwatch' | 'pomodoro';

export const ReadingSessionModal: React.FC<ReadingSessionModalProps> = ({
  book,
  isOpen,
  onClose,
  onSaveProgress,
  onShowToast
}) => {
  const initialPage = book.paginaActual || 0;
  const totalPages = book.paginas || 0;

  const [mode, setMode] = useState<SessionMode>('stopwatch');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [pomodoroSecondsRemaining, setPomodoroSecondsRemaining] = useState<number>(25 * 60);
  const [isAmbientSoundActive, setIsAmbientSoundActive] = useState<boolean>(false);

  // Pantalla de cierre para registrar páginas
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [endPage, setEndPage] = useState<number>(initialPage);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  // Trampa de foco y accesibilidad
  const focusTrapRef = useFocusTrap({
    isOpen,
    onClose: () => handleClosePrompt()
  });

  // Limpiar sonido ambiente al desmontar
  useEffect(() => {
    return () => {
      soundService.stopAmbientLibrarySound();
    };
  }, []);

  // Manejo de sonido ambiente
  const toggleAmbientSound = () => {
    if (isAmbientSoundActive) {
      soundService.stopAmbientLibrarySound();
      setIsAmbientSoundActive(false);
    } else {
      soundService.startAmbientLibrarySound();
      setIsAmbientSoundActive(true);
    }
  };

  // Cronómetro / Pomodoro ticker
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);

        if (mode === 'pomodoro') {
          setPomodoroSecondsRemaining((prev) => {
            if (prev <= 1) {
              // Fin del Pomodoro de 25 min
              soundService.playBrassBell(true);
              setIsRunning(false);
              onShowToast?.('🔔 ¡Campana de biblioteca! Has completado tus 25 minutos de Pomodoro.', 'info');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, mode, onShowToast]);

  const handleToggleTimer = () => {
    if (!isRunning) {
      soundService.playPageTurn(true);
    }
    setIsRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setSecondsElapsed(0);
    setPomodoroSecondsRemaining(25 * 60);
  };

  const handleSwitchMode = (nextMode: SessionMode) => {
    if (nextMode === mode) return;
    setIsRunning(false);
    setMode(nextMode);
    if (nextMode === 'pomodoro') {
      setPomodoroSecondsRemaining(25 * 60);
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  };

  const displayTime =
    mode === 'stopwatch'
      ? formatTime(secondsElapsed)
      : formatTime(pomodoroSecondsRemaining);

  const durationMinutes = secondsElapsed / 60;
  const pagesReadInSession = Math.max(0, endPage - initialPage);
  const currentSpeed = getUserReadingSpeedPph();
  const sessionSpeed = durationMinutes >= 0.5 ? Math.round((pagesReadInSession / durationMinutes) * 60) : 0;

  const handleFinishPrompt = () => {
    setIsRunning(false);
    setIsFinishing(true);
  };

  const handleClosePrompt = () => {
    if (secondsElapsed > 15 && !isFinishing) {
      if (window.confirm('¿Deseas finalizar y guardar esta sesión de lectura antes de salir?')) {
        handleFinishPrompt();
        return;
      }
    }
    soundService.stopAmbientLibrarySound();
    onClose();
  };

  const handleConfirmSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      await onSaveProgress(book.id, endPage, totalPages > 0 ? totalPages : undefined);

      if (pagesReadInSession > 0 && durationMinutes >= 3) {
        const newSpeed = updateUserReadingSpeed(pagesReadInSession, durationMinutes);
        onShowToast?.(
          `⏱️ Sesión guardada: ${pagesReadInSession} pág. en ${Math.round(durationMinutes)} min. Tu velocidad media es de ~${newSpeed} p/h.`,
          'success'
        );
      } else {
        onShowToast?.(
          `⏱️ Sesión guardada: pág. ${endPage} de ${book.nombre}.`,
          'success'
        );
      }

      soundService.stopAmbientLibrarySound();
      soundService.playWaxSeal(true);
      onClose();
    } catch (err) {
      console.error('Error al guardar sesión:', err);
      onShowToast?.('Hubo un error al registrar el progreso de lectura', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-session-title"
    >
      <div
        ref={focusTrapRef as React.RefObject<HTMLDivElement>}
        className="w-full max-w-lg rounded-2xl border border-amber-900/30 dark:border-amber-400/25 bg-gradient-to-b from-[#fbf5e7] via-[#f7eed8] to-[#efe2c5] dark:from-[#171e2c] dark:via-[#121824] dark:to-[#0d121c] text-stone-900 dark:text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Cabecera ceremonial de la sesión */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-amber-900/20 dark:border-amber-400/15 bg-amber-500/10 dark:bg-amber-400/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/30">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h2 id="reading-session-title" className="font-serif font-bold text-base leading-tight">
                Sesión de Lectura en Vivo
              </h2>
              <p className="text-[11px] text-amber-950/70 dark:text-amber-200/70">
                Reloj de lectura y concentración
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClosePrompt}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            aria-label="Cerrar sesión"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ficha compacta de la obra en curso */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-amber-900/15 dark:border-[#222B3C] bg-white/40 dark:bg-[#101622]/60 flex items-center gap-3.5">
          <div className="w-11 sm:w-12 shrink-0 shadow-md rounded-md overflow-hidden border border-amber-900/20">
            <BookCover
              nombre={book.nombre}
              autor={book.autor}
              portadaUrl={book.portadaUrl}
              portadaFallbackUrl={book.portadaFallbackUrl}
              portadaDataUrl={book.portadaDataUrl}
              size="sm"
              variant="card"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 truncate">
              {book.nombre}
            </h3>
            <p className="font-serif italic text-xs text-stone-600 dark:text-slate-400 truncate">
              {book.autor || 'Autor desconocido'}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-amber-900 dark:text-amber-300 font-medium">
              <span>Página inicial: <strong>{initialPage}</strong></span>
              {totalPages > 0 && <span>de {totalPages} págs</span>}
            </div>
          </div>
        </div>

        {/* Contenido principal: Cronómetro o Registro de Páginas */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
          {!isFinishing ? (
            <>
              {/* Selector de Modo: Cronómetro libre vs Pomodoro 25 min */}
              <div className="flex justify-center">
                <div className="inline-flex rounded-xl border border-amber-900/20 dark:border-[#29354A] bg-[#ebdcc2]/60 dark:bg-[#121926] p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('stopwatch')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      mode === 'stopwatch'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm scale-102'
                        : 'text-stone-700 dark:text-slate-400 hover:text-stone-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Cronómetro libre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('pomodoro')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      mode === 'pomodoro'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm scale-102'
                        : 'text-stone-700 dark:text-slate-400 hover:text-stone-900'
                    }`}
                  >
                    <span>🍅</span>
                    <span>Pomodoro 25m</span>
                  </button>
                </div>
              </div>

              {/* Gran Reloj Ceremonial de Biblioteca */}
              <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border border-amber-900/20 dark:border-[#2A374E] bg-gradient-to-b from-[#fffcf5] to-[#f4ebd6] dark:from-[#111724] dark:to-[#0c101a] shadow-inner">
                {/* Indicador de estado */}
                <div className="mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      isRunning
                        ? 'border-emerald-600/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 animate-pulse'
                        : secondsElapsed > 0
                        ? 'border-amber-600/40 bg-amber-500/15 text-amber-900 dark:text-amber-300'
                        : 'border-stone-400/30 bg-stone-500/10 text-stone-600 dark:text-slate-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{isRunning ? 'Lectura en curso...' : secondsElapsed > 0 ? 'Sesión pausada' : 'Listo para leer'}</span>
                  </span>
                </div>

                {/* Display numérico */}
                <div className="font-mono text-5xl sm:text-6xl font-bold tracking-tight text-amber-950 dark:text-amber-200 drop-shadow-sm select-none my-1">
                  {displayTime}
                </div>

                <div className="text-[11px] font-serif text-stone-500 dark:text-slate-400 mt-1">
                  {mode === 'stopwatch'
                    ? `${Math.round(secondsElapsed / 60)} min acumulados`
                    : `${Math.round(pomodoroSecondsRemaining / 60)} min restantes`}
                </div>
              </div>

              {/* Controles de Acción: Iniciar / Pausar / Reiniciar */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleTimer}
                  className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all duration-150 transform active:scale-95 flex items-center gap-2 cursor-pointer ${
                    isRunning
                      ? 'border border-amber-700/50 bg-amber-600 hover:bg-amber-700 text-white'
                      : 'border border-amber-600/60 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pausar sesión</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{secondsElapsed > 0 ? 'Reanudar lectura' : 'Iniciar lectura'}</span>
                    </>
                  )}
                </button>

                {secondsElapsed > 0 && (
                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="p-3 rounded-xl border border-amber-900/20 dark:border-[#2A374E] bg-white/70 dark:bg-[#151D2C] hover:bg-amber-500/10 text-stone-700 dark:text-slate-300 transition cursor-pointer"
                    title="Reiniciar cronómetro a 00:00"
                    aria-label="Reiniciar cronómetro"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Barra de utilidades: Sonido ambiental de biblioteca */}
              <div className="flex items-center justify-between pt-3 border-t border-amber-900/15 dark:border-[#222B3C] text-xs">
                <button
                  type="button"
                  onClick={toggleAmbientSound}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                    isAmbientSoundActive
                      ? 'border-amber-600 bg-amber-500/20 text-amber-950 dark:text-amber-200 font-bold'
                      : 'border-amber-900/20 dark:border-[#283246] bg-white/60 dark:bg-[#141B28] text-stone-700 dark:text-slate-400 hover:border-amber-600/40'
                  }`}
                >
                  {isAmbientSoundActive ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 animate-pulse" />
                      <span>Ambiente activo</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-stone-500" />
                      <span>Sonido biblioteca</span>
                    </>
                  )}
                </button>

                <div className="text-[11px] text-stone-500 dark:text-slate-400 font-serif">
                  Tu velocidad habitual: <strong className="text-amber-900 dark:text-amber-300">~{Math.round(currentSpeed)} p/h</strong>
                </div>
              </div>

              {/* Botón protagonista para Finalizar sesión */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFinishPrompt}
                  className="w-full py-3 px-4 rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-500/20 via-[#f4ead4] to-amber-500/25 dark:from-amber-500/10 dark:via-[#161D2B] dark:to-amber-500/15 hover:border-amber-600 text-amber-950 dark:text-amber-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Finalizar sesión de lectura</span>
                </button>
              </div>
            </>
          ) : (
            /* Pantalla 2: ¿En qué página te has quedado? */
            <form onSubmit={handleConfirmSave} className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-2xl">📖</span>
                <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-slate-100">
                  ¿En qué página te has quedado?
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400">
                  Has leído durante <strong>{Math.max(1, Math.round(durationMinutes))} minutos</strong>.
                </p>
              </div>

              {/* Campo para ingresar la página final */}
              <div className="p-4 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf5e6]/80 dark:bg-[#101520] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600 dark:text-slate-400 font-medium">Página inicial:</span>
                  <span className="font-bold text-stone-800 dark:text-slate-200">{initialPage}</span>
                </div>

                <div className="space-y-1">
                  <label htmlFor="reading-session-end-page" className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                    Página actual alcanzada:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="reading-session-end-page"
                      type="number"
                      min={0}
                      max={totalPages > 0 ? totalPages : 99999}
                      value={endPage}
                      onChange={(e) => setEndPage(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      autoFocus
                      required
                      className="flex-1 px-3 py-2 text-lg font-bold rounded-lg border border-amber-900/30 dark:border-[#283246] bg-white dark:bg-[#161D2C] text-stone-900 dark:text-white text-center focus:border-amber-600 focus:outline-hidden"
                    />
                    {totalPages > 0 && (
                      <span className="text-xs text-stone-500 dark:text-slate-400">
                        / {totalPages}
                      </span>
                    )}
                  </div>
                </div>

                {/* Métricas automáticas de la sesión */}
                <div className="pt-2 border-t border-amber-900/10 dark:border-[#20293A] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600 dark:text-slate-400">Páginas avanzadas:</span>
                    <span className="font-bold text-amber-900 dark:text-amber-300">
                      +{pagesReadInSession} {pagesReadInSession === 1 ? 'página' : 'páginas'}
                    </span>
                  </div>

                  {pagesReadInSession > 0 && durationMinutes >= 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600 dark:text-slate-400">Ritmo de esta sesión:</span>
                      <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        ~{sessionSpeed} págs/hora
                      </span>
                    </div>
                  )}

                  {pagesReadInSession > 0 && durationMinutes >= 3 && (
                    <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-600/30 text-[11px] text-amber-950 dark:text-amber-200 flex items-start gap-1.5 mt-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Se actualizará tu velocidad de lectura personalizada para estimaciones más precisas en tu biblioteca.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFinishing(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-slate-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Volver al reloj
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-md transition transform active:scale-98 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar y registrar'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
