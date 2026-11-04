import React from 'react';
import {
  Clock,
  Layers,
  BookOpen,
  Check,
  Plus,
  Edit2,
  X,
  ChevronDown,
  Search,
  Bookmark
} from 'lucide-react';
import { Book, Saga, StarRating } from '../../types/models';
import { ReadingStatus, STAR_OPTIONS } from '../../constants/catalogs';
import { calculateReadingTime } from '../../utils/readingTime';
import { LibrarySelect } from '../LibrarySelect';
import { inputCls, labelCls } from './styles';

interface BookFormReadingTabProps {
  puntuacion: StarRating;
  setPuntuacion: (val: StarRating) => void;
  fechaInicio: string;
  setFechaInicio: (val: string) => void;
  fechaFin: string;
  setFechaFin: (val: string) => void;
  lecturaVirtual: string;
  setLecturaVirtual: (val: string) => void;
  paginas: string;
  paginaActual: string;
  setPaginaActual: (val: string) => void;
  progreso: ReadingStatus;
  tiempoLectura: string;
  sagas: Saga[];
  existingBooks: Book[];
  selectedSagaId: string;
  setSelectedSagaId: (id: string) => void;
  newSagaName: string;
  setNewSagaName: (name: string) => void;
  volumen: string;
  setVolumen: (vol: string) => void;
  sagaMode: 'none' | 'existing' | 'new';
  setSagaMode: (mode: 'none' | 'existing' | 'new') => void;
  isSagaPickerOpen: boolean;
  setIsSagaPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sagaSearchFilter: string;
  setSagaSearchFilter: (filter: string) => void;
  isEditingSagaName: boolean;
  setIsEditingSagaName: (editing: boolean) => void;
  sagaPickerRef: React.RefObject<HTMLDivElement>;
}

