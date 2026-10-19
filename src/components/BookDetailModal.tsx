import React from 'react';
import {
  X,
  Edit3,
  Trash2,
  ExternalLink,
  Calendar,
  BookOpen,
  Layers,
  Hash,
  Globe,
  Building2,
  Clock
} from 'lucide-react';
import { Book, StarRating } from '../types/models';
import { BookCover } from './BookCover';
import { READING_STATUSES, ReadingStatus, STAR_OPTIONS } from '../constants/catalogs';

interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
  onStatusChange: (bookId: string, status: ReadingStatus) => void;
  onRatingChange: (bookId: string, rating: StarRating) => void;
  onDatesChange?: (bookId: string, fechaInicio: string, fechaFin: string) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onRatingChange,
  onDatesChange
}) => {
  if (!book) return null;

  const isUrl = /^https?:\/\//i.test(book.lecturaVirtual);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-book-title"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-[#283246] bg-white dark:bg-[#141A26] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#242E42] px-6 py-4 bg-slate-50 dark:bg-[#101520]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 font-semibold">
            <BookOpen className="w-4 h-4" />
            <span>Ficha Bibliográfica</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(book)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:border-amber-400 hover:text-amber-300 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => onDelete(book)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ficha"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 max-h-[82vh] overflow-y-auto">
          <div className="md:col-span-4 flex flex-col items-center">
            <div className="w-56 md:w-full max-w-[260px]">
              <BookCover
                nombre={book.nombre}
                autor={book.autor}
                portadaUrl={book.portadaUrl}
                portadaFallbackUrl={book.portadaFallbackUrl}
                portadaDataUrl={book.portadaDataUrl}
                size="lg"
              />
            </div>

            <div className="mt-5 w-full rounded-xl border border-slate-200 dark:border-[#242E42] bg-slate-50 dark:bg-[#101520] p-3.5 text-center">
              <p className="text-xs font-medium text-slate-400 mb-2">Puntuación Personal</p>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {STAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onRatingChange(book.id, book.puntuacion === opt.value ? null : opt.value)
                    }
                    className={
                      'px-2 py-1 rounded-lg text-xs border transition ' +
                      (book.puntuacion === opt.value
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                        : 'border-transparent hover:bg-slate-800 text-slate-400')
                    }
                  >
                    {opt.value} ⭐
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col gap-5">
            <div>
              {book.sagaNombre && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-300 mb-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    Saga: {book.sagaNombre}
                    {book.volumen ? ' · Volumen ' + String(book.volumen) : ''}
                  </span>
                </div>
              )}

              <h2
                id="detail-book-title"
                className="font-serif text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight"
              >
                {book.nombre}
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-300 mt-1 font-medium">
                {book.autor || 'Autor no especificado'}
              </p>
            </div>

            <div>
              <span className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Estado de lectura
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {READING_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onStatusChange(book.id, status)}
                    className={
                      'py-2 px-3 rounded-lg text-xs font-medium border text-center transition ' +
                      (book.progreso === status
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                        : 'border-slate-200 dark:border-[#263147] bg-slate-100 dark:bg-[#1A2232] text-slate-600 dark:text-slate-300 hover:border-slate-500')
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {book.genero ? (
                <span className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                  {book.genero}
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic">Sin género asignado</span>
              )}
              {book.subgeneros.map((sub) => (
                <span
                  key={sub}
                  className="rounded-lg bg-slate-100 dark:bg-[#1E2738] border border-slate-300 dark:border-[#2E3B52] px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300"
                >
                  {sub}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 dark:border-[#242E42] bg-slate-50 dark:bg-[#101520] p-4 text-xs">
              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" /> Año Publicación
                </span>
                <p className="font-semibold text-sm mt-0.5">
                  {book.fechaPublicacion ?? 'No disponible'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" /> Páginas
                </span>
                <p className="font-semibold text-sm mt-0.5">{book.paginas ?? 'No disponible'}</p>
              </div>
              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-amber-400" /> ISBN
                </span>
                <p className="font-semibold text-sm mt-0.5 break-all">
                  {book.isbn || 'No disponible'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" /> Editorial
                </span>
                <p className="font-semibold text-sm mt-0.5">
                  {book.editorial || 'No disponible'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-amber-400" /> Idioma / Edición
                </span>
                <p className="font-semibold text-sm mt-0.5">
                  {[book.idioma, book.edicion].filter(Boolean).join(' · ') || 'No disponible'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Tiempo de Lectura
                </span>
                <p className="font-semibold text-sm mt-0.5">
                  {book.tiempoLectura || 'Sin calcular'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 dark:border-[#242E42] p-3">
                <label className="text-slate-400 block mb-1">Fecha Inicio</label>
                {onDatesChange ? (
                  <input
                    type="date"
                    value={book.fechaInicio || ''}
                    onChange={(e) => onDatesChange(book.id, e.target.value, book.fechaFin)}
                    className="w-full rounded-md border border-slate-300 dark:border-[#283246] bg-slate-50 dark:bg-[#101520] px-2 py-1 text-xs font-medium focus:border-amber-400 focus:outline-none"
                  />
                ) : (
                  <span className="font-medium text-sm">{book.fechaInicio || '—'}</span>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-[#242E42] p-3">
                <label className="text-slate-400 block mb-1">Fecha Fin</label>
                {onDatesChange ? (
                  <input
                    type="date"
                    value={book.fechaFin || ''}
                    onChange={(e) => onDatesChange(book.id, book.fechaInicio, e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-[#283246] bg-slate-50 dark:bg-[#101520] px-2 py-1 text-xs font-medium focus:border-amber-400 focus:outline-none"
                  />
                ) : (
                  <span className="font-medium text-sm">{book.fechaFin || '—'}</span>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-[#242E42] p-3">
                <span className="text-slate-400 block">Lectura Virtual</span>
                {book.lecturaVirtual ? (
                  isUrl ? (
                    <a
                      href={book.lecturaVirtual}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-amber-400 hover:underline font-medium mt-0.5 truncate max-w-full"
                    >
                      Abrir recurso <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="font-medium text-sm block truncate">
                      {book.lecturaVirtual}
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>
            </div>

            {book.sinopsis && (
              <div className="rounded-xl border border-slate-200 dark:border-[#242E42] bg-slate-50 dark:bg-[#101520] p-4">
                <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                  Sinopsis
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {book.sinopsis}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
