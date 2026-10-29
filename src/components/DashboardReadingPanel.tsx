import React, { useState } from 'react';
import { Clock, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';
import { Book } from '../types/models';
import { BookCover, preloadBookCover } from './BookCover';
import '../dashboard-panels.css';

interface DashboardReadingPanelProps {
  readingBooks: Book[];
  onOpenDetail: (bookId: string) => void;
  onNavigateToShelf: () => void;
}

function formatReadingStartDate(fechaInicio?: string, paginas?: number | null): React.ReactNode {
  let dateNode: React.ReactNode = null;
  if (fechaInicio) {
    const parts = fechaInicio.split('-');
    if (parts.length === 3) {
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const day = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
        dateNode = (
          <span>
            Empezaste el <strong className="font-semibold text-stone-900 dark:text-stone-200">{day} de {months[monthIdx]}</strong>
          </span>
        );
      }
    }
    if (!dateNode) {
      dateNode = (
        <span>
          Empezaste el <strong className="font-semibold text-stone-900 dark:text-stone-200">{fechaInicio}</strong>
        </span>
      );
    }
  } else {
    dateNode = <span>Lectura en curso</span>;
  }

  return (
    <span className="inline-flex items-center flex-wrap gap-1">
      {dateNode}
      {paginas && paginas > 0 ? (
        <span className="text-stone-500 dark:text-slate-400">· {paginas} páginas</span>
      ) : null}
    </span>
  );
}

export const DashboardReadingPanel: React.FC<DashboardReadingPanelProps> = ({
  readingBooks,
  onOpenDetail,
  onNavigateToShelf
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = readingBooks.length;
  const safeIndex = total > 0 ? Math.min(currentIndex, total - 1) : 0;
  const currentBook = total > 0 ? readingBooks[safeIndex] : null;

  return (
    <div className="library-paper-panel h-full flex flex-col justify-between">
      {/* Marcapáginas burdeos colgando */}
      <div className="dashboard-ribbon" aria-hidden="true" />

      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6 pr-8 sm:pr-10">
        <h2 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span>Leyendo actualmente</span>
        </h2>
        <button
          type="button"
          onClick={onNavigateToShelf}
          className="text-xs font-semibold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:underline transition-colors flex items-center gap-0.5"
        >
          <span>Ver estantería</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Contenido principal */}
      {!currentBook ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-amber-900/20 dark:border-amber-400/20 bg-amber-500/5 my-auto">
          <BookOpen className="w-8 h-8 text-amber-700/60 dark:text-amber-400/60 mb-2" />
          <p className="font-serif text-base text-stone-800 dark:text-stone-200">
            No tienes lecturas en curso
          </p>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 max-w-xs">
            Abre cualquier libro de tu biblioteca y marca su progreso como "Leyendo" para continuar donde lo dejaste.
          </p>
          <button
            type="button"
            onClick={onNavigateToShelf}
            className="mt-3.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition shadow-xs"
          >
            Explorar biblioteca
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          <div
            onClick={() => onOpenDetail(currentBook.id)}
            onPointerEnter={() => preloadBookCover(currentBook)}
            className="group cursor-pointer flex items-center gap-4 sm:gap-6 p-2 rounded-xl hover:bg-amber-500/5 dark:hover:bg-amber-400/5 transition-all duration-300"
          >
            {/* Portada 3D con canto de hojas */}
            <div className="w-20 sm:w-24 shrink-0 transform group-hover:-translate-y-1 group-hover:rotate-[-1deg] transition-transform duration-300">
              <BookCover
                nombre={currentBook.nombre}
                autor={currentBook.autor}
                portadaUrl={currentBook.portadaUrl}
                portadaFallbackUrl={currentBook.portadaFallbackUrl}
                portadaDataUrl={currentBook.portadaDataUrl}
                size="md"
                variant="book"
              />
            </div>

            {/* Metadatos */}
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <span className="dashboard-reading-badge">
                  <BookOpen className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                  <span>Leyendo</span>
                </span>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight text-stone-900 dark:text-[#f8f5ee] group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors line-clamp-2">
                {currentBook.nombre}
              </h3>

              <p className="font-serif italic text-sm text-stone-600 dark:text-stone-400 mt-1 truncate">
                {currentBook.autor}
              </p>

              <div className="text-xs text-stone-600 dark:text-slate-400 mt-3 sm:mt-4">
                {formatReadingStartDate(currentBook.fechaInicio, currentBook.paginas)}
              </div>
            </div>
          </div>

          {/* Navegación entre libros si hay más de 1 en lectura */}
          {total > 1 && (
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-amber-900/10 dark:border-amber-400/10 text-xs text-stone-600 dark:text-slate-400">
              <span className="text-[11px] font-medium">
                Libro {safeIndex + 1} de {total} en curso
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
                  }}
                  className="p-1 rounded-md hover:bg-amber-500/15 dark:hover:bg-amber-400/15 text-stone-700 dark:text-stone-300 transition"
                  title="Libro anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
                  }}
                  className="p-1 rounded-md hover:bg-amber-500/15 dark:hover:bg-amber-400/15 text-stone-700 dark:text-stone-300 transition"
                  title="Siguiente libro"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
