import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  AlertCircle,
  BookPlus,
  BookOpen,
  Library,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Layers,
  Check,
  Plus,
  Edit2,
  Hash,
  Images
} from 'lucide-react';
import {
  BibliographicCandidate,
  Book,
  Saga,
  StarRating
} from '../types/models';
import {
  GENRES,
  Genre,
  READING_STATUSES,
  ReadingStatus,
  STAR_OPTIONS,
  SUBGENRES,
  Subgenre
} from '../constants/catalogs';
import { bookMetadataService } from '../services/bookMetadataService';
import { BookCover } from './BookCover';
import { BookCoverPickerModal, SelectedCoverPayload } from './BookCoverPickerModal';
import { isDuplicateBook } from '../services/importExportService';
import { tryCacheCoverDataUrl } from '../services/coverService';

interface AddEditBookModalProps {
  isOpen: boolean;
  editingBook: Book | null;
  initialCandidate?: BibliographicCandidate | null;
  sagas: Saga[];
  existingBooks: Book[];
  onClose: () => void;
  onSave: (
    bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
}

type TabId = 'essential' | 'reading' | 'edition';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.FC<{ className?: string }>;
  shortLabel: string;
}

const TABS: TabDef[] = [
  { id: 'essential', label: 'Datos Esenciales', icon: BookPlus, shortLabel: 'Esencial' },
  { id: 'reading', label: 'Lectura & Saga', icon: BookOpen, shortLabel: 'Lectura' },
  { id: 'edition', label: 'Edición & Detalles', icon: Info, shortLabel: 'Detalles' }
];

