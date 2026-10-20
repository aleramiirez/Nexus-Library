import React, { useEffect, useRef, useState } from 'react';
import '../book-shelf.css';
import { Book } from '../types/models';
import { BookCover } from './BookCover';

interface BookShelfProps {
  books: Book[];
  onOpenDetail: (bookId: string) => void;
}

const MAX_COLS = 6;

/**
 * Vista de estantería: una librería de madera con baldas.
 * - Libros apoyados sobre la balda, con sombra de contacto, lomo y brillo.
 * - Título de cada libro en una placa de latón en el canto de la balda.
 * - El número de libros por balda se adapta al ancho disponible (3 en móvil estándar, hasta 6 en escritorio).
 */
export const BookShelf: React.FC<BookShelfProps> = ({ books, onOpenDetail }) => {
  const backRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(MAX_COLS);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const el = backRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const isCompact = w < 520;
      const pad = isCompact ? 10 : 14;
      const gap = isCompact ? 12 : 20;
      const minBookWidth = isCompact ? 86 : 128;
      const available = w - pad * 2;
      const fit = Math.floor((available + gap) / (minBookWidth + gap));
      setCols(Math.min(MAX_COLS, Math.max(2, fit)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rows: Book[][] = [];
  for (let i = 0; i < books.length; i += cols) {
    rows.push(books.slice(i, i + cols));
  }

  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

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
                    <div className="shelf-cover group">
                      <BookCover
                        nombre={book.nombre}
                        autor={book.autor}
                        portadaUrl={book.portadaUrl}
                        portadaFallbackUrl={book.portadaFallbackUrl}
                        portadaDataUrl={book.portadaDataUrl}
                        size="sm"
                      />
                    </div>
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
