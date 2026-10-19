import React from 'react';
import { Book } from '../types/models';
import { BookCover } from './BookCover';
import { formatStars, ReadingStatus } from '../constants/catalogs';

interface BookCardProps {
  book: Book;
  onOpenDetail: (book: Book) => void;
  onEdit?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  onQuickStatusChange?: (bookId: string, status: ReadingStatus) => void;
}

const statusBadgeStyles: Record<ReadingStatus, string> = {
  '❌ No Leído': 'bg-slate-800/90 text-slate-300 border-slate-600/50',
  '⏳ Leyendo': 'bg-amber-950/90 text-amber-300 border-amber-500/40',
  '⏸️ Pausado': 'bg-rose-950/90 text-rose-300 border-rose-500/40',
  '✅ Leído': 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
};

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onOpenDetail
}) => {
  return (
    <article
      onClick={() => onOpenDetail(book)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(book);
        }
      }}
      className="group relative flex flex-col cursor-pointer rounded-xl border border-slate-800/90 dark:border-[#283246] bg-white dark:bg-[#161C28]/95 hover:bg-slate-50 dark:hover:bg-[#1B2333] p-3.5 shadow-sm hover:-translate-y-1.5 hover:border-amber-400/70 hover:shadow-[0_14px_30px_-8px_rgba(245,158,11,0.22)] transition-all duration-300 ease-out"
    >
      <div className="relative mb-3">
        <BookCover
          nombre={book.nombre}
          autor={book.autor}
          portadaUrl={book.portadaUrl}
          portadaFallbackUrl={book.portadaFallbackUrl}
          portadaDataUrl={book.portadaDataUrl}
        />

        {book.sagaNombre && (
          <span className="absolute top-2.5 left-2.5 max-w-[85%] truncate rounded-md bg-[#0D1017]/90 backdrop-blur-sm border border-amber-400/30 px-2 py-0.5 text-[10px] font-medium text-amber-200 shadow">
            {book.sagaNombre} {book.volumen ? '#' + String(book.volumen) : ''}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between gap-2">
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <span
              className={
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ' +
                statusBadgeStyles[book.progreso]
              }
            >
              {book.progreso}
            </span>
            {book.puntuacion && (
              <span
                className="text-xs tracking-tight"
                title={String(book.puntuacion) + ' de 5 estrellas'}
              >
                {formatStars(book.puntuacion)}
              </span>
            )}
          </div>

          <h3
            className="font-serif text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 dark:group-hover:text-amber-300 line-clamp-2 leading-snug"
            title={book.nombre}
          >
            {book.nombre}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
            {book.autor || 'Autor sin especificar'}
          </p>

          {book.genero && (
            <p className="mt-1.5 inline-block rounded bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-300">
              {book.genero}
            </p>
          )}
        </div>
      </div>
    </article>
  );
};
