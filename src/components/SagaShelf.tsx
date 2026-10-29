import React from 'react';
import { Book } from '../types/models';
import { BookCover, preloadBookCover } from './BookCover';
import '../book-shelf.css';
import '../dashboard-panels.css';

interface SagaShelfProps {
  books: Book[];
  onOpenDetail: (bookId: string) => void;
}

const STATUS_SEAL: Record<string, { cls: string; label: string; glyph: string }> = {
  '✅ Leído': { cls: 'is-read', label: 'Leído', glyph: '✓' },
  '⏳ Leyendo': { cls: 'is-reading', label: 'Leyendo', glyph: '❧' },
  '⏸️ Pausado': { cls: 'is-paused', label: 'Pausado', glyph: 'II' }
};

/**
 * Balda de madera horizontal para los volúmenes de una saga.
 * En móvil se desliza con scroll-snap; cada libro lleva su número de volumen y un sello de estado.
 */
export const SagaShelf: React.FC<SagaShelfProps> = ({ books, onOpenDetail }) => (
  <div className="dashboard-shelf-niche saga-shelf">
    <div className="shelf-niche-cornice" aria-hidden="true" />
    <div className="shelf-niche-back">
      <div className="saga-shelf-scroll">
        <div className="saga-shelf-track">
          <div className="saga-shelf-books">
            {books.map((book, i) => {
              const seal = STATUS_SEAL[book.progreso];
              return (
                <button
                  key={book.id}
                  type="button"
                  data-book-id={book.id}
                  className="shelf-book saga-shelf-item"
                  style={{ '--i': i } as React.CSSProperties}
                  onClick={() => onOpenDetail(book.id)}
                  onPointerEnter={() => preloadBookCover(book)}
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
          <div className="shelf-plank" aria-hidden="true">
            <div className="shelf-plank-top" />
            <div className="shelf-niche-front">
              <div className="saga-shelf-plates">
                {books.map((book) => (
                  <div key={book.id} className="shelf-plate saga-shelf-plate">
                    {book.nombre}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
