import React, { useState, useEffect } from 'react';
import {
  Clock,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Plus,
  Check,
  X,
  Percent,
  Hash,
  Bookmark
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
  onUpdateProgress
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Estado para la edición rápida inline del progreso
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editMode, setEditMode] = useState<'page' | 'percent'>('page');
  const [pageInputValue, setPageInputValue] = useState('');
  const [percentInputValue, setPercentInputValue] = useState('');
  const [totalPagesInput, setTotalPagesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = readingBooks.length;
  const safeIndex = total > 0 ? Math.min(currentIndex, total - 1) : 0;
  const currentBook = total > 0 ? readingBooks[safeIndex] : null;

  // Sincronizar inputs cuando cambia el libro actual
  useEffect(() => {
    if (currentBook) {
      const pActual = currentBook.paginaActual || 0;
      const pTotal = currentBook.paginas || 0;
      setPageInputValue(String(pActual));
      const calculatedPct = pTotal > 0 ? Math.min(100, Math.round((pActual / pTotal) * 100)) : 0;
      setPercentInputValue(String(calculatedPct));
      setTotalPagesInput(pTotal > 0 ? String(pTotal) : '');
      setIsInlineEditing(false);
    }
  }, [currentBook?.id, currentBook?.paginaActual, currentBook?.paginas]);

  // Cálculos de progreso
  const currentPage = currentBook?.paginaActual || 0;
  const totalPages = currentBook?.paginas || 0;
  const percentage = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
  const remainingPages = Math.max(0, totalPages - currentPage);
  const remainingTimeStr = calculateRemainingReadingTime(remainingPages);

  const handleQuickAdd = async (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (!currentBook || !onUpdateProgress || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const target = totalPages > 0 ? Math.min(totalPages, currentPage + delta) : currentPage + delta;
      await onUpdateProgress(currentBook.id, target, totalPages > 0 ? totalPages : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInlineProgress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentBook || !onUpdateProgress || isSubmitting) return;

    let targetPage = currentPage;
    let targetTotal = totalPages > 0 ? totalPages : undefined;

    if (totalPagesInput.trim()) {
      const parsedTotal = parseInt(totalPagesInput.trim(), 10);
      if (!isNaN(parsedTotal) && parsedTotal > 0) {
        targetTotal = parsedTotal;
      }
    }

    const effectiveTotal = targetTotal || totalPages;

    if (editMode === 'page') {
      const parsedP = parseInt(pageInputValue.trim(), 10);
      if (!isNaN(parsedP)) {
        targetPage = Math.max(0, parsedP);
      }
    } else {
      const parsedPct = parseFloat(percentInputValue.trim());
      if (!isNaN(parsedPct) && effectiveTotal > 0) {
        const safePct = Math.max(0, Math.min(100, parsedPct));
        targetPage = Math.round((safePct / 100) * effectiveTotal);
      }
    }

    if (effectiveTotal > 0 && targetPage > effectiveTotal) {
      targetPage = effectiveTotal;
    }

    try {
      setIsSubmitting(true);
      await onUpdateProgress(currentBook.id, targetPage, targetTotal);
      setIsInlineEditing(false);
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

          {/* Bloque de Barra de Progreso y Edición Rápida Inline */}
          <div className="mt-3 sm:mt-4 pt-3 border-t border-amber-900/15 dark:border-[#263147]">
            {/* Barra y Métricas de lectura */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-stone-800 dark:text-slate-200">
                  <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {totalPages > 0 ? (
                    <span>
                      Pág. <strong className="font-bold text-amber-900 dark:text-amber-300">{currentPage}</strong> de {totalPages} ({percentage}%)
                    </span>
                  ) : (
                    <span>
                      Pág. <strong className="font-bold text-amber-900 dark:text-amber-300">{currentPage}</strong> leídas
                    </span>
                  )}
                </div>

                {totalPages > 0 && (
                  <div className="text-[11px] text-stone-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>Faltan {remainingPages} págs</span>
                    <span>·</span>
                    <span className="text-amber-800 dark:text-amber-400 font-semibold">{remainingTimeStr}</span>
                  </div>
                )}
              </div>

              {/* Barra de progreso artesanal con brillo dorado */}
              <div className="w-full h-2 rounded-full bg-amber-950/15 dark:bg-amber-400/10 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-500 ease-out"
                  style={{ width: `${totalPages > 0 ? percentage : currentPage > 0 ? 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Fila de Botones Rápidos Inline */}
            <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500 dark:text-slate-400 hidden sm:inline">
                  Avanzar:
                </span>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 10)}
                  disabled={isSubmitting}
                  className="px-2 py-1 rounded-md text-[11px] font-bold border border-amber-900/20 dark:border-[#2E3B52] bg-amber-500/10 hover:bg-amber-500/25 active:scale-95 text-amber-950 dark:text-amber-300 transition shadow-2xs flex items-center gap-0.5"
                  title="Sumar 10 páginas al progreso de hoy"
                >
                  <Plus className="w-3 h-3" />
                  <span>10p</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 25)}
                  disabled={isSubmitting}
                  className="px-2 py-1 rounded-md text-[11px] font-bold border border-amber-900/20 dark:border-[#2E3B52] bg-amber-500/10 hover:bg-amber-500/25 active:scale-95 text-amber-950 dark:text-amber-300 transition shadow-2xs flex items-center gap-0.5"
                  title="Sumar 25 páginas al progreso de hoy"
                >
                  <Plus className="w-3 h-3" />
                  <span>25p</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 50)}
                  disabled={isSubmitting}
                  className="px-2 py-1 rounded-md text-[11px] font-bold border border-amber-900/20 dark:border-[#2E3B52] bg-amber-500/10 hover:bg-amber-500/25 active:scale-95 text-amber-950 dark:text-amber-300 transition shadow-2xs flex items-center gap-0.5"
                  title="Sumar 50 páginas al progreso de hoy"
                >
                  <Plus className="w-3 h-3" />
                  <span>50p</span>
                </button>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInlineEditing((prev) => !prev);
                }}
                className={
                  'px-3 py-1 rounded-md text-xs font-semibold border transition shadow-xs flex items-center gap-1.5 ' +
                  (isInlineEditing
                    ? 'border-amber-600 bg-amber-500 text-slate-950 font-bold'
                    : 'border-amber-900/25 dark:border-[#2D394E] bg-[#fbf6ea] dark:bg-[#161C28] text-stone-800 dark:text-stone-200 hover:border-amber-600/60')
                }
              >
                <span>{isInlineEditing ? 'Cerrar edición' : 'Actualizar página'}</span>
              </button>
            </div>

            {/* Panel de edición rápida inline desplegable */}
            {isInlineEditing && (
              <form
                onSubmit={handleSaveInlineProgress}
                className="mt-3 p-3 rounded-xl border border-amber-600/35 dark:border-amber-500/30 bg-[#f4ead4]/90 dark:bg-[#0F1420]/90 space-y-3 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-serif font-bold text-amber-950 dark:text-amber-200">
                    Registrar avance de lectura
                  </span>
                  {/* Selector de modo Página vs Porcentaje */}
                  <div className="inline-flex rounded-lg border border-amber-900/20 dark:border-[#2E3B52] bg-[#fbf6ea] dark:bg-[#171F2E] p-0.5">
                    <button
                      type="button"
                      onClick={() => setEditMode('page')}
                      className={
                        'px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition ' +
                        (editMode === 'page'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                          : 'text-stone-600 dark:text-slate-400')
                      }
                    >
                      <Hash className="w-2.5 h-2.5" />
                      <span>Página</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMode('percent')}
                      className={
                        'px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition ' +
                        (editMode === 'percent'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                          : 'text-stone-600 dark:text-slate-400')
                      }
                    >
                      <Percent className="w-2.5 h-2.5" />
                      <span>Porcentaje</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                  {editMode === 'page' ? (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400 mb-1">
                        Página actual
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={totalPages > 0 ? totalPages : 99999}
                          value={pageInputValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPageInputValue(val);
                            const parsedP = parseInt(val, 10);
                            const effTotal = parseInt(totalPagesInput, 10) || totalPages;
                            if (!isNaN(parsedP) && effTotal > 0) {
                              setPercentInputValue(String(Math.min(100, Math.round((parsedP / effTotal) * 100))));
                            }
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-900/20 dark:border-[#2D394E] bg-white dark:bg-[#151B27] text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          placeholder="Ej: 145"
                          autoFocus
                        />
                        {totalPages > 0 && (
                          <span className="absolute right-2.5 top-1.5 text-[10px] text-stone-500 dark:text-slate-400">
                            / {totalPages}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400 mb-1">
                        Porcentaje leído (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={percentInputValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPercentInputValue(val);
                            const parsedPct = parseFloat(val);
                            const effTotal = parseInt(totalPagesInput, 10) || totalPages;
                            if (!isNaN(parsedPct) && effTotal > 0) {
                              setPageInputValue(String(Math.round((parsedPct / 100) * effTotal)));
                            }
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-900/20 dark:border-[#2D394E] bg-white dark:bg-[#151B27] text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          placeholder="Ej: 45"
                          autoFocus
                        />
                        <span className="absolute right-2.5 top-1.5 text-[10px] text-stone-500 dark:text-slate-400">
                          %
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Si el libro no tiene total de páginas registrado, permitir introducirlo aquí */}
                  {totalPages <= 0 && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400 mb-1">
                        Total de páginas de tu edición
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={totalPagesInput}
                        onChange={(e) => setTotalPagesInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-900/20 dark:border-[#2D394E] bg-white dark:bg-[#151B27] text-stone-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        placeholder="Ej: 380 páginas"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsInlineEditing(false)}
                      className="px-2.5 py-1.5 rounded-lg text-xs border border-amber-900/20 dark:border-[#2E3B52] text-stone-600 dark:text-slate-400 hover:bg-stone-500/10 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-xs flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Guardando...' : 'Guardar'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
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
