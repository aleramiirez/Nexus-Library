import React from 'react';
import { Languages, BookOpen, Sparkles, Loader2, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Book } from '../../types/models';

export interface BookDetailSynopsisViewProps {
  book: Book;
  currentSynopsis: string;
  isCurrentSynopsisEnglish: boolean;
  isTranslatingSynopsis: boolean;
  isFetchingSynopsis: boolean;
  onTranslateCurrentSynopsis: () => void;
  onAutoFetchSynopsis: () => void;
  onTurnToDetails: () => void;
  onTurnToNotes: () => void;
  onEdit?: (book: Book) => void;
  readOnly?: boolean;
  variant?: 'mobile' | 'desktop';
}

export const BookDetailSynopsisView: React.FC<BookDetailSynopsisViewProps> = ({
  book,
  currentSynopsis,
  isCurrentSynopsisEnglish,
  isTranslatingSynopsis,
  isFetchingSynopsis,
  onTranslateCurrentSynopsis,
  onAutoFetchSynopsis,
  onTurnToDetails,
  onTurnToNotes,
  onEdit,
  readOnly = false,
  variant = 'desktop',
}) => {
  const isMobile = variant === 'mobile';

  if (isMobile) {
    return (
      <div className="mobile-page-transition-forward space-y-4">
        <div className="border-b border-amber-900/15 dark:border-[#242E42] pb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold">
            fol. III · Sinopsis Literaria
          </span>
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white mt-0.5">
            {book.nombre}
          </h2>
          <p className="font-serif italic text-xs text-stone-600 dark:text-slate-400">
            {book.autor || 'Autor no especificado'}
          </p>
        </div>

        {currentSynopsis ? (
          <div className="space-y-3">
            {isCurrentSynopsisEnglish && (
              <div className="p-3 rounded-xl border border-amber-600/35 bg-amber-500/15 flex items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-1.5 min-w-0 text-amber-950 dark:text-amber-200">
                  <Languages className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                  <span className="font-semibold truncate">Sinopsis en inglés detectada</span>
                </div>
                <button
                  type="button"
                  onClick={onTranslateCurrentSynopsis}
                  disabled={isTranslatingSynopsis}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 transition"
                >
                  {isTranslatingSynopsis ? 'Traduciendo...' : 'Traducir al español'}
                </button>
              </div>
            )}
            <div className="rounded-2xl border border-amber-900/15 dark:border-[#242E42] bg-[#fffcf5]/90 dark:bg-[#161D2B]/80 p-4 shadow-sm">
              <p className="font-serif text-sm leading-relaxed text-stone-800 dark:text-slate-200 whitespace-pre-line first-letter:float-left first-letter:text-4xl first-letter:font-serif first-letter:font-bold first-letter:text-amber-800 dark:first-letter:text-amber-400 first-letter:mr-2.5 first-letter:leading-none">
                {currentSynopsis}
              </p>
            </div>
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={onAutoFetchSynopsis}
                disabled={isFetchingSynopsis}
                className="inline-flex items-center gap-1 text-[11px] text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 transition"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isFetchingSynopsis ? 'Buscando...' : 'Actualizar sinopsis'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 px-4 rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] text-center space-y-2.5">
            <BookOpen className="w-8 h-8 text-amber-700/60 dark:text-amber-400/60 mx-auto" />
            <p className="font-serif text-sm text-stone-700 dark:text-slate-300">
              Esta edición no incluye una sinopsis registrada.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onAutoFetchSynopsis}
                disabled={isFetchingSynopsis}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm disabled:opacity-50"
              >
                {isFetchingSynopsis ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isFetchingSynopsis ? 'Buscando sinopsis...' : 'Autocompletar sinopsis'}</span>
              </button>
              {!readOnly && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(book)}
                  disabled={isFetchingSynopsis}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-900/20 dark:border-slate-700 bg-white/70 dark:bg-slate-800 text-stone-800 dark:text-slate-200 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Escribir manual</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onTurnToDetails}
            title="Volver a la ficha del libro"
            aria-label="Volver a la ficha del libro"
            className="py-2.5 px-3 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] dark:bg-[#1A2232] text-amber-950 dark:text-amber-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Ficha técnica</span>
          </button>
          <button
            type="button"
            onClick={onTurnToNotes}
            title="Ir al Diario de Lectura & Citas"
            className="py-2.5 px-3 rounded-xl border border-amber-600/35 bg-amber-500/20 text-amber-950 dark:text-amber-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
          >
            <span>Diario & Citas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="open-book-fade-content flex flex-col gap-4 sm:gap-5">
      <div className="text-left border-b border-amber-900/15 dark:border-[#242E42] pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold">
            Argumento & Sinopsis de la obra
          </span>
          <span className="text-[10px] text-stone-500 dark:text-slate-400 font-serif italic">
            fol. III
          </span>
        </div>
        <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-white mt-1">
          {book.nombre}
        </h2>
        <p className="font-serif italic text-sm text-stone-700 dark:text-slate-300 mt-0.5">
          por {book.autor || 'Autor no especificado'}
        </p>
        <div className="flex items-center gap-3 mt-3" aria-hidden="true">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
          <span className="text-amber-700 dark:text-amber-400 text-xs select-none">
            ✦
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
        </div>
      </div>

      {currentSynopsis ? (
        <div className="py-2 space-y-3.5">
          {isCurrentSynopsisEnglish && (
            <div className="p-3 sm:p-3.5 rounded-xl border border-amber-600/35 bg-amber-500/15 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0 text-amber-950 dark:text-amber-200">
                <Languages className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span className="font-medium truncate">
                  Sinopsis en inglés detectada. ¿Deseas traducirla al español?
                </span>
              </div>
              <button
                type="button"
                onClick={onTranslateCurrentSynopsis}
                disabled={isTranslatingSynopsis}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 active:scale-95 transition shadow-xs disabled:opacity-50"
              >
                {isTranslatingSynopsis ? 'Traduciendo...' : 'Traducir al español'}
              </button>
            </div>
          )}
          <p className="font-serif text-[15px] sm:text-base leading-relaxed text-stone-800 dark:text-slate-200 whitespace-pre-line tracking-normal first-letter:float-left first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-amber-800 dark:first-letter:text-amber-400 first-letter:mr-3 first-letter:leading-none">
            {currentSynopsis}
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-900/15 dark:border-[#232D42]">
            <button
              type="button"
              onClick={onAutoFetchSynopsis}
              disabled={isFetchingSynopsis}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-stone-600 dark:text-slate-400 hover:text-amber-900 dark:hover:text-amber-300 transition"
              title="Volver a buscar sinopsis en registros abiertos"
            >
              {isFetchingSynopsis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isFetchingSynopsis ? 'Actualizando...' : 'Actualizar sinopsis'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="py-12 px-6 rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] text-center space-y-2.5">
          <BookOpen className="w-9 h-9 text-amber-700/60 dark:text-amber-400/60 mx-auto" />
          <h3 className="font-serif text-base font-bold text-stone-800 dark:text-slate-200">
            Esta obra no incluye sinopsis registrada todavía
          </h3>
          <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto">
            Puedes buscar y autocompletar el argumento automáticamente desde los registros bibliográficos abiertos o redactarlo a mano.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onAutoFetchSynopsis}
              disabled={isFetchingSynopsis}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isFetchingSynopsis ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isFetchingSynopsis ? 'Buscando sinopsis...' : 'Autocompletar sinopsis'}</span>
            </button>
            {!readOnly && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(book)}
                disabled={isFetchingSynopsis}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-amber-900/20 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-750 text-stone-800 dark:text-slate-200 transition shadow-sm cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Escribir manual</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="pt-4 mt-auto border-t border-amber-900/15 dark:border-[#242E42] flex items-center justify-between">
        <button
          type="button"
          onClick={onTurnToDetails}
          title="Volver a la ficha técnica (←)"
          aria-label="Volver a la ficha técnica"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] hover:bg-[#ebdcc0] dark:bg-[#1A2232] dark:hover:bg-[#222C3F] text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Ficha técnica</span>
        </button>
        <button
          type="button"
          onClick={onTurnToNotes}
          title="Ir al Diario & Citas (→)"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-600/35 bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer"
        >
          <span>Diario & Citas (fol. IV)</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
