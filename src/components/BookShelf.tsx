import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../book-shelf.css';
import { Book } from '../types/models';
import { BookCover, preloadBookCover } from './BookCover';

interface BookShelfProps {
  books: Book[];
  onOpenDetail: (bookId: string) => void;
  openedBookId?: string | null;
  pageSize?: number;
  showPagination?: boolean;
}

// Debe coincidir con --shelf-pad y --shelf-gap de book-shelf.css
const SHELF_PAD = 14;
const SHELF_GAP = 20;
const MIN_BOOK_WIDTH = 128;
const MAX_COLS = 6;
const DEFAULT_PAGE_SIZE = 18;

function toRomanNumeral(num: number): string {
  const romanMap: [number, string][] = [
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];
  let result = '';
  let n = num;
  for (const [val, rom] of romanMap) {
    while (n >= val) {
      result += rom;
      n -= val;
    }
  }
  return result || 'I';
}

/**
 * Vista de estantería: una librería de madera con baldas.
 * - Módulos de estantería paginados (18 libros por mueble) para un rendimiento y experiencia física óptima.
 * - Libros apoyados sobre la balda, con sombra de contacto, lomo y brillo uniforme.
 * - Título de cada libro en una placa de latón en el canto de la balda.
 * - El número de libros por balda se adapta al ancho disponible.
 */
const BookShelfComponent: React.FC<BookShelfProps> = ({
  books,
  onOpenDetail,
  openedBookId,
  pageSize = DEFAULT_PAGE_SIZE,
  showPagination = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(MAX_COLS);
  const [page, setPage] = useState(1);

  const totalBooks = books.length;
  const isPaginated = showPagination && totalBooks > pageSize;
  const totalPages = isPaginated ? Math.ceil(totalBooks / pageSize) : 1;

  // Clamping de página si cambian los libros (ej. tras filtrar o buscar)
  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  // Si se abre un libro que está en otra página, saltar automáticamente a su página
  useEffect(() => {
    if (!openedBookId || !isPaginated) return;
    const index = books.findIndex((b) => b.id === openedBookId);
    if (index !== -1) {
      const targetPage = Math.floor(index / pageSize) + 1;
      if (targetPage !== page) {
        setPage(targetPage);
      }
    }
  }, [openedBookId, books, isPaginated, pageSize, page]);

  // Libros visibles en este módulo de estantería
  const startIndex = isPaginated ? (page - 1) * pageSize : 0;
  const endIndex = isPaginated ? Math.min(startIndex + pageSize, totalBooks) : totalBooks;
  const visibleBooks = useMemo(() => {
    if (!isPaginated) return books;
    return books.slice(startIndex, endIndex);
  }, [books, isPaginated, startIndex, endIndex]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

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
    for (let i = 0; i < visibleBooks.length; i += cols) {
      result.push(visibleBooks.slice(i, i + cols));
    }
    return result;
  }, [visibleBooks, cols]);

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }),
    [cols]
  );

  return (
    <div className="bookcase" ref={containerRef}>
      <div className="bookcase-cornice" aria-hidden="true" />

      <div className="bookcase-body" key={`shelf-module-${page}`}>
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

      {/* Controles de navegación estilo biblioteca cuando hay más de 18 libros */}
      {isPaginated && totalPages > 1 && (
        <div className="bookcase-nav">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="bookcase-nav-btn"
            aria-label="Estantería anterior"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Estantería anterior</span>
          </button>

          <div className="bookcase-nav-plate">
            <span className="bookcase-nav-plate-title">
              Estantería {toRomanNumeral(page)} de {toRomanNumeral(totalPages)}
            </span>
            <span className="bookcase-nav-plate-sub">
              Libros {startIndex + 1}–{endIndex} de {totalBooks}
            </span>
          </div>

          <div className="bookcase-nav-pills hidden md:inline-flex">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePageChange(p)}
                className={`bookcase-nav-pill ${p === page ? 'is-active' : ''}`}
                title={`Ir a Estantería ${toRomanNumeral(p)}`}
                aria-label={`Ir a Estantería ${toRomanNumeral(p)}`}
              >
                {toRomanNumeral(p)}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="bookcase-nav-btn"
            aria-label="Siguiente estantería"
          >
            <span className="hidden sm:inline">Siguiente estantería</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export const BookShelf = React.memo(BookShelfComponent);
