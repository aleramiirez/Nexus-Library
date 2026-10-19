import React from 'react';
import { Edit3, Trash2, Eye } from 'lucide-react';
import { Book } from '../types/models';
import { BookCover } from './BookCover';
import { formatStars, ReadingStatus } from '../constants/catalogs';

interface BookCardProps {
  book: Book;
  onOpenDetail: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
  onQuickStatusChange: (bookId: string, status: ReadingStatus) => void;
}

const statusBadgeStyles: Record<ReadingStatus, string> = {
  '❌ No Leído': 'bg-slate-800/90 text-slate-300 border-slate-600/50',
  '⏳ Leyendo': 'bg-amber-950/90 text-amber-300 border-amber-500/40',
  '⏸️ Pausado': 'bg-rose-950/90 text-rose-300 border-rose-500/40',
  '✅ Leído': 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
};

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onOpenDetail,
  onEdit,
  onDelete,
  onQuickStatusChange
}) => {
  return (
    <article className="group relative flex flex-col rounded-xl border border-slate-800/90 dark:border-[#283246] bg-white dark:bg-[#161C28]/95 p-3.5 shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all duration-200">
      <div
        onClick={() => onOpenDetail(book)}
        className="relative cursor-pointer mb-3"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetail(book);
          }
        }}
      >
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
            onClick={() => onOpenDetail(book)}
            className="font-serif text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 dark:group-hover:text-amber-300 cursor-pointer line-clamp-2 leading-snug"
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

        <div className="pt-2.5 mt-1 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1" role="group" aria-label="Cambiar estado de lectura">
            <button
              type="button"
              onClick={() => onQuickStatusChange(book.id, '⏳ Leyendo')}
              title="▶️ Marcar como leyendo"
              className={
                'px-1.5 py-1 rounded text-xs transition ' +
                (book.progreso === '⏳ Leyendo'
                  ? 'bg-amber-500/25 border border-amber-400/50 text-amber-200'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400')
              }
            >
              ▶️
            </button>
            <button
              type="button"
              onClick={() => onQuickStatusChange(book.id, '⏸️ Pausado')}
              title="⏸️ Marcar como pausado"
              className={
                'px-1.5 py-1 rounded text-xs transition ' +
                (book.progreso === '⏸️ Pausado'
                  ? 'bg-rose-500/25 border border-rose-400/50 text-rose-200'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400')
              }
            >
              ⏸️
            </button>
            <button
              type="button"
              onClick={() => onQuickStatusChange(book.id, '✅ Leído')}
              title="✅ Marcar como leído"
              className={
                'px-1.5 py-1 rounded text-xs transition ' +
                (book.progreso === '✅ Leído'
                  ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400')
              }
            >
              ✅
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenDetail(book)}
              title="Abrir ficha completa"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(book)}
              title="Editar libro"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(book)}
              title="Eliminar libro"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
