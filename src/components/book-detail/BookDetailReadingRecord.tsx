import React from 'react';
import { Calendar, ExternalLink, X } from 'lucide-react';
import { Book } from '../../types/models';

export interface BookDetailReadingRecordProps {
  book: Book;
  onDatesChange?: (bookId: string, fechaInicio: string, fechaFin: string) => void;
  readOnly?: boolean;
  variant?: 'mobile' | 'desktop';
  embedded?: boolean;
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    }
  } catch {}
  return dateStr;
}

function computeDurationLabel(start?: string, end?: string): string {
  if (!start || !end) return '';
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e >= s) {
      const diffDays = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    }
  } catch {}
  return '';
}

export const BookDetailReadingRecord: React.FC<BookDetailReadingRecordProps> = ({
  book,
  onDatesChange,
  readOnly = false,
  variant = 'desktop',
  embedded = false,
}) => {
  const isMobile = variant === 'mobile';
  const isUrl = /^https?:\/\//i.test(book.lecturaVirtual || '');
  const durationLabel = computeDurationLabel(book.fechaInicio, book.fechaFin);

  const formatReadingType = (val?: string) => {
    if (!val) return '📱 Digital (.epub / eBook)';
    if (/^https?:\/\//i.test(val)) return val;
    if (/digital|epub|ebook/i.test(val)) return '📱 Digital (.epub / eBook)';
    if (/físico|papel/i.test(val)) return '📖 Físico (Papel)';
    if (/audio/i.test(val)) return '🎧 Audiolibro';
    return val;
  };

  if (readOnly && !book.fechaInicio && !book.fechaFin && !book.lecturaVirtual) {
    return null;
  }

  const containerClasses = embedded
    ? 'w-full space-y-2 text-xs'
    : 'w-full rounded-2xl border border-amber-900/15 dark:border-[#242E42] bg-[#fbf6ea]/70 dark:bg-[#101520]/80 p-3 space-y-2 text-xs shadow-xs';

  return (
    <div className={containerClasses}>
      {/* Encabezado del Período de Lectura */}
      <div className="flex items-center justify-between text-[11px] font-serif italic text-amber-950/75 dark:text-amber-300/80 pb-0.5">
        <span className="flex items-center gap-1.5 font-semibold">
          <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
          Período de Lectura
        </span>
        {durationLabel && (
          <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-600/25 text-amber-900 dark:text-amber-300">
            {durationLabel}
          </span>
        )}
      </div>

      {/* Fichas Interactivas de Fecha (Inicio y Fin) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Chip Fecha de Inicio */}
        <div className="relative group">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5]/90 dark:bg-[#141A26]/90 text-stone-800 dark:text-slate-200 transition group-hover:border-amber-600/50 shadow-2xs min-h-[38px]">
            <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 opacity-80 group-hover:opacity-100" />
            <div className="min-w-0 flex-1 text-left">
              <span className="block text-[9.5px] uppercase font-mono tracking-wider text-stone-500 dark:text-slate-400 leading-none mb-0.5">
                Inicio
              </span>
              <span className="block font-serif text-xs font-semibold text-stone-800 dark:text-slate-200 truncate">
                {book.fechaInicio ? formatDisplayDate(book.fechaInicio) : 'Sin fecha'}
              </span>
            </div>
            {book.fechaInicio && !readOnly && onDatesChange && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDatesChange(book.id, '', book.fechaFin);
                }}
                className="relative z-10 p-0.5 rounded-full text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-200/50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                title="Borrar fecha de inicio"
                aria-label="Borrar fecha de inicio"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {!readOnly && onDatesChange && (
            <input
              type="date"
              value={book.fechaInicio || ''}
              onChange={(e) => onDatesChange(book.id, e.target.value, book.fechaFin)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-0"
              title="Elegir fecha de inicio"
              aria-label="Fecha de inicio de lectura"
            />
          )}
        </div>

        {/* Chip Fecha de Fin */}
        <div className="relative group">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5]/90 dark:bg-[#141A26]/90 text-stone-800 dark:text-slate-200 transition group-hover:border-amber-600/50 shadow-2xs min-h-[38px]">
            <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 opacity-80 group-hover:opacity-100" />
            <div className="min-w-0 flex-1 text-left">
              <span className="block text-[9.5px] uppercase font-mono tracking-wider text-stone-500 dark:text-slate-400 leading-none mb-0.5">
                Fin
              </span>
              <span className="block font-serif text-xs font-semibold text-stone-800 dark:text-slate-200 truncate">
                {book.fechaFin ? formatDisplayDate(book.fechaFin) : 'Sin fecha'}
              </span>
            </div>
            {book.fechaFin && !readOnly && onDatesChange && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDatesChange(book.id, book.fechaInicio, '');
                }}
                className="relative z-10 p-0.5 rounded-full text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-200/50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                title="Borrar fecha de fin"
                aria-label="Borrar fecha de fin"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {!readOnly && onDatesChange && (
            <input
              type="date"
              value={book.fechaFin || ''}
              onChange={(e) => onDatesChange(book.id, book.fechaInicio, e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-0"
              title="Elegir fecha de fin"
              aria-label="Fecha de fin de lectura"
            />
          )}
        </div>
      </div>

      {/* Formato de Lectura */}
      {book.lecturaVirtual && (
        <div className="pt-1.5 border-t border-amber-900/10 dark:border-[#242E42]/70 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 dark:text-slate-400 shrink-0">
            Formato
          </span>
          {isUrl ? (
            <a
              href={book.lecturaVirtual}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-400 hover:underline font-semibold truncate text-[11px]"
            >
              Abrir recurso <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ) : (
            <span className="font-medium text-[11px] truncate text-stone-800 dark:text-slate-200">
              {formatReadingType(book.lecturaVirtual)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
