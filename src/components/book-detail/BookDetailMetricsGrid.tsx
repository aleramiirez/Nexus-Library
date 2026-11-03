import React from 'react';
import { Calendar, BookOpen, Clock } from 'lucide-react';
import { Book } from '../../types/models';

export interface BookDetailMetricsGridProps {
  book: Book;
  computedReadingTime: string;
  variant?: 'mobile' | 'desktop';
}

export const BookDetailMetricsGrid: React.FC<BookDetailMetricsGridProps> = ({
  book,
  computedReadingTime,
  variant = 'desktop',
}) => {
  const isMobile = variant === 'mobile';

  if (isMobile) {
    return (
      <div className="grid grid-cols-3 divide-x divide-amber-900/15 dark:divide-slate-800/90 text-center">
        <div className="px-1">
          <span className="text-stone-500 dark:text-slate-400 flex items-center justify-center gap-1 text-[10.5px]">
            <Calendar className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
            Año
          </span>
          <p className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 mt-0.5 truncate">
            {book.fechaPublicacion ?? '—'}
          </p>
        </div>

        <div className="px-1">
          <span className="text-stone-500 dark:text-slate-400 flex items-center justify-center gap-1 text-[10.5px]">
            <BookOpen className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
            Páginas
          </span>
          <p className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 mt-0.5 truncate">
            {book.paginas ? `${book.paginas} págs.` : '—'}
          </p>
        </div>

        <div className="px-1">
          <span className="text-stone-500 dark:text-slate-400 flex items-center justify-center gap-1 text-[10.5px]">
            <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
            Lectura
          </span>
          <p className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 mt-0.5 truncate">
            {computedReadingTime}
          </p>
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="border-y border-amber-900/20 dark:border-slate-800 text-xs">
      <div className="grid grid-cols-3 divide-x divide-amber-900/15 dark:divide-slate-800/90 py-0.5">
        <div className="py-1.5 sm:py-2 pr-2.5">
          <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[10.5px]">
            <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            Año Publicación
          </span>
          <p className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 mt-0.5">
            {book.fechaPublicacion ?? '—'}
          </p>
        </div>

        <div className="py-1.5 sm:py-2 px-2.5">
          <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[10.5px]">
            <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            Páginas
          </span>
          <p className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 mt-0.5">
            {book.paginas ? `${book.paginas} págs.` : '—'}
          </p>
        </div>

        <div className="py-1.5 sm:py-2 pl-2.5">
          <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[10.5px]">
            <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            Tiempo de Lectura
          </span>
          <p className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 mt-0.5">
            {computedReadingTime}
          </p>
        </div>
      </div>
    </div>
  );
};
