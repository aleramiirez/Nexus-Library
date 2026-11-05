import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Timer
} from 'lucide-react';
import { Book } from '../types/models';
import { BookCover, preloadBookCover } from './BookCover';
import { calculateRemainingReadingTime } from '../utils/readingTime';
import '../dashboard-panels.css';

interface DashboardReadingPanelProps {
  readingBooks: Book[];
  onOpenDetail: (bookId: string) => void;
  onNavigateToShelf: () => void;
  onUpdateProgress?: (bookId: string, paginaActual: number, totalPaginas?: number) => Promise<void>;
  onStartReadingSession?: (book: Book) => void;
}

function formatReadingStartDate(fechaInicio?: string, paginas?: number | null): React.ReactNode {
  let dateNode: React.ReactNode = null;
  if (fechaInicio) {
    const parts = fechaInicio.split('-');
    if (parts.length === 3) {
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const day = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
        dateNode = (
          <span>
            Empezaste el <strong className="font-semibold text-stone-900 dark:text-stone-200">{day} de {months[monthIdx]}</strong>
          </span>
        );
      }
    }
    if (!dateNode) {
      dateNode = (
        <span>
          Empezaste el <strong className="font-semibold text-stone-900 dark:text-stone-200">{fechaInicio}</strong>
        </span>
      );
    }
  } else {
    dateNode = <span>Lectura en curso</span>;
  }

  return (
    <span className="inline-flex items-center flex-wrap gap-1">
      {dateNode}
      {paginas && paginas > 0 ? (
        <span className="text-stone-500 dark:text-slate-400">· {paginas} páginas</span>
      ) : null}
    </span>
  );
}

