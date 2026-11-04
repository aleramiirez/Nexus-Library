import React from 'react';
import { SagaProgressBar } from './SagaProgressBar';
import { Book, Saga } from '../types/models';
import '../dashboard-panels.css';

interface SagaWithBooksItem {
  saga: Saga;
  books: Book[];
  readCount: number;
  registeredCount: number;
  progressPercent: number;
}

interface DashboardSagasPanelProps {
  sagasWithBooks: SagaWithBooksItem[];
  totalSagasCount: number;
  onNavigateToSagas: () => void;
}

export const DashboardSagasPanel: React.FC<DashboardSagasPanelProps> = ({
  sagasWithBooks,
  totalSagasCount,
  onNavigateToSagas
}) => {
  // Mostramos 4 sagas para mantener perfecta proporción con el panel de lectura
  const maxSagas = 4;
  const visibleSagas = sagasWithBooks.slice(0, maxSagas);
  const remainingCount =
    totalSagasCount > visibleSagas.length
      ? totalSagasCount - visibleSagas.length
      : Math.max(0, sagasWithBooks.length - visibleSagas.length);

  return (
    <div className="catalog-card-panel h-full flex flex-col justify-between">
      {/* Pestaña de latón de la ficha de biblioteca */}
      <div className="catalog-brass-tab" aria-hidden="true">
        Mis sagas
      </div>

      <div className="flex-1 flex flex-col justify-between">
        {/* Cabecera con enlace a gestión */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <span className="text-[11px] font-serif italic text-stone-600 dark:text-slate-400">
            {sagasWithBooks.length > 0
              ? `${sagasWithBooks.length} ${sagasWithBooks.length === 1 ? 'saga activa' : 'sagas activas'}`
              : 'Colecciones'}
          </span>
          <button
            type="button"
            onClick={onNavigateToSagas}
            className="text-xs font-semibold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:underline transition-colors ml-auto"
          >
            Gestionar ({totalSagasCount})
          </button>
        </div>

        {/* Lista de fichas de sagas */}
        {sagasWithBooks.length === 0 ? (
          <div className="py-6 my-auto text-center text-xs text-stone-600 dark:text-slate-400">
            <p className="font-serif text-sm font-semibold text-stone-800 dark:text-stone-300 mb-1">
              Sin sagas activas
            </p>
            <p className="leading-relaxed max-w-xs mx-auto">
              Asigna una saga a tus libros para ver aquí el progreso de lectura y los volúmenes completados.
            </p>
            <button
              type="button"
              onClick={onNavigateToSagas}
              className="mt-3 inline-block font-semibold text-amber-800 dark:text-amber-400 hover:underline"
            >
              Crear primera saga →
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-around py-0.5 space-y-2.5 sm:space-y-3">
            {visibleSagas.map((item) => (
              <div
                key={item.saga.id}
                onClick={onNavigateToSagas}
                className="group cursor-pointer py-1 transition-all"
                title={`Ver saga ${item.saga.nombre}`}
              >
                <div className="flex items-baseline justify-between text-xs sm:text-sm font-semibold mb-1">
                  <span className="font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate transition-colors pr-2">
                    {item.saga.nombre}
                  </span>
                  <span className="font-serif italic text-xs text-stone-600 dark:text-stone-400 shrink-0">
                    {item.readCount} de {item.registeredCount} leídos
                  </span>
                </div>
                <SagaProgressBar size="sm" books={item.books} percent={item.progressPercent} />
              </div>
            ))}
          </div>
        )}
      </div>

      {remainingCount > 0 && (
        <div className="pt-2.5 mt-2 border-t border-amber-900/10 dark:border-amber-400/10 text-right">
          <button
            type="button"
            onClick={onNavigateToSagas}
            className="text-[11px] font-semibold text-stone-600 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
          >
            + {remainingCount} {remainingCount === 1 ? 'saga más' : 'sagas más'} →
          </button>
        </div>
      )}
    </div>
  );
};
