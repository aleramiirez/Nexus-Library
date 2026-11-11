import React from 'react';
import {
  Images,
  CheckCircle2
} from 'lucide-react';
import { Genre, GENRES, ReadingStatus, READING_STATUSES, Subgenre } from '../../constants/catalogs';
import { BookCover } from '../BookCover';
import { LibrarySelect } from '../LibrarySelect';
import { inputCls, labelCls } from './styles';

interface BookFormEssentialTabProps {
  nombre: string;
  setNombre: (val: string) => void;
  autor: string;
  setAutor: (val: string) => void;
  existingAuthors?: string[];
  sagaNombre?: string;
  onSagaChange?: (val: string) => void;
  volumen?: string;
  setVolumen?: (val: string) => void;
  existingSagas?: string[];
  genero: Genre | '';
  setGenero: (val: Genre | '') => void;
  subgeneros: Subgenre[];
  setSubgeneros: React.Dispatch<React.SetStateAction<Subgenre[]>>;
  subgenreFilterText: string;
  setSubgenreFilterText: (val: string) => void;
  showAllSubgenres: boolean;
  setShowAllSubgenres: React.Dispatch<React.SetStateAction<boolean>>;
  displayedSubgenres: Subgenre[];
  isSubgenreActive: (sub: Subgenre) => boolean;
  toggleSubgenre: (sub: Subgenre) => void;
  progreso: ReadingStatus;
  setProgreso: (val: ReadingStatus) => void;
  fechaInicio: string;
  setFechaInicio: (val: string) => void;
  fechaFin: string;
  setFechaFin: (val: string) => void;
  portadaUrl: string;
  portadaFallbackUrl: string;
  customDataUrl?: string;
  onOpenCoverPicker: () => void;
  coverBadgeMsg: string | null;
}

