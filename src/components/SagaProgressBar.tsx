import React from 'react';
import '../saga-progress.css';
import { Book } from '../types/models';

interface SagaProgressBarProps {
  /** Libros de la saga, en orden de lectura */
  books: Pick<Book, 'nombre' | 'progreso'>[];
  /** Porcentaje ya calculado (0-100) */
  percent: number;
  size?: 'sm' | 'md';
  className?: string;
}

// Por encima de este número de volúmenes las celdas serían minúsculas: se usa una barra continua
const MAX_SEGMENTS = 24;
const READ_STATUS = '✅ Leído';

/**
 * Barra de progreso de una saga: una celda por volumen.
 * Las celdas de los volúmenes leídos se rellenan en oro; las pendientes quedan como ranura.
 */
export const SagaProgressBar: React.FC<SagaProgressBarProps> = ({
  books,
  percent,
  size = 'md',
  className = ''
}) => {
  const total = books.length;
  const readCount = books.filter((b) => b.progreso === READ_STATUS).length;
  const segmented = total > 0 && total <= MAX_SEGMENTS;
  const safePercent = Math.min(100, Math.max(0, percent));

  const label =
    total > 0 ? `${readCount} de ${total} volúmenes leídos` : 'Sin volúmenes registrados';

  const classes = [
    'saga-bar',
    `saga-bar-${size}`,
    segmented ? '' : 'saga-bar-continuous',
    total > 0 && readCount === total ? 'is-complete' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safePercent}
      aria-label={label}
      className={classes}
    >
      {segmented ? (
        books.map((book, i) => {
          const isRead = book.progreso === READ_STATUS;
          return (
            <span
              key={i}
              className={'saga-seg' + (isRead ? ' is-read' : '')}
              style={{ '--i': i } as React.CSSProperties}
              title={`${book.nombre} · ${isRead ? 'Leído' : 'Pendiente'}`}
            />
          );
        })
      ) : (
        <span className="saga-fill" style={{ width: `${safePercent}%` }} />
      )}
    </div>
  );
};
