import React, { useState } from 'react';
import { Plus, X, Edit3, Trash2 } from 'lucide-react';
import { Book, Saga } from '../types/models';
import { SagaProgressBar } from './SagaProgressBar';
import { SagaShelf } from './SagaShelf';
import { LibrarySelect } from './LibrarySelect';
import { formatFriendlyErrorMessage } from '../utils/errorUtils';

export interface SagaWithBooksItem {
  saga: Saga;
  books: Book[];
  readCount: number;
  pendingCount: number;
  registeredCount: number;
  progressPercent: number;
}

export interface SagasScreenProps {
  sagasWithBooks: SagaWithBooksItem[];
  books: Book[];
  detailBookId: string | null;
  onOpenBookDetail: (id: string) => void;
  onSaveSaga: (name: string, description: string, sagaId?: string) => Promise<unknown>;
  onDeleteSaga: (saga: Saga) => void;
  onAssignBookToSaga: (bookId: string, saga: Saga, volume: number | null) => Promise<unknown>;
  onError?: (msg: string) => void;
}

export const SagasScreen: React.FC<SagasScreenProps> = ({
  sagasWithBooks,
  books,
  detailBookId,
  onOpenBookDetail,
  onSaveSaga,
  onDeleteSaga,
  onAssignBookToSaga,
  onError
}) => {
  const [sagaFormOpen, setSagaFormOpen] = useState(false);
  const [editingSaga, setEditingSaga] = useState<Saga | null>(null);
  const [sagaNameInput, setSagaNameInput] = useState('');
  const [sagaDescInput, setSagaDescInput] = useState('');
  const [sagaError, setSagaError] = useState('');
  const [assignBookId, setAssignBookId] = useState<string>('');
  const [assignVolume, setAssignVolume] = useState<string>('1');
  const [activeSagaIdForAssign, setActiveSagaIdForAssign] = useState<string | null>(null);

  const handleSaveSagaForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSagaError('');
    try {
      await onSaveSaga(sagaNameInput, sagaDescInput, editingSaga?.id);
      setSagaFormOpen(false);
      setEditingSaga(null);
      setSagaNameInput('');
      setSagaDescInput('');
    } catch (err: unknown) {
      setSagaError(
        formatFriendlyErrorMessage(err, 'No se pudo guardar la saga en este momento.')
      );
    }
  };

  const handleAssignBook = async (saga: Saga) => {
    if (!assignBookId) return;
    const volNum = assignVolume ? Number(assignVolume) : null;
    try {
      await onAssignBookToSaga(assignBookId, saga, volNum);
      setAssignBookId('');
      setAssignVolume('1');
      setActiveSagaIdForAssign(null);
    } catch (err: unknown) {
      onError?.(
        formatFriendlyErrorMessage(err, 'No se pudo vincular el libro a la saga.')
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/20 dark:border-[#242E42] pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Colección de Sagas</h1>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
            Volúmenes alineados por orden de lectura y progreso calculado sobre los
            volúmenes registrados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingSaga(null);
            setSagaNameInput('');
            setSagaDescInput('');
            setSagaError('');
            setSagaFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition"
        >
          <Plus className="w-4 h-4" /> Nueva Saga
        </button>
      </div>

      {sagaFormOpen && !editingSaga && (
        <form
          onSubmit={handleSaveSagaForm}
          className="rounded-2xl border border-amber-600/40 dark:border-amber-500/40 bg-[#fbf6ea] dark:bg-[#141A26] p-5 space-y-4 shadow-md"
        >
          <h2 className="font-serif text-lg font-bold text-amber-800 dark:text-amber-300">
            Crear Nueva Saga
          </h2>
          {sagaError && <p className="text-xs text-rose-600 dark:text-rose-400">{sagaError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="create-saga-name" className="block text-xs font-semibold mb-1">
                Nombre único de la saga *
              </label>
              <input
                id="create-saga-name"
                type="text"
                required
                autoFocus
                value={sagaNameInput}
                onChange={(e) => setSagaNameInput(e.target.value)}
                placeholder="Ej. Nacidos de la Bruma (Mistborn)"
                className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label htmlFor="create-saga-desc" className="block text-xs font-semibold mb-1">
                Descripción opcional
              </label>
              <input
                id="create-saga-desc"
                type="text"
                value={sagaDescInput}
                onChange={(e) => setSagaDescInput(e.target.value)}
                placeholder="Ej. Era 1 y Era 2 del Cosmere"
                className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSagaFormOpen(false)}
              className="rounded-xl border border-amber-900/25 dark:border-slate-700 px-4 py-2 text-xs text-stone-700 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs"
            >
              Guardar Saga
            </button>
          </div>
        </form>
      )}

      {sagasWithBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-900/30 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-transparent p-12 text-center">
          <p className="font-serif text-xl text-stone-600 dark:text-slate-300">
            Todavía no tienes sagas registradas.
          </p>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
            Crea una saga con el botón superior o asígnala directamente al añadir un libro.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sagasWithBooks.map((item) => (
            <section
              key={item.saga.id}
              className="catalog-card-panel saga-card space-y-4"
            >
              <div className="catalog-brass-tab" aria-hidden="true">
                {item.registeredCount}{' '}
                {item.registeredCount === 1 ? 'volumen' : 'volúmenes'}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 break-words leading-tight">
                    {item.saga.nombre}
                  </h2>
                  <p className="font-serif italic text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
                    {item.readCount} leídos · {item.pendingCount} pendientes
                    {item.saga.descripcion ? ` — ${item.saga.descripcion}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSagaIdForAssign === item.saga.id) {
                        setActiveSagaIdForAssign(null);
                        setAssignBookId('');
                        setAssignVolume('1');
                      } else {
                        setActiveSagaIdForAssign(item.saga.id);
                        setAssignBookId('');
                        const maxVol = item.books.reduce(
                          (max, b) => (b.volumen && b.volumen > max ? b.volumen : max),
                          0
                        );
                        setAssignVolume(String(maxVol + 1));
                      }
                    }}
                    className={
                      'saga-action-btn' +
                      (activeSagaIdForAssign === item.saga.id ? ' is-active' : '')
                    }
                    title={activeSagaIdForAssign === item.saga.id ? 'Cancelar' : 'Asignar libro'}
                    aria-label={activeSagaIdForAssign === item.saga.id ? 'Cancelar' : 'Asignar libro'}
                  >
                    {activeSagaIdForAssign === item.saga.id ? (
                      <X className="w-3.5 h-3.5" />
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Asignar libro</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (sagaFormOpen && editingSaga?.id === item.saga.id) {
                        setSagaFormOpen(false);
                        setEditingSaga(null);
                      } else {
                        setEditingSaga(item.saga);
                        setSagaNameInput(item.saga.nombre);
                        setSagaDescInput(item.saga.descripcion);
                        setSagaError('');
                        setSagaFormOpen(true);
                      }
                    }}
                    className="saga-action-btn"
                    title="Editar nombre o descripción de la saga"
                    aria-label="Editar saga"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSaga(item.saga)}
                    className="saga-action-btn is-danger"
                    title="Eliminar saga"
                    aria-label="Eliminar saga"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {sagaFormOpen && editingSaga?.id === item.saga.id && (
                <form
                  onSubmit={handleSaveSagaForm}
                  className="rounded-xl border border-amber-600/40 dark:border-amber-500/40 bg-[#f4ead4] dark:bg-[#101520] p-4 space-y-3"
                >
                  <h3 className="font-serif text-base font-bold text-amber-800 dark:text-amber-300">
                    Editar Saga
                  </h3>
                  {sagaError && <p className="text-xs text-rose-600 dark:text-rose-400">{sagaError}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`edit-saga-name-${item.saga.id}`} className="block text-xs font-semibold mb-1">
                        Nombre de la saga *
                      </label>
                      <input
                        id={`edit-saga-name-${item.saga.id}`}
                        type="text"
                        required
                        autoFocus
                        value={sagaNameInput}
                        onChange={(e) => setSagaNameInput(e.target.value)}
                        className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-saga-desc-${item.saga.id}`} className="block text-xs font-semibold mb-1">
                        Descripción opcional
                      </label>
                      <input
                        id={`edit-saga-desc-${item.saga.id}`}
                        type="text"
                        value={sagaDescInput}
                        onChange={(e) => setSagaDescInput(e.target.value)}
                        className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSagaFormOpen(false);
                        setEditingSaga(null);
                      }}
                      className="rounded-lg border border-amber-900/25 dark:border-slate-700 px-3 py-1.5 text-xs text-stone-700 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 text-xs"
                    >
                      Guardar cambios
                    </button>
                  </div>
                </form>
              )}

              <div className="flex items-center gap-3">
                <SagaProgressBar className="flex-1" books={item.books} percent={item.progressPercent} />
                <span
                  className={
                    'text-xs font-bold font-mono shrink-0 min-w-[36px] text-right ' +
                    (item.progressPercent === 100
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-800 dark:text-amber-300')
                  }
                >
                  {item.progressPercent}%
                </span>
              </div>

              {activeSagaIdForAssign === item.saga.id && (
                <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-[#f4ead4] dark:bg-[#101520] p-3.5">
                  <div className="flex-1 min-w-[200px]">
                    <label htmlFor={`assign-book-select-${item.saga.id}`} className="block text-[11px] font-semibold text-stone-700 dark:text-slate-300 mb-1">
                      Libro de tu biblioteca
                    </label>
                    <LibrarySelect
                      id={`assign-book-select-${item.saga.id}`}
                      value={assignBookId}
                      onChange={(val) => setAssignBookId(val)}
                      placeholder="— Selecciona un libro —"
                      options={[
                        { value: '', label: '— Selecciona un libro —' },
                        ...books
                          .filter((b) => b.sagaId !== item.saga.id)
                          .map((b) => ({
                            value: b.id,
                            label: `${b.nombre} (${b.autor || 'Sin autor'})`
                          }))
                      ]}
                    />
                  </div>
                  <div className="w-24 sm:w-28">
                    <label htmlFor={`assign-volume-input-${item.saga.id}`} className="block text-[11px] font-semibold text-stone-700 dark:text-slate-300 mb-1">
                      Volumen #
                    </label>
                    <input
                      id={`assign-volume-input-${item.saga.id}`}
                      type="number"
                      min="1"
                      value={assignVolume}
                      onChange={(e) => setAssignVolume(e.target.value)}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-1.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-amber-600 dark:focus:border-amber-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSagaIdForAssign(null);
                        setAssignBookId('');
                        setAssignVolume('1');
                      }}
                      className="rounded-lg border border-amber-900/25 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!assignBookId}
                      onClick={() => handleAssignBook(item.saga)}
                      className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold px-3.5 py-1.5 text-xs transition shadow-sm"
                    >
                      Vincular
                    </button>
                  </div>
                </div>
              )}

              {item.books.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-slate-400 italic">
                  No hay volúmenes asignados todavía a esta saga.
                </p>
              ) : (
                <SagaShelf
                  books={item.books}
                  onOpenDetail={onOpenBookDetail}
                  openedBookId={detailBookId}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