export const DashboardReadingPanel: React.FC<DashboardReadingPanelProps> = ({
  readingBooks,
  onOpenDetail,
  onNavigateToShelf,
  onUpdateProgress,
  onStartReadingSession
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Estado para la edición rápida inline del progreso
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [unitMode, setUnitMode] = useState<'page' | 'percent'>('page');
  const [savedPage, setSavedPage] = useState(0);
  const [draftPage, setDraftPage] = useState(0);
  const [pageInputStr, setPageInputStr] = useState('0');
  const [percentInputStr, setPercentInputStr] = useState('0');
  const [totalPagesInput, setTotalPagesInput] = useState('');
  const [isPopping, setIsPopping] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = readingBooks.length;
  const safeIndex = total > 0 ? Math.min(currentIndex, total - 1) : 0;
  const currentBook = total > 0 ? readingBooks[safeIndex] : null;

  // Sincronizar inputs cuando cambia el libro actual
  useEffect(() => {
    if (currentBook) {
      const pActual = currentBook.paginaActual || 0;
      const pTotal = currentBook.paginas || 0;
      setSavedPage(pActual);
      setDraftPage(pActual);
      setPageInputStr(String(pActual));
      const calculatedPct = pTotal > 0 ? Math.min(100, Math.round((pActual / pTotal) * 100)) : 0;
      setPercentInputStr(String(calculatedPct));
      setTotalPagesInput(pTotal > 0 ? String(pTotal) : '');
      setIsInlineEditing(false);
    }
  }, [currentBook?.id, currentBook?.paginaActual, currentBook?.paginas]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const totalPages = currentBook?.paginas || 0;
  const effectiveTotal = (() => {
    if (totalPagesInput.trim()) {
      const parsed = parseInt(totalPagesInput.trim(), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return totalPages > 0 ? totalPages : 0;
  })();

  const percentage = effectiveTotal > 0 ? Math.min(100, Math.round((draftPage / effectiveTotal) * 100)) : 0;
  const clampedPercent = effectiveTotal > 0
    ? Math.min(100, Math.max(0, (draftPage / effectiveTotal) * 100))
    : draftPage > 0 ? 100 : 0;
  const remainingPages = Math.max(0, effectiveTotal - draftPage);
  const remainingTimeStr = calculateRemainingReadingTime(remainingPages);

  const delta = draftPage - savedPage;
  const deltaText = delta === 0 ? 'sin cambios' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} págs`;

  const updateDraft = (val: number) => {
    const maxVal = effectiveTotal > 0 ? effectiveTotal : 99999;
    const clamped = Math.max(0, Math.min(maxVal, Math.round(val)));
    setDraftPage(clamped);
    setPageInputStr(String(clamped));
    if (effectiveTotal > 0) {
      setPercentInputStr(String(Math.round((clamped / effectiveTotal) * 100)));
    }
  };

  const handleUnitChange = (newMode: 'page' | 'percent') => {
    setUnitMode(newMode);
    if (newMode === 'page') {
      setPageInputStr(String(draftPage));
    } else {
      setPercentInputStr(String(effectiveTotal > 0 ? Math.round((draftPage / effectiveTotal) * 100) : 0));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (unitMode === 'page') {
      setPageInputStr(raw);
      if (raw.trim() !== '') {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) {
          const maxVal = effectiveTotal > 0 ? effectiveTotal : 99999;
          const clamped = Math.max(0, Math.min(maxVal, parsed));
          setDraftPage(clamped);
          if (effectiveTotal > 0) {
            setPercentInputStr(String(Math.round((clamped / effectiveTotal) * 100)));
          }
        }
      }
    } else {
      setPercentInputStr(raw);
      if (raw.trim() !== '') {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && effectiveTotal > 0) {
          const clampedPct = Math.max(0, Math.min(100, parsed));
          const targetP = Math.round((clampedPct / 100) * effectiveTotal);
          setDraftPage(targetP);
          setPageInputStr(String(targetP));
        }
      }
    }
  };

  const handleInputBlur = () => {
    setPageInputStr(String(draftPage));
    if (effectiveTotal > 0) {
      setPercentInputStr(String(Math.round((draftPage / effectiveTotal) * 100)));
    }
  };

  const handleStep = (stepDelta: number) => {
    if (unitMode === 'page') {
      updateDraft(draftPage + stepDelta);
    } else {
      if (effectiveTotal > 0) {
        const curPct = Math.round((draftPage / effectiveTotal) * 100);
        const newPct = Math.max(0, Math.min(100, curPct + stepDelta));
        updateDraft(Math.round((newPct / 100) * effectiveTotal));
      }
    }
  };

  const handleShortcut = (action: number | 'all') => {
    if (action === 'all') {
      updateDraft(effectiveTotal > 0 ? effectiveTotal : draftPage + 100);
    } else {
      updateDraft(draftPage + action);
    }
  };

  const handleCancel = () => {
    updateDraft(savedPage);
    setIsInlineEditing(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentBook || !onUpdateProgress || isSubmitting) return;

    let targetTotal: number | undefined = totalPages > 0 ? totalPages : undefined;
    if (totalPagesInput.trim()) {
      const parsedTotal = parseInt(totalPagesInput.trim(), 10);
      if (!isNaN(parsedTotal) && parsedTotal > 0) {
        targetTotal = parsedTotal;
      }
    }

    const gain = draftPage - savedPage;
    try {
      setIsSubmitting(true);
      await onUpdateProgress(currentBook.id, draftPage, targetTotal);
      setSavedPage(draftPage);
      setIsInlineEditing(false);

      // Sello de lacre hace un pequeño pop de feedback
      setIsPopping(true);
      setTimeout(() => setIsPopping(false), 500);

      // Línea de guardado que se desvanece a los 2,6 s
      const msg = gain > 0 ? `✓ Avance guardado · +${gain} págs hoy` : '✓ Avance guardado';
      setToast({ message: msg, visible: true });
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 2600);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="library-paper-panel h-full flex flex-col justify-between">
      {/* Marcapáginas burdeos colgando */}
      <div className="dashboard-ribbon" aria-hidden="true" />

      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-5 pr-8 sm:pr-10">
        <h2 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span>Leyendo actualmente</span>
        </h2>
        <button
          type="button"
          onClick={onNavigateToShelf}
          className="text-xs font-semibold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:underline transition-colors flex items-center gap-0.5"
        >
          <span>Ver estantería</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Contenido principal */}
      {!currentBook ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-amber-900/20 dark:border-amber-400/20 bg-amber-500/5 my-auto">
          <BookOpen className="w-8 h-8 text-amber-700/60 dark:text-amber-400/60 mb-2" />
          <p className="font-serif text-base text-stone-800 dark:text-stone-200">
            No tienes lecturas en curso
          </p>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 max-w-xs">
            Abre cualquier libro de tu biblioteca y marca su progreso como "Leyendo" para continuar donde lo dejaste.
          </p>
          <button
            type="button"
            onClick={onNavigateToShelf}
            className="mt-3.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition shadow-xs"
          >
            Explorar biblioteca
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div
            onClick={() => onOpenDetail(currentBook.id)}
            onPointerEnter={() => preloadBookCover(currentBook)}
            className="group cursor-pointer flex items-start gap-4 sm:gap-6 p-2 rounded-xl hover:bg-amber-500/5 dark:hover:bg-amber-400/5 transition-all duration-300"
          >
            {/* Portada 3D con canto de hojas */}
            <div className="w-20 sm:w-24 shrink-0 transform group-hover:-translate-y-1 group-hover:rotate-[-1deg] transition-transform duration-300">
              <BookCover
                nombre={currentBook.nombre}
                autor={currentBook.autor}
                portadaUrl={currentBook.portadaUrl}
                portadaFallbackUrl={currentBook.portadaFallbackUrl}
                portadaDataUrl={currentBook.portadaDataUrl}
                size="md"
                variant="book"
              />
            </div>

            {/* Metadatos */}
            <div className="flex-1 min-w-0">
              <div className="mb-1.5">
                <span className="dashboard-reading-badge">
                  <BookOpen className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                  <span>Leyendo</span>
                </span>
              </div>

              <h3 className="font-serif text-lg sm:text-2xl font-bold leading-tight text-stone-900 dark:text-[#f8f5ee] group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors line-clamp-2">
                {currentBook.nombre}
              </h3>

              <p className="font-serif italic text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5 truncate">
                {currentBook.autor}
              </p>

              <div className="text-[11px] sm:text-xs text-stone-600 dark:text-slate-400 mt-2 sm:mt-2.5">
                {formatReadingStartDate(currentBook.fechaInicio, currentBook.paginas)}
              </div>
            </div>
          </div>

          {/* Bloque Editorial de Progreso y Registro de Avance */}
          <div
            className={`rpb-wrap mt-3 sm:mt-4 pt-3 border-t border-amber-900/15 dark:border-[#263147] ${
              isInlineEditing ? 'is-editing' : ''
            }`}
            aria-label="Avance de lectura"
          >
            {/* 1. Cabecera en una sola línea (en móvil, el resumen baja a segunda línea) */}
            <div className="rpb-header">
              <svg
                className="rpb-bookmark-icon"
                viewBox="0 0 16 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M3 2h10v16l-5-4-5 4z" />
              </svg>

              <b>
                Pág. <em>{draftPage}</em> {effectiveTotal > 0 ? <>de <span>{effectiveTotal}</span></> : <>leídas</>}
              </b>

              {effectiveTotal > 0 && <span className="rpb-percent-badge">{percentage}%</span>}

              {effectiveTotal > 0 && (
                <span className="rpb-summary">
                  {remainingPages > 0 ? (
                    <>
                      Faltan {remainingPages} págs · <b>{remainingTimeStr}</b>
                    </>
                  ) : (
                    <b>¡Libro terminado!</b>
                  )}
                </span>
              )}

              {onStartReadingSession && currentBook && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartReadingSession(currentBook);
                  }}
                  className="rpb-timer-btn"
                  title="Iniciar sesión de lectura con cronómetro y velocidad real"
                >
                  <Timer className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span className="hidden sm:inline">⏱️ Iniciar sesión</span>
                  <span className="sm:hidden">⏱️</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isInlineEditing) {
                    handleCancel();
                  } else {
                    setIsInlineEditing(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }
                }}
                className="rpb-btn-ghost"
                aria-expanded={isInlineEditing}
                aria-controls="rpb-compact-panel"
              >
                <span>{isInlineEditing ? 'Cerrar' : '✎ Editar avance'}</span>
              </button>
            </div>

            {/* 2. Barra: pista de 12px con relleno ámbar→dorado, range slider y sello de lacre */}
            <div className="rpb-track">
              <div className="rpb-fill" style={{ width: `${clampedPercent}%` }} />
              <input
                id="rpb-range"
                type="range"
                min={0}
                max={effectiveTotal > 0 ? effectiveTotal : 100}
                step={1}
                value={draftPage}
                onChange={(e) => updateDraft(Number(e.target.value))}
                className="rpb-range-input"
                aria-label="Página actual"
              />
              <div
                className={`rpb-seal ${isPopping ? 'pop' : ''}`}
                style={{ left: `${clampedPercent}%` }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
                  <path d="M0 0h10v12L5 8.500 0 12z" />
                </svg>
              </div>
            </div>

            {/* 4. Panel de edición compacto */}
            <div
              id="rpb-compact-panel"
              className="rpb-edit-panel"
              role="region"
              aria-label="Registro de avance de lectura"
            >
              {/* Selector # Página | % Porcentaje */}
              <div className="rpb-segmented" role="group" aria-label="Unidad">
                <button
                  type="button"
                  onClick={() => handleUnitChange('page')}
                  aria-pressed={unitMode === 'page'}
                >
                  # Página
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitChange('percent')}
                  aria-pressed={unitMode === 'percent'}
                >
                  % Porcentaje
                </button>
              </div>

              {/* Campo con botones - y + */}
              <div className="rpb-input-group">
                <button
                  type="button"
                  onClick={() => handleStep(-1)}
                  className="rpb-step-btn"
                  aria-label="Restar una unidad"
                >
                  −
                </button>
                <input
                  ref={inputRef}
                  id="rpb-number"
                  type="number"
                  inputMode="numeric"
                  value={unitMode === 'page' ? pageInputStr : percentInputStr}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="rpb-number-input"
                  aria-label="Valor actual"
                />
                <span className="rpb-suffix">
                  {unitMode === 'page' ? (effectiveTotal > 0 ? `/ ${effectiveTotal}` : 'págs') : '/ 100 %'}
                </span>
                <button
                  type="button"
                  onClick={() => handleStep(1)}
                  className="rpb-step-btn"
                  aria-label="Sumar una unidad"
                >
                  +
                </button>
              </div>

              {/* Si el libro no tiene total de páginas registrado, permitir introducirlo aquí */}
              {totalPages <= 0 && (
                <div className="rpb-total-field" title="Total de páginas de tu edición">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">Total:</span>
                  <input
                    type="number"
                    min={1}
                    value={totalPagesInput}
                    onChange={(e) => setTotalPagesInput(e.target.value)}
                    placeholder="Ej: 380"
                    aria-label="Total de páginas de la edición"
                  />
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">págs</span>
                </div>
              )}

              {/* Atajos */}
              <div className="rpb-shortcuts">
                <button
                  type="button"
                  onClick={() => handleShortcut(10)}
                  className="rpb-shortcut-btn"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleShortcut(25)}
                  className="rpb-shortcut-btn"
                >
                  +25
                </button>
                <button
                  type="button"
                  onClick={() => handleShortcut(50)}
                  className="rpb-shortcut-btn"
                >
                  +50
                </button>
                <button
                  type="button"
                  onClick={() => handleShortcut('all')}
                  className="rpb-shortcut-btn"
                >
                  Lo terminé
                </button>
              </div>

              {/* Indicador de cambio respecto a lo guardado */}
              <span className="rpb-delta" aria-live="polite">
                {deltaText}
              </span>

              {/* Acciones: Cancelar y Guardar */}
              <div className="rpb-actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rpb-btn-ghost rpb-btn-cancel"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting || delta === 0}
                  className="rpb-btn-ghost rpb-btn-save"
                >
                  {isSubmitting ? 'Guardando...' : '✓ Guardar'}
                </button>
              </div>
            </div>

            {/* 5. Toast de guardado */}
            <div
              className={`rpb-toast ${toast.visible ? 'on' : ''}`}
              aria-live="polite"
            >
              {toast.message}
            </div>
          </div>

          {/* Navegación entre libros si hay más de 1 en lectura */}
          {total > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-amber-900/10 dark:border-amber-400/10 text-xs text-stone-600 dark:text-slate-400">
              <span className="text-[11px] font-medium">
                Libro {safeIndex + 1} de {total} en curso
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
                  }}
                  className="p-1 rounded-md hover:bg-amber-500/15 dark:hover:bg-amber-400/15 text-stone-700 dark:text-stone-300 transition"
                  title="Libro anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
                  }}
                  className="p-1 rounded-md hover:bg-amber-500/15 dark:hover:bg-amber-400/15 text-stone-700 dark:text-stone-300 transition"
                  title="Siguiente libro"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
