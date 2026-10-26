import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../book-shelf.css';
import { Book } from '../types/models';
import { BookCover, preloadBookCover } from './BookCover';

interface BookShelfProps {
  books: Book[];
  onOpenDetail: (bookId: string) => void;
  openedBookId?: string | null;
}

// Debe coincidir con --shelf-pad y --shelf-gap de book-shelf.css
const SHELF_PAD = 14;
const SHELF_GAP = 20;
const MIN_BOOK_WIDTH = 128;
const MAX_COLS = 6;

/**
 * Vista de estantería: una librería de madera con baldas.
 * - Libros apoyados sobre la balda, con sombra de contacto, lomo y brillo uniforme.
 * - Título de cada libro en una placa de latón en el canto de la balda.
 * - El número de libros por balda se adapta al ancho disponible.
 */
const BookShelfComponent: React.FC<BookShelfProps> = ({
  books,
  onOpenDetail,
  openedBookId
}) => {
  const backRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(MAX_COLS);

  useEffect(() => {
    const el = backRef.current;
    if (!el) return;
    let prevWidth = el.clientWidth;
    const update = () => {
      const w = el.clientWidth;
      const available = w - SHELF_PAD * 2;
      const fit = Math.floor((available + SHELF_GAP) / (MIN_BOOK_WIDTH + SHELF_GAP));
      const nextCols = Math.min(MAX_COLS, Math.max(2, fit));
      setCols((c) => (c === nextCols ? c : nextCols));
    };
    update();
    const observer = new ResizeObserver(() => {
      if (!el || el.clientWidth === prevWidth) return;
      prevWidth = el.clientWidth;
      update();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const setPlateActive = useCallback((bookId: string, active: boolean) => {
    const container = backRef.current;
    if (!container) return;
    const safeId = bookId.replace(/"/g, '\\"');
    const plate = container.querySelector(`[data-plate-id="${safeId}"]`);
    if (plate) {
      plate.classList.toggle('is-active', active);
    }
  }, []);

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
    <div className="bookcase">
      <div className="bookcase-cornice" aria-hidden="true" />

      <div className="bookcase-body">
        <div className="bookcase-back" ref={backRef}>
          {rows.map((row, rowIdx) => (
            <div className="shelf-row" key={rowIdx}>
              <div className="shelf-books" style={gridStyle}>
                {row.map((book, i) => (
                  <button
                    key={book.id}
                    type="button"
                    data-book-id={book.id}
                    className={
                      'shelf-book' + (openedBookId === book.id ? ' is-extracted' : '')
                    }
                    style={{ '--i': i } as React.CSSProperties}
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
                    <BookCover
                      nombre={book.nombre}
                      autor={book.autor}
                      portadaUrl={book.portadaUrl}
                      portadaFallbackUrl={book.portadaFallbackUrl}
                      portadaDataUrl={book.portadaDataUrl}
                      size="sm"
                      variant="book"
                    />
                  </button>
                ))}
              </div>

              <div className="shelf-plank" aria-hidden="true">
                <div className="shelf-plank-top" />
                <div className="shelf-plank-front">
                  <div className="shelf-plates" style={gridStyle}>
                    {row.map((book) => (
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

      <div className="bookcase-plinth" aria-hidden="true" />
    </div>
  );
};

export const BookShelf = React.memo(BookShelfComponent);
