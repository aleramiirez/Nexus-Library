import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Sparkles, FileUp, Loader2 } from 'lucide-react';
import { Book } from '../types/models';
import { BookCover, preloadBookCover } from './BookCover';
import '../book-shelf.css';
import '../dashboard-panels.css';

interface DashboardFavoritesShelfProps {
  favoriteBooks: Book[];
  hasAnyBooks: boolean;
  hasRatedBooks: boolean;
  onOpenDetail: (bookId: string) => void;
  onNavigateToLibrary: () => void;
  onLoadSampleBooks: () => void;
  isLoadingSample: boolean;
  onOpenImport: () => void;
  openedBookId?: string | null;
}

export const DashboardFavoritesShelf: React.FC<DashboardFavoritesShelfProps> = ({
  favoriteBooks,
  hasAnyBooks,
  hasRatedBooks,
  onOpenDetail,
  onNavigateToLibrary,
  onLoadSampleBooks,
  isLoadingSample,
  onOpenImport,
  openedBookId
}) => {
  const shelfRef = useRef<HTMLDivElement>(null);

  // Columnas dinámicas según el ancho de pantalla/contenedor
  const [cols, setCols] = useState(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      return w < 340 ? 2 : w < 640 ? 3 : w < 1024 ? 4 : 5;
    }
    return 5;
  });

  const updateCols = useCallback(() => {
    const el = shelfRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w < 100) return;
    const nextCols = w < 300 ? 2 : w < 540 ? 3 : w < 840 ? 4 : 5;
    setCols((prev) => (prev === nextCols ? prev : nextCols));
  }, []);

  useEffect(() => {
    const el = shelfRef.current;
    if (!el) return;
    updateCols();

    let prevW = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (!el || el.clientWidth === prevW) return;
      prevW = el.clientWidth;
      updateCols();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateCols]);

  const setPlateActive = (bookId: string, active: boolean) => {
    const container = shelfRef.current;
    if (!container) return;
    const safeId = bookId.replace(/"/g, '\\"');
    const plate = container.querySelector(`[data-plate-id="${safeId}"]`);
    if (plate) {
      plate.classList.toggle('is-active', active);
    }
  };

  const displayedBooks = favoriteBooks.slice(0, 5);

  // Agrupar libros en filas para que CADA fila tenga su balda de madera y placas directamente debajo
  const rows = useMemo(() => {
    const result: Book[][] = [];
    for (let i = 0; i < displayedBooks.length; i += cols) {
      result.push(displayedBooks.slice(i, i + cols));
    }
    return result;
  }, [displayedBooks, cols]);

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }),
    [cols]
  );

  return (
    <div className="library-paper-panel">
      {/* Cabecera del panel */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <span className="text-amber-600 dark:text-amber-400">★</span>
          <span>Favoritos</span>
        </h2>
        <button
          type="button"
          onClick={onNavigateToLibrary}
          className="text-xs font-semibold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:underline transition-colors flex items-center gap-1"
        >
          <span>Ver biblioteca completa</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Caso: Biblioteca totalmente vacía */}
      {!hasAnyBooks ? (
        <div className="rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] p-6 sm:p-8 text-center space-y-3 bg-amber-500/5">
          <p className="font-serif text-lg text-stone-700 dark:text-slate-300">
            Tu biblioteca está lista para recibir tus libros
          </p>
          <p className="text-xs text-stone-500 dark:text-slate-400 max-w-md mx-auto">
            Puedes añadir libros con portada automática, importar tu historial de Goodreads en 1 clic, o cargar libros clásicos para ver la estantería en acción.
          </p>
          <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onLoadSampleBooks}
              disabled={isLoadingSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isLoadingSample ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Cargar 4 libros de muestra</span>
            </button>
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#1B2333] hover:bg-amber-500/10 text-stone-800 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5 text-amber-600" />
              <span>Importar CSV</span>
            </button>
          </div>
        </div>
      ) : !hasRatedBooks || displayedBooks.length === 0 ? (
        /* Caso: Hay libros pero ninguno con calificación */
        <div className="rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] p-7 text-center bg-amber-500/5">
          <p className="font-serif text-lg text-stone-700 dark:text-slate-300">
            Aún no tienes libros valorados en Favoritos
          </p>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Pulsa sobre cualquier libro de tu biblioteca y asígnale una puntuación con estrellas (⭐) para destacar aquí tus mejores lecturas sobre esta balda de madera.
          </p>
          <button
            type="button"
            onClick={onNavigateToLibrary}
            className="mt-3.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition"
          >
            Explorar mi biblioteca
          </button>
        </div>
      ) : (
        /* Balda de madera empotrada con los libros y placas de latón organizados por baldas */
        <div className="dashboard-shelf-niche" ref={shelfRef}>
          {/* Moldura superior de madera */}
          <div className="shelf-niche-cornice" aria-hidden="true" />

          {/* Cuerpo de madera con fondo de lamas y laterales */}
          <div className="shelf-niche-back">
            {rows.map((rowBooks, rowIdx) => (
              <div className="shelf-row" key={`fav-row-${rowIdx}`}>
                {/* Libros apoyados sobre esta balda */}
                <div className="shelf-books" style={gridStyle}>
                  {rowBooks.map((book, i) => (
                    <button
                      key={book.id}
                      type="button"
                      data-book-id={book.id}
                      className={
                        'shelf-book' + (openedBookId === book.id ? ' is-extracted' : '')
                      }
                      style={{ '--i': rowIdx * cols + i } as React.CSSProperties}
                      onClick={() => onOpenDetail(book.id)}
                      onPointerEnter={() => {
                        preloadBookCover(book);
                        setPlateActive(book.id, true);
                      }}
                      onPointerLeave={() => {
                        if (openedBookId !== book.id) setPlateActive(book.id, false);
                      }}
                      onFocus={() => {
                        preloadBookCover(book);
                        setPlateActive(book.id, true);
                      }}
                      onBlur={() => {
                        if (openedBookId !== book.id) setPlateActive(book.id, false);
                      }}
                      aria-label={book.nombre}
                      title={book.nombre}
                    >
                      <div className="relative w-full">
                        {book.sagaNombre && (
                          <span className="dashboard-saga-chip">
                            {book.sagaNombre} {book.volumen ? '#' + String(book.volumen) : ''}
                          </span>
                        )}
                        <BookCover
                          nombre={book.nombre}
                          autor={book.autor}
                          portadaUrl={book.portadaUrl}
                          portadaFallbackUrl={book.portadaFallbackUrl}
                          portadaDataUrl={book.portadaDataUrl}
                          size="sm"
                          variant="book"
                        />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Balda de madera y placas de latón de esta fila */}
                <div className="shelf-plank" aria-hidden="true">
                  <div className="shelf-plank-top" />
                  <div className="shelf-niche-front">
                    <div className="shelf-plates" style={gridStyle}>
                      {rowBooks.map((book) => (
                        <div
                          key={book.id}
                          data-plate-id={book.id}
                          className={
                            'shelf-plate' + (openedBookId === book.id ? ' is-active' : '')
                          }
                        >
                          {book.nombre}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