export const BookFormEssentialTab: React.FC<BookFormEssentialTabProps> = ({
  nombre,
  setNombre,
  autor,
  setAutor,
  existingAuthors = [],
  sagaNombre = '',
  onSagaChange,
  volumen = '',
  setVolumen,
  existingSagas = [],
  genero,
  setGenero,
  subgeneros,
  setSubgeneros,
  subgenreFilterText,
  setSubgenreFilterText,
  showAllSubgenres,
  setShowAllSubgenres,
  displayedSubgenres,
  isSubgenreActive,
  toggleSubgenre,
  progreso,
  setProgreso,
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  portadaUrl,
  portadaFallbackUrl,
  customDataUrl,
  onOpenCoverPicker,
  coverBadgeMsg
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Cover preview */}
      <div className="md:col-span-3 flex flex-col items-center">
        <button
          type="button"
          onClick={onOpenCoverPicker}
          aria-label="Cambiar portada del libro"
          title="Haz clic para elegir otra portada de este libro"
          className="group relative w-40 md:w-full max-w-[190px] cursor-pointer rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.02] shadow-md text-left p-0 border-0 bg-transparent block"
        >
          <BookCover
            nombre={nombre || 'Título del libro'}
            autor={autor || 'Autor'}
            portadaUrl={customDataUrl || portadaUrl}
            portadaFallbackUrl={portadaFallbackUrl}
            portadaDataUrl={customDataUrl}
          />
          {/* Overlay interactivo en hover */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-3 text-center text-white pointer-events-none">
            <div className="p-2 rounded-full bg-amber-500 text-stone-950 shadow-md">
              <Images className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold font-serif leading-tight">
              Cambiar portada
            </span>
            <span className="text-[10px] text-amber-200">
              Ver otras ediciones
            </span>
          </div>
        </button>

        {/* Botón explícito debajo de la portada */}
        <button
          type="button"
          onClick={onOpenCoverPicker}
          className="mt-3 w-40 md:w-full max-w-[190px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-600/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer"
        >
          <Images className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span>Elegir otra portada</span>
        </button>

        {coverBadgeMsg && (
          <div className="mt-2 w-40 md:w-full max-w-[190px] px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium text-center flex items-center justify-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{coverBadgeMsg}</span>
          </div>
        )}
      </div>

      <div className="md:col-span-9 space-y-4">
        {/* Title & Author */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="add-book-nombre" className={labelCls}>
              Nombre (Título del libro) *
            </label>
            <input
              id="add-book-nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="add-book-autor" className={labelCls}>
              Autor
            </label>
            <input
              id="add-book-autor"
              list="book-form-authors-datalist"
              type="text"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              className={inputCls}
              placeholder="Ej. Brandon Sanderson..."
              autoComplete="off"
            />
            <datalist id="book-form-authors-datalist">
              {existingAuthors.map((authorName) => (
                <option key={authorName} value={authorName} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Saga / Serie & Volumen (con autocompletado de sagas existentes) */}
        {onSagaChange && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label htmlFor="add-book-saga" className={labelCls}>
                  Saga o Serie (Opcional)
                </label>
                {sagaNombre && (
                  <button
                    type="button"
                    onClick={() => onSagaChange('')}
                    className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Quitar saga
                  </button>
                )}
              </div>
              <input
                id="add-book-saga"
                list="book-form-sagas-datalist"
                type="text"
                value={sagaNombre}
                onChange={(e) => onSagaChange(e.target.value)}
                className={inputCls}
                placeholder="Ej. Nacidos de la Bruma, Crónica del Asesino de Reyes..."
                autoComplete="off"
              />
              <datalist id="book-form-sagas-datalist">
                {existingSagas.map((sName) => (
                  <option key={sName} value={sName} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="add-book-volumen" className={labelCls}>
                Volumen (#)
              </label>
              <input
                id="add-book-volumen"
                type="number"
                min="1"
                max="999"
                value={volumen}
                onChange={(e) => setVolumen?.(e.target.value)}
                disabled={!sagaNombre.trim()}
                placeholder={sagaNombre.trim() ? 'Ej. 1, 2...' : 'Sin saga'}
                className={inputCls + (!sagaNombre.trim() ? ' opacity-60 cursor-not-allowed' : '')}
              />
            </div>
          </div>
        )}

        {/* Genre & Reading status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span id="add-book-genero-label" className={labelCls}>
              Género (Selección única)
            </span>
            <LibrarySelect
              id="add-book-genero"
              ariaLabel="Género (Selección única)"
              value={genero}
              onChange={(val) => setGenero(val as Genre | '')}
              placeholder="— Sin seleccionar —"
              options={[
                { value: '', label: '— Sin seleccionar —' },
                ...GENRES.map((g) => ({ value: g, label: g }))
              ]}
              className={inputCls}
            />
          </div>

          <div>
            <span id="reading-status-group-label" className={labelCls}>Estado de lectura</span>
            <div role="group" aria-labelledby="reading-status-group-label" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {READING_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setProgreso(st);
                    const d = new Date();
                    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    if (st === '⏳ Leyendo' && !fechaInicio) {
                      setFechaInicio(today);
                    }
                    if (st === '✅ Leído' && !fechaFin) {
                      setFechaFin(today);
                    }
                  }}
                  className={
                    'py-2.5 px-2 rounded-xl text-xs font-semibold border transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ' +
                    (progreso === st
                      ? 'bg-amber-500 text-slate-950 border-amber-600 dark:border-amber-400 font-bold shadow-md'
                      : 'border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#0e1420] text-stone-700 dark:text-slate-300 hover:border-amber-500/50 hover:bg-[#fffcf5] dark:hover:bg-[#151c2a]')
                  }
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subgenres */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <label className="text-xs font-semibold">
                Subgéneros (Selección múltiple: {subgeneros.length} seleccionados)
              </label>
              {subgenreFilterText.trim() ? (
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mt-0.5">
                  🔍 {displayedSubgenres.length} subgénero{displayedSubgenres.length === 1 ? '' : 's'} encontrado{displayedSubgenres.length === 1 ? '' : 's'}
                </p>
              ) : genero && !showAllSubgenres ? (
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mt-0.5">
                  ✨ Recomendados para este género
                </p>
              ) : (
                <p className="text-[11px] font-medium text-stone-600 dark:text-slate-400 mt-0.5">
                  Explorando todos los subgéneros
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {genero && (
                <button
                  type="button"
                  onClick={() => setShowAllSubgenres((prev) => !prev)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-amber-900/20 dark:border-slate-700 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 transition cursor-pointer"
                >
                  {showAllSubgenres ? 'Ver solo recomendados' : 'Mostrar todos los subgéneros'}
                </button>
              )}

              {subgeneros.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSubgeneros([])}
                  className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-medium cursor-pointer"
                >
                  Limpiar subgéneros
                </button>
              )}
            </div>
          </div>

          {/* Buscador / Filtro Rápido */}
          <div className="mb-2">
            <div className="relative">
              <input
                type="text"
                value={subgenreFilterText}
                onChange={(e) => setSubgenreFilterText(e.target.value)}
                placeholder="Filtrar subgéneros..."
                className="w-full rounded-xl border border-amber-900/20 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-3 py-1.5 text-xs text-stone-800 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {subgenreFilterText && (
                <button
                  type="button"
                  onClick={() => setSubgenreFilterText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs px-1 cursor-pointer"
                  title="Borrar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-2.5 scroll-smooth">
            {displayedSubgenres.length > 0 ? (
              displayedSubgenres.map((sub) => {
                const active = isSubgenreActive(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubgenre(sub)}
                    className={
                      'px-2.5 py-1 rounded-full text-xs border transition cursor-pointer ' +
                      (active
                        ? 'bg-amber-500/25 border-amber-600 dark:border-amber-400 text-amber-900 dark:text-amber-200 font-medium ring-1 ring-amber-500/30'
                        : 'border-amber-900/20 dark:border-[#253044] text-stone-600 dark:text-slate-400 hover:border-amber-600/50 dark:hover:border-slate-500')
                    }
                  >
                    {sub}
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-stone-600 dark:text-slate-400 italic py-2 px-1">
                No se encontraron subgéneros para "{subgenreFilterText}".
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
