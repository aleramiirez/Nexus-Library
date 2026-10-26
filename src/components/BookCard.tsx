import React from 'react';
import { Book } from '../types/models';
import { BookCover, preloadBookCover } from './BookCover';
import { formatStars, ReadingStatus } from '../constants/catalogs';

interface BookCardProps {
  book: Book;
  onOpenDetail: (book: Book) => void;
  onEdit?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  onQuickStatusChange?: (bookId: string, status: ReadingStatus) => void;
}

const statusBadgeStyles: Record<ReadingStatus, string> = {
  '❌ No Leído':
    'bg-stone-200/90 text-stone-700 border-stone-400/50 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-600/50',
  '⏳ Leyendo':
    'bg-amber-500/15 text-amber-900 border-amber-600/40 dark:bg-amber-950/90 dark:text-amber-300 dark:border-amber-500/40',
  '⏸️ Pausado':
    'bg-rose-500/15 text-rose-900 border-rose-500/40 dark:bg-rose-950/90 dark:text-rose-300 dark:border-rose-500/40',
  '✅ Leído':
    'bg-emerald-500/15 text-emerald-900 border-emerald-600/40 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-500/40'
};

const BookCardComponent: React.FC<BookCardProps> = ({
  book,
  onOpenDetail
}) => {
  return (
    <article
      data-book-id={book.id}
      onClick={() => onOpenDetail(book)}
      onPointerEnter={() => preloadBookCover(book)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(book);
        }
      }}
      className="group relative flex flex-col cursor-pointer rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea]/95 dark:bg-[#161C28]/95 hover:bg-[#fffcf5] dark:hover:bg-[#1B2333] p-2.5 sm:p-3.5 shadow-sm hover:-translate-y-1.5 hover:border-amber-600/60 dark:hover:border-amber-400/70 hover:shadow-[0_14px_30px_-8px_rgba(180,115,30,0.22)] dark:hover:shadow-[0_14px_30px_-8px_rgba(245,158,11,0.22)] transition-all duration-300 ease-out"
    >
      <div className="relative mb-2 sm:mb-3">
        <BookCover
          nombre={book.nombre}
          autor={book.autor}
          portadaUrl={book.portadaUrl}
          portadaFallbackUrl={book.portadaFallbackUrl}
          portadaDataUrl={book.portadaDataUrl}
        />

        {book.sagaNombre && (
          <span className="absolute top-2 left-2 z-10 max-w-[88%] truncate rounded-md bg-[#0D1017]/90 backdrop-blur-sm border border-amber-400/30 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-amber-200 shadow">
            {book.sagaNombre} {book.volumen ? '#' + String(book.volumen) : ''}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between gap-1.5 sm:gap-2">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
            <span
              className={
                'inline-flex items-center whitespace-nowrap shrink-0 rounded-full border px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium ' +
                statusBadgeStyles[book.progreso]
              }
            >
              {book.progreso}
            </span>
            {book.puntuacion && (
              <span
                className="text-[10px] sm:text-[11px] tracking-tighter whitespace-nowrap shrink-0"
                title={String(book.puntuacion) + ' de 5 estrellas'}
              >
                {formatStars(book.puntuacion)}
              </span>
            )}
          </div>

          <h3
            className="font-serif text-sm sm:text-lg font-bold text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 line-clamp-2 leading-snug"
            title={book.nombre}
          >
            {book.nombre}
          </h3>

          <p className="text-[11px] sm:text-xs text-stone-600 dark:text-slate-400 line-clamp-1 mt-0.5">
            {book.autor || 'Autor sin especificar'}
          </p>

          {book.genero && (
            <p className="mt-1 sm:mt-1.5 inline-block rounded bg-amber-900/10 dark:bg-slate-800/80 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] text-stone-700 dark:text-slate-300 truncate max-w-full">
              {book.genero}
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

export const BookCard = React.memo(BookCardComponent);
