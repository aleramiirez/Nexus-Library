import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../book-shelf.css';
import { Book } from '../types/models';
import { BookCover } from './BookCover';

interface BookShelfProps {
  books: Book[];
  onOpenDetail: (bookId: string) => void;
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
const BookShelfComponent: React.FC<BookShelfProps> = ({ books, onOpenDetail }) => {
  const backRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(MAX_COLS);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const el = backRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - SHELF_PAD * 2;
      const fit = Math.floor((available + SHELF_GAP) / (MIN_BOOK_WIDTH + SHELF_GAP));
      setCols(Math.min(MAX_COLS, Math.max(2, fit)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
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
                    className="shelf-book"
                    style={{ '--i': i } as React.CSSProperties}
                    onClick={() => onOpenDetail(book.id)}
                    onMouseEnter={() => setActiveId(book.id)}
                    onMouseLeave={() => setActiveId(null)}
                    onFocus={() => setActiveId(book.id)}
                    onBlur={() => setActiveId(null)}
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
                        className={'shelf-plate' + (activeId === book.id ? ' is-active' : '')}
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
