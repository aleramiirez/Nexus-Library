import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Book } from '../types/models';
import { BookCover, preloadBookCover } from './BookCover';
import '../book-shelf.css';
import '../dashboard-panels.css';

interface SagaShelfProps {
  books: Book[];
  onOpenDetail: (bookId: string) => void;
  openedBookId?: string | null;
}

const STATUS_SEAL: Record<string, { cls: string; label: string; glyph: string }> = {
  '✅ Leído': { cls: 'is-read', label: 'Leído', glyph: '✓' },
  '⏳ Leyendo': { cls: 'is-reading', label: 'Leyendo', glyph: '❧' },
  '⏸️ Pausado': { cls: 'is-paused', label: 'Pausado', glyph: 'II' }
};

/**
 * Balda de madera organizada por filas dinámicas para los volúmenes de una saga.
 * Cada fila cuenta con su propia balda física de madera y placas de latón 1:1 directamente debajo de cada libro.
 */
export const SagaShelf: React.FC<SagaShelfProps> = ({ books, onOpenDetail, openedBookId }) => {
  const shelfRef = useRef<HTMLDivElement>(null);

  // Columnas dinámicas según el ancho de pantalla/contenedor
  const [cols, setCols] = useState(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      return w < 320 ? 2 : w < 520 ? 3 : w < 800 ? 4 : w < 1060 ? 5 : 6;
    }
    return 5;
  });

  const updateCols = useCallback(() => {
    const el = shelfRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w < 100) return;
    const nextCols = w < 320 ? 2 : w < 520 ? 3 : w < 800 ? 4 : w < 1060 ? 5 : 6;
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

  const setPlateActive = useCallback((bookId: string, active: boolean) => {
    const container = shelfRef.current;
    if (!container) return;
    const safeId = bookId.replace(/"/g, '\\"');
    const plate = container.querySelector(`[data-plate-id="${safeId}"]`);
    if (plate) {
      plate.classList.toggle('is-active', active);
    }
  }, []);

  // Agrupar libros en filas para que CADA fila tenga su balda de madera y placas directamente debajo
  const rows = useMemo(() => {
    const result: Book[][] = [];
    for (let i = 0; i < books.length; i += cols) {
      result.push(books.slice(i, i + cols));
    }
    return result;
  }, [books, cols]);

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }),
    [cols]
  );

  return (
    <div className="dashboard-shelf-niche saga-shelf" ref={shelfRef}>
      {/* Moldura superior de madera */}
      <div className="shelf-niche-cornice" aria-hidden="true" />

      {/* Cuerpo de madera con fondo de lamas y laterales */}
      <div className="shelf-niche-back">
        {rows.map((rowBooks, rowIdx) => (
          <div className="shelf-row" key={`saga-row-${rowIdx}`}>
            {/* Libros apoyados sobre esta balda */}
            <div className="shelf-books" style={gridStyle}>
              {rowBooks.map((book, i) => {
                const seal = STATUS_SEAL[book.progreso];
                return (
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
                    title={`${book.nombre} · ${book.progreso}`}
                    aria-label={`${book.nombre}, ${book.progreso}`}
                  >
                    <div className="relative w-full">
                      <span className="dashboard-saga-chip">
                        {book.volumen ? `Vol. ${book.volumen}` : 'S/n'}
                      </span>
                      {seal && (
                        <span className={`saga-seal ${seal.cls}`} aria-label={seal.label}>
                          {seal.glyph}
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
                );
              })}
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
                      title={book.nombre}
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
  );
};
