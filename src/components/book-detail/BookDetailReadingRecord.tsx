import React from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { Book } from '../../types/models';

export interface BookDetailReadingRecordProps {
  book: Book;
  onDatesChange?: (bookId: string, fechaInicio: string, fechaFin: string) => void;
  readOnly?: boolean;
  variant?: 'mobile' | 'desktop';
}

export const BookDetailReadingRecord: React.FC<BookDetailReadingRecordProps> = ({
  book,
  onDatesChange,
  readOnly = false,
  variant = 'desktop',
}) => {
  const isMobile = variant === 'mobile';
  const isUrl = /^https?:\/\//i.test(book.lecturaVirtual || '');

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

  if (isMobile) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-900/30 dark:border-[#2B3750] bg-[#f3e7ce]/60 dark:bg-[#0f141f]/75 p-3.5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between border-b border-amber-900/15 dark:border-[#232D42] pb-1.5">
          <span className="font-serif italic font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            Registro de Lectura
          </span>
          <span className="text-[10px] uppercase tracking-widest text-stone-600 dark:text-slate-400 font-mono">
            NEXUS
          </span>
        </div>

        {(book.fechaInicio || book.fechaFin || !readOnly) && (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="detail-fecha-inicio" className="text-[11px] text-stone-600 dark:text-slate-400 block mb-1">
                Fecha Inicio
              </label>
              {!readOnly && onDatesChange ? (
                <input
                  id="detail-fecha-inicio"
                  type="date"
                  value={book.fechaInicio || ''}
                  onChange={(e) =>
                    onDatesChange(book.id, e.target.value, book.fechaFin)
                  }
                  className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2.5 py-1.5 text-xs font-medium focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                />
              ) : (
                <span className="font-semibold text-xs block">
                  {book.fechaInicio || '—'}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="detail-fecha-fin" className="text-[11px] text-stone-600 dark:text-slate-400 block mb-1">
                Fecha Fin
              </label>
              {!readOnly && onDatesChange ? (
                <input
                  id="detail-fecha-fin"
                  type="date"
                  value={book.fechaFin || ''}
                  onChange={(e) =>
                    onDatesChange(book.id, book.fechaInicio, e.target.value)
                  }
                  className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2.5 py-1.5 text-xs font-medium focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                />
              ) : (
                <span className="font-semibold text-xs block">
                  {book.fechaFin || '—'}
                </span>
              )}
            </div>
          </div>
        )}

        {book.lecturaVirtual && (
          <div className="pt-1.5 border-t border-amber-900/15 dark:border-[#232D42] flex items-center justify-between gap-2">
            <span className="text-[11px] text-stone-600 dark:text-slate-400 shrink-0">
              Formato
            </span>
            {isUrl ? (
              <a
                href={book.lecturaVirtual}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-400 hover:underline font-semibold truncate"
              >
                Abrir recurso <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className="font-medium text-xs truncate">
                {formatReadingType(book.lecturaVirtual)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="w-full rounded-xl border border-dashed border-amber-900/30 dark:border-[#2B3750] bg-[#f3e7ce]/60 dark:bg-[#0f141f]/75 p-2.5 space-y-1.5 text-xs shrink-0 shadow-sm">
      <div className="flex items-center justify-between border-b border-amber-900/15 dark:border-[#232D42] pb-1">
        <span className="font-serif italic font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          Registro de Lectura
        </span>
        <span className="text-[9px] uppercase tracking-widest text-stone-600 dark:text-slate-400 font-mono">
          NEXUS
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="detail-desktop-fecha-inicio" className="text-[10px] font-semibold text-stone-600 dark:text-slate-400 block mb-0.5">
            Inicio
          </label>
          {!readOnly && onDatesChange ? (
            <input
              id="detail-desktop-fecha-inicio"
              type="date"
              value={book.fechaInicio || ''}
              onChange={(e) =>
                onDatesChange(book.id, e.target.value, book.fechaFin)
              }
              className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2 py-0.5 text-[11px] font-medium text-stone-800 dark:text-slate-200 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
            />
          ) : (
            <span className="font-semibold text-xs block text-stone-800 dark:text-slate-200">
              {book.fechaInicio || '—'}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="detail-desktop-fecha-fin" className="text-[10px] font-semibold text-stone-600 dark:text-slate-400 block mb-0.5">
            Fin
          </label>
          {!readOnly && onDatesChange ? (
            <input
              id="detail-desktop-fecha-fin"
              type="date"
              value={book.fechaFin || ''}
              onChange={(e) =>
                onDatesChange(book.id, book.fechaInicio, e.target.value)
              }
              className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2 py-0.5 text-[11px] font-medium text-stone-800 dark:text-slate-200 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
            />
          ) : (
            <span className="font-semibold text-xs block text-stone-800 dark:text-slate-200">
              {book.fechaFin || '—'}
            </span>
          )}
        </div>
      </div>

      {book.lecturaVirtual && (
        <div className="pt-1 border-t border-amber-900/15 dark:border-[#232D42] flex items-center justify-between gap-2 text-[11px]">
          <span className="text-[10px] text-stone-600 dark:text-slate-400 shrink-0">
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