export const AddEditBookModal: React.FC<AddEditBookModalProps> = ({
  isOpen,
  editingBook,
  initialCandidate,
  sagas,
  existingBooks,
  onClose,
  onSave
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<BibliographicCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('essential');

  const [nombre, setNombre] = useState('');
  const [autor, setAutor] = useState('');
  const [genero, setGenero] = useState<Genre | ''>('');
  const [subgeneros, setSubgeneros] = useState<Subgenre[]>([]);
  const [fechaPublicacion, setFechaPublicacion] = useState<string>('');
  const [paginas, setPaginas] = useState<string>('');
  const [puntuacion, setPuntuacion] = useState<StarRating>(null);
  const [progreso, setProgreso] = useState<ReadingStatus>('❌ No Leído');
  const [sagaMode, setSagaMode] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedSagaId, setSelectedSagaId] = useState<string>('');
  const [newSagaName, setNewSagaName] = useState<string>('');
  const [volumen, setVolumen] = useState<string>('');
  const [isSagaPickerOpen, setIsSagaPickerOpen] = useState(false);
  const [sagaSearchFilter, setSagaSearchFilter] = useState('');
  const [isEditingSagaName, setIsEditingSagaName] = useState(false);
  const sagaPickerRef = useRef<HTMLDivElement>(null);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [lecturaVirtual, setLecturaVirtual] = useState<string>('');
  const [tiempoLectura, setTiempoLectura] = useState<string>('');

  const [isbn, setIsbn] = useState('');
  const [editorial, setEditorial] = useState('');
  const [idioma, setIdioma] = useState('');
  const [edicion, setEdicion] = useState('');
  const [sinopsis, setSinopsis] = useState('');
  const [portadaUrl, setPortadaUrl] = useState('');
  const [portadaFallbackUrl, setPortadaFallbackUrl] = useState('');
  const [customDataUrl, setCustomDataUrl] = useState<string | undefined>(undefined);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const [coverBadgeMsg, setCoverBadgeMsg] = useState<string | null>(null);

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sagaPickerRef.current && !sagaPickerRef.current.contains(e.target as Node)) {
        setIsSagaPickerOpen(false);
      }
    };
    if (isSagaPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSagaPickerOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setCandidates([]);
    setSearchError('');
    setSelectedCandidateId(null);
    setFormError('');
    setActiveTab('essential');

    if (editingBook) {
      setNombre(editingBook.nombre);
      setAutor(editingBook.autor);
      setGenero(editingBook.genero);
      setSubgeneros(editingBook.subgeneros);
      setFechaPublicacion(
        editingBook.fechaPublicacion ? String(editingBook.fechaPublicacion) : ''
      );
      setPaginas(editingBook.paginas ? String(editingBook.paginas) : '');
      setPuntuacion(editingBook.puntuacion);
      setProgreso(editingBook.progreso);
      if (editingBook.sagaId) {
        const matchedSaga = sagas.find((s) => s.id === editingBook.sagaId);
        if (matchedSaga) {
          setSagaMode('existing');
          setSelectedSagaId(matchedSaga.id);
          setNewSagaName(matchedSaga.nombre);
        } else if (editingBook.sagaNombre) {
          const byName = sagas.find(
            (s) => s.nombre.trim().toLowerCase() === editingBook.sagaNombre.trim().toLowerCase()
          );
          if (byName) {
            setSagaMode('existing');
            setSelectedSagaId(byName.id);
            setNewSagaName(byName.nombre);
          } else {
            setSagaMode('new');
            setSelectedSagaId('');
            setNewSagaName(editingBook.sagaNombre);
          }
        } else {
          setSagaMode('none');
          setSelectedSagaId('');
          setNewSagaName('');
        }
      } else if (editingBook.sagaNombre) {
        const byName = sagas.find(
          (s) => s.nombre.trim().toLowerCase() === editingBook.sagaNombre.trim().toLowerCase()
        );
        if (byName) {
          setSagaMode('existing');
          setSelectedSagaId(byName.id);
          setNewSagaName(byName.nombre);
        } else {
          setSagaMode('new');
          setSelectedSagaId('');
          setNewSagaName(editingBook.sagaNombre);
        }
      } else {
        setSagaMode('none');
        setSelectedSagaId('');
        setNewSagaName('');
      }
      setVolumen(editingBook.volumen ? String(editingBook.volumen) : '');
      setFechaInicio(editingBook.fechaInicio);
      setFechaFin(editingBook.fechaFin);
      setLecturaVirtual(editingBook.lecturaVirtual);
      setTiempoLectura(editingBook.tiempoLectura);
      setIsbn(editingBook.isbn);
      setEditorial(editingBook.editorial);
      setIdioma(editingBook.idioma);
      setEdicion(editingBook.edicion);
      setSinopsis(editingBook.sinopsis);
      setPortadaUrl(editingBook.portadaUrl);
      setPortadaFallbackUrl(editingBook.portadaFallbackUrl);
      setCustomDataUrl(editingBook.portadaDataUrl);
      setIsCoverPickerOpen(false);
      setCoverBadgeMsg(null);
    } else if (initialCandidate) {
      applyCandidate(initialCandidate);
      setCustomDataUrl(undefined);
      setIsCoverPickerOpen(false);
      setCoverBadgeMsg(null);
    } else {
      setNombre('');
      setAutor('');
      setGenero('');
      setSubgeneros([]);
      setFechaPublicacion('');
      setPaginas('');
      setPuntuacion(null);
      setProgreso('❌ No Leído');
      setSagaMode('none');
      setSelectedSagaId('');
      setNewSagaName('');
      setVolumen('');
      setFechaInicio('');
      setFechaFin('');
      setLecturaVirtual('');
      setTiempoLectura('');
      setIsbn('');
      setEditorial('');
      setIdioma('');
      setEdicion('');
      setSinopsis('');
      setPortadaUrl('');
      setPortadaFallbackUrl('');
      setCustomDataUrl(undefined);
      setIsCoverPickerOpen(false);
      setCoverBadgeMsg(null);
    }
  }, [isOpen, editingBook, initialCandidate]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setCandidates([]);
      setIsSearching(false);
      setSearchError('');
      return;
    }

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      setSearchError('');
      try {
        const results = await bookMetadataService.searchBooks(trimmed, controller.signal);
        setCandidates(results);
        if (results.length === 1 && !editingBook && !nombre) {
          applyCandidate(results[0]);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSearchError(
          'No se pudo conectar con los catálogos bibliográficos. Puedes volver a intentarlo o completar los datos manualmente.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  if (!isOpen) return null;

  const applyCandidate = (cand: BibliographicCandidate) => {
    setSelectedCandidateId(cand.id);
    setNombre(cand.nombre);
    setAutor(cand.autor);
    setFechaPublicacion(cand.fechaPublicacion ? String(cand.fechaPublicacion) : '');
    setPaginas(cand.paginas ? String(cand.paginas) : '');
    setIsbn(cand.isbn);
    setEditorial(cand.editorial);
    setIdioma(cand.idioma);
    setEdicion(cand.edicion);
    setSinopsis(cand.sinopsis);
    setPortadaUrl(cand.portadaUrl);
    setPortadaFallbackUrl(cand.portadaFallbackUrl);
    setCustomDataUrl(undefined);
    setCoverBadgeMsg(null);

    if (!editingBook) {
      setGenero(cand.suggestedGenre);
      setSubgeneros(cand.suggestedSubgenres);
    }
  };

  const handleCoverSelected = (payload: SelectedCoverPayload) => {
    setPortadaUrl(payload.portadaUrl);
    if (payload.portadaFallbackUrl !== undefined) {
      setPortadaFallbackUrl(payload.portadaFallbackUrl);
    }
    if (payload.portadaDataUrl) {
      setCustomDataUrl(payload.portadaDataUrl);
    } else {
      setCustomDataUrl(undefined);
    }
    if (payload.editionInfo?.publisher && !editorial.trim()) {
      setEditorial(payload.editionInfo.publisher);
    }
    if (payload.editionInfo?.year && !fechaPublicacion.trim()) {
      setFechaPublicacion(String(payload.editionInfo.year));
    }
    setCoverBadgeMsg(
      payload.editionInfo?.publisher
        ? `Edición de ${payload.editionInfo.publisher}`
        : 'Portada actualizada'
    );
  };

  const toggleSubgenre = (sub: Subgenre) => {
    setSubgeneros((prev) =>
      prev.includes(sub) ? prev.filter((item) => item !== sub) : [...prev, sub]
    );
  };

  const tabIndex = TABS.findIndex((t) => t.id === activeTab);
  const isFirstTab = tabIndex === 0;
  const isLastTab = tabIndex === TABS.length - 1;

  const goNextTab = () => {
    if (!isLastTab) setActiveTab(TABS[tabIndex + 1].id);
  };
  const goPrevTab = () => {
    if (!isFirstTab) setActiveTab(TABS[tabIndex - 1].id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanNombre = nombre.trim();
    if (!cleanNombre) {
      setFormError('El título del libro es obligatorio.');
      setActiveTab('essential');
      return;
    }

    const otherBooks = editingBook
      ? existingBooks.filter((b) => b.id !== editingBook.id)
      : existingBooks;
    const dup = isDuplicateBook(
      { nombre: cleanNombre, autor: autor.trim(), isbn: isbn.trim() },
      otherBooks
    );
    if (dup.duplicate) {
      setFormError('Este libro ya está registrado en tu biblioteca (' + String(dup.reason) + ').');
      return;
    }

    let finalSagaId: string | null = null;
    let finalSagaNombre = '';
    if (selectedSagaId) {
      const found = sagas.find((s) => s.id === selectedSagaId);
      if (found) {
        finalSagaId = found.id;
        finalSagaNombre = newSagaName.trim() || found.nombre;
      }
    } else if (newSagaName.trim()) {
      finalSagaNombre = newSagaName.trim();
    }

    setIsSaving(true);
    try {
      const cachedDataUrl =
        customDataUrl ||
        (portadaUrl && portadaUrl !== editingBook?.portadaUrl
          ? await tryCacheCoverDataUrl(portadaUrl)
          : editingBook?.portadaDataUrl);

      await onSave(
        {
          nombre: cleanNombre,
          autor: autor.trim(),
          genero,
          subgeneros,
          fechaPublicacion: fechaPublicacion ? Number(fechaPublicacion) : null,
          paginas: paginas ? Number(paginas) : null,
          puntuacion,
          progreso,
          sagaId: finalSagaId,
          sagaNombre: finalSagaNombre,
          volumen: volumen ? Number(volumen) : null,
          fechaInicio,
          fechaFin,
          lecturaVirtual: lecturaVirtual.trim(),
          tiempoLectura,
          isbn: isbn.trim(),
          editorial: editorial.trim(),
          idioma: idioma.trim(),
          edicion: edicion.trim(),
          sinopsis: sinopsis.trim(),
          portadaUrl: portadaUrl.trim(),
          portadaFallbackUrl: portadaFallbackUrl.trim(),
          portadaDataUrl: cachedDataUrl
        },
        editingBook?.id
      );
      onClose();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Ocurrió un error al guardar el libro.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* ───── shared input class ───── */
  const inputCls =
    'w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-sm focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition';
  const inputSmCls =
    'w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-2 text-xs focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition';
  const labelCls = 'block text-xs font-semibold mb-1';

  /* ───── TAB: essential ───── */
  const renderEssentialTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Cover preview */}
      <div className="md:col-span-3 flex flex-col items-center">
        <div
          className="group relative w-40 md:w-full max-w-[190px] cursor-pointer rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.02] shadow-md"
          onClick={() => setIsCoverPickerOpen(true)}
          title="Haz clic para elegir otra portada de este libro"
        >
          <BookCover
            nombre={nombre || 'Título del libro'}
            autor={autor || 'Autor'}
            portadaUrl={customDataUrl || portadaUrl}
            portadaFallbackUrl={portadaFallbackUrl}
            portadaDataUrl={customDataUrl}
          />
          {/* Overlay interactivo en hover */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-3 text-center text-white">
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
        </div>

        {/* Botón explícito debajo de la portada */}
        <button
          type="button"
          onClick={() => setIsCoverPickerOpen(true)}
          className="mt-3 w-40 md:w-full max-w-[190px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-600/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 transition shadow-sm"
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
            <label className={labelCls}>
              Nombre (Título del libro) *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Autor</label>
            <input
              type="text"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Genre & Reading status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Género (Selección única)
            </label>
            <select
              value={genero}
              onChange={(e) => setGenero(e.target.value as Genre | '')}
              className={inputCls}
            >
              <option value="">— Sin seleccionar —</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Estado de lectura</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                    'py-2 px-2 rounded-lg text-xs font-medium border transition ' +
                    (progreso === st
                      ? 'bg-amber-500/25 border-amber-600 dark:border-amber-400 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'border-amber-900/25 dark:border-[#283246] bg-[#f4ead4] dark:bg-[#0D1017] text-stone-700 dark:text-slate-400')
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold">
              Subgéneros (Selección múltiple: {subgeneros.length} seleccionados)
            </label>
            {subgeneros.length > 0 && (
              <button
                type="button"
                onClick={() => setSubgeneros([])}
                className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-medium"
              >
                Limpiar subgéneros
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-2.5">
            {SUBGENRES.map((sub) => {
              const active = subgeneros.includes(sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toggleSubgenre(sub)}
                  className={
                    'px-2.5 py-1 rounded-full text-xs border transition ' +
                    (active
                      ? 'bg-amber-500/25 border-amber-600 dark:border-amber-400 text-amber-900 dark:text-amber-200 font-medium'
                      : 'border-amber-900/20 dark:border-[#253044] text-stone-600 dark:text-slate-400 hover:border-amber-600/50 dark:hover:border-slate-500')
                  }
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  /* ───── TAB: reading ───── */
  const renderReadingTab = () => (
    <div className="space-y-5">
      {/* Rating & Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Puntuación</label>
          <select
            value={puntuacion ?? ''}
            onChange={(e) =>
              setPuntuacion(
                e.target.value ? (Number(e.target.value) as StarRating) : null
              )
            }
            className={inputCls}
          >
            <option value="">Sin puntuar</option>
            {STAR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Fecha Inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Fecha Fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Virtual reading & time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Lectura Virtual (URL o referencia)
          </label>
          <input
            type="text"
            value={lecturaVirtual}
            onChange={(e) => setLecturaVirtual(e.target.value)}
            placeholder="https://... o Kindle / Kobo"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Tiempo de lectura</label>
          <input
            type="text"
            value={tiempoLectura}
            onChange={(e) => setTiempoLectura(e.target.value)}
            placeholder="Ej. 2 semanas, 14h..."
            className={inputCls}
          />
        </div>
      </div>

      {/* Nueva Asociación a Saga Literaria */}
      {(() => {
        const currentSaga = selectedSagaId ? sagas.find((s) => s.id === selectedSagaId) : null;
        const activeSagaDisplayName = currentSaga
          ? currentSaga.nombre
          : (newSagaName.trim() || '');
        const hasSaga = Boolean(selectedSagaId || newSagaName.trim());

        const filteredSagas = sagas.filter((s) =>
          s.nombre.toLowerCase().includes(sagaSearchFilter.toLowerCase().trim())
        );

        return (
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
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition border font-serif ${
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
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition border border-dashed ${
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
                  <label className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                    Saga asignada
                  </label>
                  {selectedSagaId && !isEditingSagaName && (
                    <button
                      type="button"
                      onClick={() => setIsEditingSagaName(true)}
                      className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-semibold"
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
                        autoFocus
                        className="w-full rounded-xl border border-amber-600 dark:border-amber-400 bg-white dark:bg-[#0D1017] px-3.5 py-2 text-xs font-serif text-stone-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                    {selectedSagaId && (
                      <button
                        type="button"
                        onClick={() => setIsEditingSagaName(false)}
                        className="text-xs px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-sm"
                      >
                        Aceptar
                      </button>
                    )}
                  </div>
                ) : (
                  /* Botón selector con estética de librería (NO <select> nativo) */
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSagaPickerOpen(!isSagaPickerOpen);
                        setSagaSearchFilter('');
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs transition text-left ${
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
                        {hasSaga && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSagaId('');
                              setNewSagaName('');
                              setVolumen('');
                              setSagaMode('none');
                            }}
                            title="Quitar de la saga"
                            className="p-1 rounded-md hover:bg-stone-200 dark:hover:bg-slate-800 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isSagaPickerOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

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
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition ${
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
                                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition font-serif ${
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
                                className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs text-left bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-100 font-semibold transition border border-dashed border-amber-600/40"
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
                <label className="block text-xs font-semibold text-stone-800 dark:text-slate-200 mb-1">
                  Volumen en la saga (#)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700 dark:text-amber-400 select-none">
                    #
                  </span>
                  <input
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
                  <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-1 leading-tight">
                    {volumen ? `Libro número ${volumen} de la serie.` : 'Indica el orden del libro en la saga.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  /* ───── TAB: edition ───── */
  const renderEditionTab = () => (
    <div className="space-y-5">
      {/* Year, Pages, ISBN */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Año Publicación</label>
          <input
            type="number"
            value={fechaPublicacion}
            onChange={(e) => setFechaPublicacion(e.target.value)}
            placeholder="Ej. 2007"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Páginas</label>
          <input
            type="number"
            min="1"
            value={paginas}
            onChange={(e) => setPaginas(e.target.value)}
            placeholder="Ej. 880"
            className={inputCls}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>ISBN</label>
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="ISBN-13 / ISBN-10"
            className={inputCls}
          />
        </div>
      </div>

      {/* Publisher, Language, Edition */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Editorial</label>
          <input
            type="text"
            value={editorial}
            onChange={(e) => setEditorial(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Idioma</label>
          <input
            type="text"
            value={idioma}
            onChange={(e) => setIdioma(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Edición</label>
          <input
            type="text"
            value={edicion}
            onChange={(e) => setEdicion(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Cover URL */}
      <div>
        <label className="block text-[11px] text-stone-600 dark:text-slate-400 mb-1">
          URL de portada (autocompletada o personalizada)
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={portadaUrl}
            onChange={(e) => setPortadaUrl(e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setIsCoverPickerOpen(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border border-amber-600/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 transition flex items-center gap-1.5 shrink-0"
          >
            <Images className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Explorar ediciones</span>
          </button>
        </div>
      </div>

      {/* Synopsis */}
      <div>
        <label className={labelCls}>Sinopsis</label>
        <textarea
          rows={4}
          value={sinopsis}
          onChange={(e) => setSinopsis(e.target.value)}
          className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-2.5 text-xs focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition"
        />
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[92dvh] sm:h-[86vh] max-h-[94dvh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl border-t sm:border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden sm:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header (Fixed / Pinned top) ─── */}
        <div className="shrink-0 flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 sm:py-3.5 bg-[#f0e5cc] dark:bg-[#101520]">
          <div className="flex items-center gap-2.5">
            <BookPlus className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="font-serif text-lg sm:text-xl font-bold">
              {editingBook ? 'Editar Libro' : 'Añadir Libro a NEXUS LIBRARY'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Form covering scrollable body and pinned footer ─── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* ─── Scrollable body ─── */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* ─── Search section (always visible) ─── */}
          <div className="rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-[#f4ead4] to-[#efe3c8] dark:from-amber-500/10 dark:via-[#161E2E] dark:to-[#101520] p-4">
            <label className="block text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 font-semibold mb-2">
              Búsqueda Bibliográfica Instantánea
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                placeholder="Escribe un título, autor o pega un ISBN (ej. El nombre del viento, Brandon Sanderson, 9788401352836)..."
                className="w-full rounded-xl border border-amber-900/25 dark:border-[#2E3B52] bg-[#fffcf5] dark:bg-[#0D1017]/90 pl-10 pr-10 py-2.5 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-400 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                autoFocus={!editingBook}
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-amber-700 dark:text-amber-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {searchError && (
              <p className="mt-2 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {searchError}
              </p>
            )}

            {!isSearching && searchQuery.trim().length >= 2 && candidates.length === 0 && !searchError && (
              <p className="mt-2.5 text-xs text-stone-600 dark:text-slate-400">
                No se encontraron ediciones para "{searchQuery}". Puedes probar con otro término o completar los campos debajo.
              </p>
            )}

            {candidates.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <p className="text-xs text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>Selecciona la edición deseada o explora portadas alternativas:</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCoverPickerOpen(true)}
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-600/35 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 transition"
                  >
                    <Images className="w-3.5 h-3.5" />
                    <span>Galería de portadas</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {candidates.map((cand) => {
                    const isSelected = selectedCandidateId === cand.id;
                    return (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => applyCandidate(cand)}
                        className={
                          'flex items-start gap-3 p-2.5 rounded-xl border text-left transition ' +
                          (isSelected
                            ? 'border-amber-600 dark:border-amber-400 bg-amber-500/20 dark:bg-amber-500/15 shadow-md'
                            : 'border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121824]/90 hover:border-amber-600/50 dark:hover:border-amber-500/40')
                        }
                      >
                        <div className="w-12 shrink-0">
                          <BookCover
                            nombre={cand.nombre}
                            autor={cand.autor}
                            portadaUrl={cand.portadaUrl}
                            portadaFallbackUrl={cand.portadaFallbackUrl}
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-serif font-bold text-sm text-stone-900 dark:text-white line-clamp-2 leading-tight">
                              {cand.nombre}
                            </p>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-stone-600 dark:text-slate-300 truncate mt-0.5">
                            {cand.autor || 'Autor no indicado'}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-stone-600 dark:text-slate-400">
                            {cand.fechaPublicacion && (
                              <span className="rounded bg-[#efe3c8] dark:bg-slate-800 px-1.5 py-0.5">
                                {cand.fechaPublicacion}
                              </span>
                            )}
                            {cand.paginas && (
                              <span className="rounded bg-[#efe3c8] dark:bg-slate-800 px-1.5 py-0.5">
                                {cand.paginas} págs.
                              </span>
                            )}
                            {cand.idioma && (
                              <span className="rounded bg-amber-500/20 text-amber-900 dark:text-amber-200 px-1.5 py-0.5">
                                {cand.idioma}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ─── Tabs ─── */}
          <div className="space-y-5">
            {formError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex items-center border-b border-amber-900/20 dark:border-[#242E42]">
              {TABS.map((tab, i) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      'relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ' +
                      (isActive
                        ? 'text-amber-800 dark:text-amber-300'
                        : 'text-stone-500 dark:text-slate-500 hover:text-stone-800 dark:hover:text-slate-200')
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    <span className="ml-1 text-[10px] font-normal text-stone-400 dark:text-slate-600">
                      {i + 1}/{TABS.length}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 dark:bg-amber-400 rounded-t" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="min-h-[280px]">
              {activeTab === 'essential' && renderEssentialTab()}
              {activeTab === 'reading' && renderReadingTab()}
              {activeTab === 'edition' && renderEditionTab()}
            </div>
          </div>
        </div>

        {/* ─── Footer navigation + actions (Fixed & pinned at bottom) ─── */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 bg-[#f0e5cc] dark:bg-[#101520] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2">
            {!isFirstTab && (
              <button
                type="button"
                onClick={goPrevTab}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior: </span>
                {TABS[tabIndex - 1].shortLabel}
              </button>
            )}
            {!isLastTab && (
              <button
                type="button"
                onClick={goNextTab}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-600/40 dark:border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-3 py-2 text-xs font-semibold transition"
              >
                <span className="hidden sm:inline">Siguiente: </span>
                {TABS[tabIndex + 1].shortLabel}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-amber-900/25 dark:border-slate-700 px-3.5 sm:px-4 py-2 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 sm:px-5 py-2 sm:py-2.5 text-xs shadow-lg transition disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingBook ? 'Guardar Cambios' : 'Añadir a mi biblioteca'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>

      {/* Selector modal de portadas de ediciones */}
      <BookCoverPickerModal
        isOpen={isCoverPickerOpen}
        onClose={() => setIsCoverPickerOpen(false)}
        bookTitle={nombre || searchQuery}
        bookAuthor={autor}
        isbn={isbn}
        currentCoverUrl={portadaUrl}
        currentCoverFallbackUrl={portadaFallbackUrl}
        currentCoverDataUrl={customDataUrl}
        existingCandidates={candidates}
        onSelectCover={handleCoverSelected}
      />
    </div>
  );
};
