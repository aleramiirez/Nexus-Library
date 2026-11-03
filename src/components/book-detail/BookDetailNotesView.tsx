import React from 'react';
import {
  PenLine,
  Save,
  Check,
  Loader2,
  Quote,
  Plus,
  Share2,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Book } from '../../types/models';

export interface BookDetailNotesViewProps {
  book: Book;
  localNotes: string;
  setLocalNotes: (val: string) => void;
  localQuotes: string[];
  isSavingNotes: boolean;
  notesSavedSuccess: boolean;
  onSaveNotes: (notesToSave?: string, isExplicitSave?: boolean) => void;
  newQuoteText: string;
  setNewQuoteText: (val: string) => void;
  newQuotePage: string;
  setNewQuotePage: (val: string) => void;
  onAddQuote: () => void;
  onDeleteQuote: (index: number) => void;
  onCopyQuote: (quote: string, index: number) => void;
  copiedQuoteIndex: number | null;
  onShareQuote: (quote: string) => void;
  onTurnToSynopsis: () => void;
  onTurnToDetails: () => void;
  readOnly?: boolean;
  variant?: 'mobile' | 'desktop';
}

export const BookDetailNotesView: React.FC<BookDetailNotesViewProps> = ({
  book,
  localNotes,
  setLocalNotes,
  localQuotes,
  isSavingNotes,
  notesSavedSuccess,
  onSaveNotes,
  newQuoteText,
  setNewQuoteText,
  newQuotePage,
  setNewQuotePage,
  onAddQuote,
  onDeleteQuote,
  onCopyQuote,
  copiedQuoteIndex,
  onShareQuote,
  onTurnToSynopsis,
  onTurnToDetails,
  readOnly = false,
  variant = 'desktop',
}) => {
  const isMobile = variant === 'mobile';

  if (isMobile) {
    return (
      <div className="mobile-page-transition-forward space-y-4">
        <div className="border-b border-amber-900/15 dark:border-[#242E42] pb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold">
            fol. IV · Diario de Lectura & Citas
          </span>
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white mt-0.5">
            {book.nombre}
          </h2>
          <p className="font-serif italic text-xs text-stone-600 dark:text-slate-400">
            {book.autor || 'Autor no especificado'}
          </p>
        </div>

        {/* Reseña & Notas personales */}
        <div className="rounded-2xl border border-amber-900/15 dark:border-[#242E42] bg-[#fffcf5]/90 dark:bg-[#161D2B]/80 p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-amber-900/10 dark:border-[#20293A] pb-2">
            <span className="font-serif font-bold text-xs text-stone-900 dark:text-white flex items-center gap-1.5">
              <PenLine className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              Reseña & Notas Personales
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onSaveNotes(undefined, true)}
                disabled={isSavingNotes}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-600/35 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 transition"
              >
                {isSavingNotes ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : notesSavedSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{notesSavedSuccess ? 'Guardado' : 'Guardar'}</span>
              </button>
            )}
          </div>

          {readOnly ? (
            <p className="font-serif text-xs leading-relaxed text-stone-700 dark:text-slate-300 italic whitespace-pre-line">
              {localNotes || 'Sin notas registradas.'}
            </p>
          ) : (
            <textarea
              rows={4}
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={() => onSaveNotes()}
              placeholder="Escribe tus reflexiones, impresiones o reseña personal de esta obra..."
              className="w-full rounded-xl border border-amber-900/20 dark:border-[#2A354B] bg-[#fbf6ea]/70 dark:bg-[#0D111A] p-2.5 text-xs font-serif text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition leading-relaxed resize-y"
            />
          )}
        </div>

        {/* Citas Memorables */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-serif font-bold text-xs text-stone-900 dark:text-white flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              Citas Memorables ({localQuotes.length})
            </span>
          </div>

          {!readOnly && (
            <div className="rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-[#121824]/60 p-3 space-y-2">
              <textarea
                rows={2}
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                placeholder="«Escribe aquí una cita inolvidable de la obra...»"
                className="w-full rounded-lg border border-amber-900/20 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0D111A] p-2 text-xs font-serif italic text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={newQuotePage}
                  onChange={(e) => setNewQuotePage(e.target.value)}
                  placeholder="Pág. o ubicación (ej: pág. 120)"
                  className="rounded-lg border border-amber-900/20 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0D111A] px-2 py-1 text-xs text-stone-900 dark:text-slate-200 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-600 max-w-[160px]"
                />
                <button
                  type="button"
                  onClick={onAddQuote}
                  disabled={!newQuoteText.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>
          )}

          {localQuotes.length === 0 ? (
            <div className="py-5 px-3 rounded-xl border border-dashed border-amber-900/20 dark:border-[#232D40] text-center text-xs text-stone-500 dark:text-slate-400 font-serif italic">
              Aún no has guardado citas de este libro.
            </div>
          ) : (
            <div className="space-y-2 max-h-[35vh] overflow-y-auto overscroll-contain pr-0.5">
              {localQuotes.map((quote, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl border border-amber-900/15 dark:border-[#222B3C] bg-[#fffcf5]/85 dark:bg-[#141A26]/85 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <blockquote className="font-serif italic text-xs text-stone-800 dark:text-slate-200 leading-relaxed pl-2 border-l-2 border-amber-600/60 dark:border-amber-400/60">
                      «{quote}»
                    </blockquote>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onShareQuote(quote)}
                        className="p-1 rounded-md text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 transition"
                        title="Crear tarjeta para redes con esta cita"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopyQuote(quote, idx)}
                        className="p-1 rounded-md text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 transition"
                        title="Copiar cita"
                      >
                        {copiedQuoteIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => onDeleteQuote(idx)}
                          className="p-1 rounded-md text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          title="Eliminar cita"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onTurnToSynopsis}
            className="py-2.5 px-3 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] dark:bg-[#1A2232] text-amber-950 dark:text-amber-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Sinopsis</span>
          </button>
          <button
            type="button"
            onClick={onTurnToDetails}
            className="py-2.5 px-3 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] dark:bg-[#1A2232] text-amber-950 dark:text-amber-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
          >
            <span>Ficha técnica</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="open-book-fade-content flex flex-col gap-4 sm:gap-5">
      <div className="text-left border-b border-amber-900/15 dark:border-[#242E42] pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold">
            fol. IV · Cuaderno de Lectura & Citas Memorables
          </span>
          <span className="text-[10px] text-stone-500 dark:text-slate-400 font-serif italic">
            Ex-Libris
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
          <span className="text-amber-700 dark:text-amber-400 text-xs select-none">✦</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
        </div>
      </div>

      {/* Sección 1: Notas y Reseña Personal */}
      <div className="rounded-2xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5]/90 dark:bg-[#151C2A]/90 p-4 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-amber-900/10 dark:border-[#20293A] pb-2">
          <span className="font-serif font-bold text-sm text-stone-900 dark:text-white flex items-center gap-1.5">
            <PenLine className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            Reseña & Reflexiones Personales
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onSaveNotes(undefined, true)}
              disabled={isSavingNotes}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-amber-600/35 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 transition cursor-pointer"
            >
              {isSavingNotes ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : notesSavedSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{notesSavedSuccess ? 'Guardado' : 'Guardar notas'}</span>
            </button>
          )}
        </div>

        {readOnly ? (
          <p className="font-serif text-sm text-stone-700 dark:text-slate-300 whitespace-pre-line leading-relaxed italic">
            {localNotes || 'El lector no ha registrado notas públicas para este libro.'}
          </p>
        ) : (
          <textarea
            rows={4}
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => onSaveNotes()}
            placeholder="Añade aquí lo que más te ha impresionado, tus reflexiones al terminar el libro o tu reseña personal..."
            className="w-full rounded-xl border border-amber-900/20 dark:border-[#2A354B] bg-[#fbf6ea]/70 dark:bg-[#0D111A] p-3 text-sm font-serif text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition leading-relaxed resize-y"
          />
        )}
      </div>

      {/* Sección 2: Citas Memorables */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-serif font-bold text-sm text-stone-900 dark:text-white flex items-center gap-1.5">
            <Quote className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            Citas Memorables ({localQuotes.length})
          </span>
          <span className="text-xs text-stone-500 dark:text-slate-400 font-serif italic">
            Frases inolvidables
          </span>
        </div>

        {/* Formulario para añadir cita */}
        {!readOnly && (
          <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-[#121824]/60 p-3.5 space-y-2.5">
            <textarea
              rows={2}
              value={newQuoteText}
              onChange={(e) => setNewQuoteText(e.target.value)}
              placeholder="«Escribe o pega aquí una frase o cita memorable del libro...»"
              className="w-full rounded-xl border border-amber-900/20 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0D111A] p-2.5 text-xs font-serif italic text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={newQuotePage}
                onChange={(e) => setNewQuotePage(e.target.value)}
                placeholder="Página o ubicación (ej: pág. 142)"
                className="rounded-lg border border-amber-900/20 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0D111A] px-2.5 py-1 text-xs text-stone-900 dark:text-slate-200 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-600 max-w-[200px]"
              />
              <button
                type="button"
                onClick={onAddQuote}
                disabled={!newQuoteText.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir cita</span>
              </button>
            </div>
          </div>
        )}

        {/* Lista de citas guardadas */}
        {localQuotes.length === 0 ? (
          <div className="py-6 px-4 rounded-xl border border-dashed border-amber-900/20 dark:border-[#232D40] text-center text-xs text-stone-500 dark:text-slate-400 font-serif italic">
            Aún no has guardado ninguna cita de esta obra. Agrega tus fragmentos favoritos para recordarlos siempre.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[32vh] overflow-y-auto overscroll-contain pr-1">
            {localQuotes.map((quote, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl border border-amber-900/15 dark:border-[#222B3C] bg-[#fffcf5]/85 dark:bg-[#141A26]/85 p-3.5 transition hover:border-amber-600/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <blockquote className="font-serif italic text-xs sm:text-sm text-stone-800 dark:text-slate-200 leading-relaxed pl-2.5 border-l-2 border-amber-600/60 dark:border-amber-400/60">
                    «{quote}»
                  </blockquote>

                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => onShareQuote(quote)}
                      className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
                      title="Crear tarjeta para redes con esta cita"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopyQuote(quote, idx)}
                      className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
                      title="Copiar cita con autor y título"
                    >
                      {copiedQuoteIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onDeleteQuote(idx)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
                        title="Eliminar cita"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 mt-auto border-t border-amber-900/15 dark:border-[#242E42] flex items-center justify-between">
        <button
          type="button"
          onClick={onTurnToSynopsis}
          title="Volver a la sinopsis (←)"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] hover:bg-[#ebdcc0] dark:bg-[#1A2232] text-xs font-semibold text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a Sinopsis</span>
        </button>
        <button
          type="button"
          onClick={onTurnToDetails}
          title="Volver a la ficha técnica"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] hover:bg-[#ebdcc0] dark:bg-[#1A2232] text-xs font-semibold text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer"
        >
          <span>Ficha técnica</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