export const BookFormReadingTab: React.FC<BookFormReadingTabProps> = ({
  puntuacion,
  setPuntuacion,
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  lecturaVirtual,
  setLecturaVirtual,
  paginas,
  paginaActual,
  setPaginaActual,
  progreso,
  tiempoLectura,
  sagas,
  existingBooks,
  selectedSagaId,
  setSelectedSagaId,
  newSagaName,
  setNewSagaName,
  volumen,
  setVolumen,
  sagaMode,
  setSagaMode,
  isSagaPickerOpen,
  setIsSagaPickerOpen,
  sagaSearchFilter,
  setSagaSearchFilter,
  isEditingSagaName,
  setIsEditingSagaName,
  sagaPickerRef
}) => {
  const currentSaga = selectedSagaId ? sagas.find((s) => s.id === selectedSagaId) : null;
  const activeSagaDisplayName = currentSaga
    ? currentSaga.nombre
    : (newSagaName.trim() || '');
  const hasSaga = Boolean(selectedSagaId || newSagaName.trim());

  const filteredSagas = sagas.filter((s) =>
    s.nombre.toLowerCase().includes(sagaSearchFilter.toLowerCase().trim())
  );

  return (
    <div className="space-y-5">
      {/* Rating & Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <span id="add-book-puntuacion-label" className={labelCls}>Puntuación</span>
          <LibrarySelect
            id="add-book-puntuacion"
            ariaLabel="Puntuación"
            value={puntuacion ?? ''}
            onChange={(val) =>
              setPuntuacion(
                val !== '' ? (Number(val) as StarRating) : null
              )
            }
            placeholder="Sin puntuar"
            options={[
              { value: '', label: 'Sin puntuar' },
              ...STAR_OPTIONS.map((opt) => ({
                value: opt.value,
                label: `${opt.label} (${opt.value})`
              }))
            ]}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="add-book-fecha-inicio" className={labelCls}>
            Fecha Inicio
          </label>
          <input
            id="add-book-fecha-inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="add-book-fecha-fin" className={labelCls}>
            Fecha Fin
          </label>
          <input
            id="add-book-fecha-fin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Progreso de lectura si está Leyendo */}
      {progreso === '⏳ Leyendo' && (
        <div className="rounded-xl border border-amber-600/35 dark:border-amber-500/30 bg-[#f7efe0]/90 dark:bg-[#121824]/95 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="add-book-pagina-actual" className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Página actual leída
            </label>
            {Number(paginas) > 0 && Number(paginaActual) > 0 && (
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                {Math.min(100, Math.round((Number(paginaActual) / Number(paginas)) * 100))}% completado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="add-book-pagina-actual"
              type="number"
              min={0}
              max={Number(paginas) > 0 ? Number(paginas) : 99999}
              value={paginaActual}
              onChange={(e) => setPaginaActual(e.target.value)}
              placeholder="Ej: 145"
              className={inputCls}
            />
            {Number(paginas) > 0 && (
              <span className="text-xs text-stone-500 dark:text-slate-400 whitespace-nowrap">
                de {paginas} páginas
              </span>
            )}
          </div>
        </div>
      )}

      {/* Formato y Tiempo de lectura calculado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="add-book-formato" className={labelCls}>
            Formato de lectura
          </label>
          <select
            id="add-book-formato"
            value={
              lecturaVirtual.startsWith('http')
                ? 'url'
                : ['Digital (.epub / eBook)', 'Físico (Papel)', 'Audiolibro'].includes(lecturaVirtual)
                ? lecturaVirtual
                : lecturaVirtual
                ? 'otro'
                : 'Digital (.epub / eBook)'
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'url') {
                if (!lecturaVirtual.startsWith('http')) setLecturaVirtual('https://');
              } else if (val === 'otro') {
                setLecturaVirtual('');
              } else {
                setLecturaVirtual(val);
              }
            }}
            className={inputCls}
          >
            <option value="Digital (.epub / eBook)">📱 Digital (.epub / eBook)</option>
            <option value="Físico (Papel)">📖 Físico (Papel)</option>
            <option value="Audiolibro">🎧 Audiolibro</option>
            <option value="url">🌐 Enlace Web / URL</option>
            {lecturaVirtual &&
              !['Digital (.epub / eBook)', 'Físico (Papel)', 'Audiolibro'].includes(lecturaVirtual) &&
              !lecturaVirtual.startsWith('http') && (
                <option value="otro">Personalizado: {lecturaVirtual}</option>
              )}
          </select>

          {/* Si eligió URL o tiene un enlace/personalizado, mostrar el input */}
          {(lecturaVirtual.startsWith('http') ||
            (lecturaVirtual &&
              !['Digital (.epub / eBook)', 'Físico (Papel)', 'Audiolibro'].includes(lecturaVirtual))) && (
            <input
              type="text"
              value={lecturaVirtual}
              onChange={(e) => setLecturaVirtual(e.target.value)}
              placeholder="https://... o referencia"
              className={`${inputCls} mt-2`}
            />
          )}
        </div>

        <div>
          <span className={labelCls}>Tiempo de lectura estimado / real</span>
          <div className="rounded-xl border border-amber-900/15 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-3.5 py-2.5 flex flex-col justify-between min-h-[42px]">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                {calculateReadingTime({
                  fechaInicio,
                  fechaFin,
                  paginas: paginas ? Number(paginas) : null,
                  progreso,
                  tiempoLectura
                })}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-600/20">
                Auto
              </span>
            </div>
            <span className="text-[10px] text-stone-600 dark:text-slate-400 mt-1">
              {fechaInicio && fechaFin
                ? 'Calculado por diferencia entre fecha de inicio y fin'
                : paginas
                ? 'Estimado según número de páginas (1.8 min/pág)'
                : 'Ingresa páginas o fechas para calcular'}
            </span>
          </div>
        </div>
      </div>

      {/* Nueva Asociación a Saga Literaria */}
      <div className="rounded-2xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121824] p-4 sm:p-5 space-y-3.5 shadow-sm">
        {/* Cabecera y badge de estado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/10 dark:border-[#242E42] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-stone-900 dark:text-slate-100 flex items-center gap-1.5">
                Colección o Saga Literaria
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-slate-400">
                Asocia este libro a una serie o márcalo como obra independiente.
              </p>
            </div>
          </div>

          {/* Insignia visual del estado actual */}
          <div className="self-start sm:self-auto">
            {hasSaga ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-serif font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-600/30">
                <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                <span className="truncate max-w-[200px]">{activeSagaDisplayName}</span>
                {volumen && <span className="font-sans font-normal opacity-80">· Vol. {volumen}</span>}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-500/10 text-stone-600 dark:text-slate-400 border border-stone-300/40 dark:border-stone-700/40">
                <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                Libro independiente
              </span>
            )}
          </div>
        </div>

        {/* Sagas del tirón: Chips de selección rápida */}
        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider">
            Selección rápida de saga
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Chip: Sin saga */}
            <button
              type="button"
              onClick={() => {
                setSelectedSagaId('');
                setNewSagaName('');
                setVolumen('');
                setSagaMode('none');
                setIsEditingSagaName(false);
                setIsSagaPickerOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                !hasSaga
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-[#fbf6ea]/70 dark:bg-[#151C28] border-amber-900/15 dark:border-[#283246] text-stone-700 dark:text-slate-300 hover:border-amber-500/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sin saga (Independiente)</span>
            </button>

            {/* Chips de sagas existentes directas del tirón */}
            {sagas.slice(0, 6).map((s) => {
              const isSelected = selectedSagaId === s.id;
              const booksCount = existingBooks.filter((b) => b.sagaId === s.id).length;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSagaId(s.id);
                    setNewSagaName(s.nombre);
                    setSagaMode('existing');
                    setIsEditingSagaName(false);
                    setIsSagaPickerOpen(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition border font-serif cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/25 border-amber-600 dark:border-amber-400 text-amber-950 dark:text-amber-100 font-bold shadow-sm ring-1 ring-amber-500/40'
                      : 'bg-[#fbf6ea]/70 dark:bg-[#151C28] border-amber-900/15 dark:border-[#283246] text-stone-700 dark:text-slate-300 hover:border-amber-500/50 font-medium'
                  }`}
                >
                  <Layers className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-amber-600/70 dark:text-amber-400/70'}`} />
                  <span className="truncate max-w-[150px]">{s.nombre}</span>
                  {booksCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans font-normal ${
                      isSelected
                        ? 'bg-amber-600/25 text-amber-950 dark:text-amber-100'
                        : 'bg-stone-200 dark:bg-slate-800 text-stone-600 dark:text-slate-400'
                    }`}>
                      {booksCount}
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0" />}
                </button>
              );
            })}

            {/* Botón para crear nueva saga inline */}
            <button
              type="button"
              onClick={() => {
                setSelectedSagaId('');
                setSagaMode('new');
                setIsEditingSagaName(true);
                setIsSagaPickerOpen(false);
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition border border-dashed cursor-pointer ${
                sagaMode === 'new' && !selectedSagaId
                  ? 'border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-300 font-bold ring-1 ring-amber-500/40'
                  : 'border-amber-900/30 dark:border-[#333E56] text-amber-800 dark:text-amber-400 hover:border-amber-600/60 hover:bg-amber-500/10'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva saga</span>
            </button>
          </div>
        </div>

        {/* Fila del Selector Detallado y Volumen (#) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* Selector personalizado estilo catálogo literario */}
          <div className="sm:col-span-8 relative" ref={sagaPickerRef}>
            <div className="flex items-center justify-between mb-1">
              <span id="saga-assigned-label" className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                Saga asignada
              </span>
              {selectedSagaId && !isEditingSagaName && (
                <button
                  type="button"
                  onClick={() => setIsEditingSagaName(true)}
                  className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Renombrar saga
                </button>
              )}
            </div>

            {/* Modo edición de nombre o nueva saga */}
            {(sagaMode === 'new' || isEditingSagaName) ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newSagaName}
                    onChange={(e) => {
                      setNewSagaName(e.target.value);
                      if (!selectedSagaId) setSagaMode('new');
                    }}
                    placeholder="Nombre de la saga (Ej. El Archivo de las Tormentas)..."
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    className="w-full rounded-xl border border-amber-600 dark:border-amber-400 bg-white dark:bg-[#0D1017] px-3.5 py-2 text-xs font-serif text-stone-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                {selectedSagaId && (
                  <button
                    type="button"
                    onClick={() => setIsEditingSagaName(false)}
                    className="text-xs px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-sm cursor-pointer"
                  >
                    Aceptar
                  </button>
                )}
              </div>
            ) : (
              /* Botón selector con estética de librería (NO <select> nativo) */
              <div className="relative">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSagaPickerOpen(!isSagaPickerOpen);
                      setSagaSearchFilter('');
                    }}
                    aria-expanded={isSagaPickerOpen}
                    aria-labelledby="saga-assigned-label"
                    className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs transition text-left cursor-pointer ${
                      hasSaga ? 'pr-9' : ''
                    } ${
                      hasSaga
                        ? 'border-amber-600/50 dark:border-amber-500/40 bg-white dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-sm'
                        : 'border-amber-900/20 dark:border-[#283246] bg-white dark:bg-[#141A26] text-stone-600 dark:text-slate-400 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className={`truncate font-serif ${hasSaga ? 'font-bold text-sm text-stone-900 dark:text-white' : 'italic text-stone-500'}`}>
                        {hasSaga ? activeSagaDisplayName : 'Buscar o elegir una saga de tu biblioteca...'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isSagaPickerOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {hasSaga && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSagaId('');
                        setNewSagaName('');
                        setVolumen('');
                        setSagaMode('none');
                      }}
                      title="Quitar de la saga"
                      aria-label="Quitar de la saga"
                      className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-stone-200 dark:hover:bg-slate-800 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Menú desplegable temático con buscador */}
                {isSagaPickerOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-40 rounded-2xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] shadow-2xl p-2.5 space-y-2">
                    {/* Buscador de sagas */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={sagaSearchFilter}
                        onChange={(e) => setSagaSearchFilter(e.target.value)}
                        placeholder="Buscar saga o escribir una nueva..."
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        className="w-full rounded-xl border border-amber-900/20 dark:border-[#283246] bg-white dark:bg-[#0D1017] pl-8 pr-3 py-1.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {/* Lista de sagas con scroll temático */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {/* Opción Libro Independiente */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSagaId('');
                          setNewSagaName('');
                          setVolumen('');
                          setSagaMode('none');
                          setIsSagaPickerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition cursor-pointer ${
                          !hasSaga
                            ? 'bg-amber-500/20 text-amber-950 dark:text-amber-100 font-bold'
                            : 'text-stone-700 dark:text-slate-300 hover:bg-[#efe3c8]/70 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                          <span>Libro independiente (Sin saga)</span>
                        </div>
                        {!hasSaga && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      </button>

                      <div className="border-t border-amber-900/10 dark:border-[#242E42] my-1" />

                      {/* Sagas que coinciden */}
                      {filteredSagas.map((s) => {
                        const isSelected = selectedSagaId === s.id;
                        const count = existingBooks.filter((b) => b.sagaId === s.id).length;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedSagaId(s.id);
                              setNewSagaName(s.nombre);
                              setSagaMode('existing');
                              setIsEditingSagaName(false);
                              setIsSagaPickerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition font-serif cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/25 text-amber-950 dark:text-amber-100 font-bold'
                                : 'text-stone-800 dark:text-slate-200 hover:bg-[#efe3c8]/70 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="truncate">{s.nombre}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-sans">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200/80 dark:bg-slate-800 text-stone-600 dark:text-slate-400 font-normal">
                                {count} libros
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />}
                            </div>
                          </button>
                        );
                      })}

                      {filteredSagas.length === 0 && !sagaSearchFilter.trim() && (
                        <p className="text-xs text-stone-500 text-center py-2">
                          No hay sagas registradas todavía.
                        </p>
                      )}

                      {/* Opción para crear una nueva saga si se busca un texto inexistente */}
                      {sagaSearchFilter.trim() &&
                        !sagas.some(
                          (s) => s.nombre.toLowerCase().trim() === sagaSearchFilter.toLowerCase().trim()
                        ) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSagaId('');
                              setNewSagaName(sagaSearchFilter.trim());
                              setSagaMode('new');
                              setIsSagaPickerOpen(false);
                            }}
                            className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs text-left bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-100 font-semibold transition border border-dashed border-amber-600/40 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                            <span>Crear nueva saga: «<strong>{sagaSearchFilter.trim()}</strong>»</span>
                          </button>
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input del Volumen (#) */}
          <div className="sm:col-span-4">
            <label htmlFor="add-book-volumen" className="block text-xs font-semibold text-stone-800 dark:text-slate-200 mb-1">
              Volumen en la saga (#)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700 dark:text-amber-400 select-none">
                #
              </span>
              <input
                id="add-book-volumen"
                type="number"
                min="1"
                step="1"
                disabled={!hasSaga}
                value={volumen}
                onChange={(e) => setVolumen(e.target.value)}
                placeholder={hasSaga ? 'Ej. 1, 2...' : 'Sin saga'}
                className={`w-full rounded-xl border pl-7 pr-3 py-2 text-xs font-semibold transition ${
                  hasSaga
                    ? 'border-amber-900/25 dark:border-[#283246] bg-white dark:bg-[#0D1017] text-stone-900 dark:text-slate-100 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30'
                    : 'border-dashed border-stone-300 dark:border-slate-800 bg-stone-100/60 dark:bg-slate-900/60 text-stone-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            {hasSaga && (
              <p className="text-[11px] text-stone-600 dark:text-slate-400 mt-1 leading-tight">
                {volumen ? `Libro número ${volumen} de la serie.` : 'Indica el orden del libro en la saga.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
