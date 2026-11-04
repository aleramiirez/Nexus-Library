import React, { useState, useEffect } from 'react';
import { Bookmark, Sparkles, Check, CheckCircle2, Percent, Hash, Plus, Timer } from 'lucide-react';
import { Book } from '../../types/models';
import { calculateRemainingReadingTime } from '../../utils/readingTime';

export interface BookDetailReadingProgressProps {
  book: Book;
  onUpdateProgress?: (bookId: string, paginaActual: number, totalPaginas?: number) => Promise<void>;
  onStartReadingSession?: (book: Book) => void;
  variant?: 'mobile' | 'desktop';
}

export const BookDetailReadingProgress: React.FC<BookDetailReadingProgressProps> = ({
  book,
  onUpdateProgress,
  onStartReadingSession,
  variant = 'desktop'
}) => {
  const currentActual = book.paginaActual || 0;
  const currentTotal = book.paginas || 0;

  const [page, setPage] = useState<number>(currentActual);
  const [mode, setMode] = useState<'page' | 'percent'>('page');
  const [percentVal, setPercentVal] = useState<string>(
    currentTotal > 0 ? String(Math.min(100, Math.round((currentActual / currentTotal) * 100))) : '0'
  );
  const [customTotalInput, setCustomTotalInput] = useState<string>(
    currentTotal > 0 ? String(currentTotal) : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const act = book.paginaActual || 0;
    const tot = book.paginas || 0;
    setPage(act);
    setPercentVal(tot > 0 ? String(Math.min(100, Math.round((act / tot) * 100))) : '0');
    setCustomTotalInput(tot > 0 ? String(tot) : '');
  }, [book.id, book.paginaActual, book.paginas]);

  const effectiveTotal = (book.paginas && book.paginas > 0)
    ? book.paginas
    : (parseInt(customTotalInput.trim(), 10) || 0);

  const percentage = effectiveTotal > 0
    ? Math.min(100, Math.round((page / effectiveTotal) * 100))
    : 0;

  const remainingPages = Math.max(0, effectiveTotal - page);
  const remainingTimeStr = calculateRemainingReadingTime(remainingPages);
  const hasChanges = page !== currentActual || (effectiveTotal > 0 && effectiveTotal !== currentTotal);

  const handlePageChange = (newPage: number) => {
    const safePage = Math.max(0, effectiveTotal > 0 ? Math.min(effectiveTotal, newPage) : newPage);
    setPage(safePage);
    if (effectiveTotal > 0) {
      setPercentVal(String(Math.min(100, Math.round((safePage / effectiveTotal) * 100))));
    }
  };

  const handlePercentChange = (valStr: string) => {
    setPercentVal(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && effectiveTotal > 0) {
      const safePct = Math.max(0, Math.min(100, parsed));
      const targetPage = Math.round((safePct / 100) * effectiveTotal);
      setPage(targetPage);
    }
  };

  const handleSave = async (targetP = page, targetTot = effectiveTotal) => {
    if (!onUpdateProgress || isSaving) return;
    try {
      setIsSaving(true);
      await onUpdateProgress(book.id, targetP, targetTot > 0 ? targetTot : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdd = async (delta: number) => {
    const newTarget = effectiveTotal > 0 ? Math.min(effectiveTotal, page + delta) : page + delta;
    setPage(newTarget);
    if (effectiveTotal > 0) {
      setPercentVal(String(Math.min(100, Math.round((newTarget / effectiveTotal) * 100))));
    }
    await handleSave(newTarget, effectiveTotal);
  };

  const handleCompleteBook = async () => {
    const target = effectiveTotal > 0 ? effectiveTotal : (page > 0 ? page : 100);
    setPage(target);
    setPercentVal('100');
    await handleSave(target, target);
  };

  return (
    <div
      className={
        'rounded-2xl border border-amber-600/35 dark:border-amber-500/30 bg-[#f7efe0]/90 dark:bg-[#121824]/95 p-3.5 sm:p-4 shadow-sm space-y-3 transition-colors ' +
        (variant === 'mobile' ? 'w-full' : 'w-full my-2')
      }
    >
      {/* Cabecera del control de progreso */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/30">
            <Bookmark className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-[#f8f5ee]">
              Progreso de lectura actual
            </h4>
            <div className="text-[11px] text-stone-600 dark:text-slate-400">
              {effectiveTotal > 0 ? (
                <span>
                  Pág. <strong className="font-bold text-amber-900 dark:text-amber-300">{page}</strong> de {effectiveTotal} ({percentage}%)
                </span>
              ) : (
                <span>
                  Pág. <strong className="font-bold text-amber-900 dark:text-amber-300">{page}</strong> leídas
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Selector de modo Página vs Porcentaje */}
        <div className="inline-flex rounded-lg border border-amber-900/20 dark:border-[#2E3B52] bg-[#fbf6ea] dark:bg-[#18202F] p-0.5">
          <button
            type="button"
            onClick={() => setMode('page')}
            className={
              'px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition ' +
              (mode === 'page'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                : 'text-stone-600 dark:text-slate-400')
            }
          >
            <Hash className="w-2.5 h-2.5" />
            <span>Página</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('percent')}
            className={
              'px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition ' +
              (mode === 'percent'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                : 'text-stone-600 dark:text-slate-400')
            }
          >
            <Percent className="w-2.5 h-2.5" />
            <span>%</span>
          </button>
        </div>
      </div>

      {/* Barra de progreso interactiva (Slider de páginas) */}
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={effectiveTotal > 0 ? effectiveTotal : 1000}
            value={page}
            onChange={(e) => handlePageChange(parseInt(e.target.value, 10))}
            className="w-full h-2 rounded-lg bg-amber-950/20 dark:bg-amber-400/15 accent-amber-600 dark:accent-amber-500 cursor-pointer transition-all"
            aria-label="Ajustar página leída"
          />
        </div>

        {/* Métricas de páginas restantes y tiempo estimado */}
        {effectiveTotal > 0 && (
          <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-slate-400 px-0.5">
            <span>
              {remainingPages > 0 ? `Faltan ${remainingPages} páginas` : '¡Obra completada!'}
            </span>
            <span className="text-amber-800 dark:text-amber-400 font-semibold">
              {remainingPages > 0 ? remainingTimeStr : '100%'}
            </span>
          </div>
        )}
      </div>

      {/* Fila de controles rápidos y guardado */}
      <div className="pt-2 border-t border-amber-900/15 dark:border-[#232D42] flex flex-wrap items-center justify-between gap-2">
        {/* Botones de avance rápido */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickAdd(10)}
            disabled={isSaving}
            className="px-2 py-1 rounded-md text-[11px] font-bold border border-amber-900/20 dark:border-[#2E3B52] bg-amber-500/10 hover:bg-amber-500/25 active:scale-95 text-amber-950 dark:text-amber-300 transition shadow-2xs"
            title="Sumar 10 páginas"
          >
            +10p
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd(25)}
            disabled={isSaving}
            className="px-2 py-1 rounded-md text-[11px] font-bold border border-amber-900/20 dark:border-[#2E3B52] bg-amber-500/10 hover:bg-amber-500/25 active:scale-95 text-amber-950 dark:text-amber-300 transition shadow-2xs"
            title="Sumar 25 páginas"
          >
            +25p
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd(50)}
            disabled={isSaving}
            className="px-2 py-1 rounded-md text-[11px] font-bold border border-amber-900/20 dark:border-[#2E3B52] bg-amber-500/10 hover:bg-amber-500/25 active:scale-95 text-amber-950 dark:text-amber-300 transition shadow-2xs"
            title="Sumar 50 páginas"
          >
            +50p
          </button>
          {onStartReadingSession && (
            <button
              type="button"
              onClick={() => onStartReadingSession(book)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-amber-600/40 bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-950 dark:text-amber-300 transition shadow-2xs flex items-center gap-1 cursor-pointer"
              title="Iniciar sesión de lectura en vivo con cronómetro"
            >
              <Timer className="w-3 h-3 text-amber-700 dark:text-amber-400" />
              <span>⏱️ Iniciar sesión</span>
            </button>
          )}
        </div>

        {/* Input numérico directo + Botón Guardar / Completar */}
        <div className="flex items-center gap-2">
          {mode === 'page' ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-stone-500 dark:text-slate-400">Pág:</span>
              <input
                type="number"
                min={0}
                max={effectiveTotal > 0 ? effectiveTotal : 99999}
                value={page}
                onChange={(e) => handlePageChange(parseInt(e.target.value, 10) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className="w-16 px-2 py-1 text-xs font-semibold rounded-lg border border-amber-900/20 dark:border-[#2D394E] bg-white dark:bg-[#151B27] text-stone-900 dark:text-slate-100 text-center"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-stone-500 dark:text-slate-400">%:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={percentVal}
                onChange={(e) => handlePercentChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className="w-14 px-2 py-1 text-xs font-semibold rounded-lg border border-amber-900/20 dark:border-[#2D394E] bg-white dark:bg-[#151B27] text-stone-900 dark:text-slate-100 text-center"
              />
            </div>
          )}

          {hasChanges && (
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-xs flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>{isSaving ? '...' : 'Guardar'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCompleteBook}
            disabled={isSaving}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-600/40 dark:border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-950 dark:text-emerald-300 transition shadow-xs flex items-center gap-1"
            title="Marcar obra como 100% leída"
          >
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">¡Terminado! (100%)</span>
            <span className="sm:hidden">100%</span>
          </button>
        </div>
      </div>
    </div>
  );
};
