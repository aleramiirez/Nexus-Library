import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  AlertCircle,
  BookPlus
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
import { isDuplicateBook } from '../services/importExportService';
import { tryCacheCoverDataUrl } from '../services/coverService';

interface AddEditBookModalProps {
  isOpen: boolean;
  editingBook: Book | null;
  sagas: Saga[];
  existingBooks: Book[];
  onClose: () => void;
  onSave: (
    bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
}

export const AddEditBookModal: React.FC<AddEditBookModalProps> = ({
  isOpen,
  editingBook,
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

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setCandidates([]);
    setSearchError('');
    setSelectedCandidateId(null);
    setFormError('');

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
    }
  }, [isOpen, editingBook]);

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

    if (!editingBook) {
      setGenero(cand.suggestedGenre);
      setSubgeneros(cand.suggestedSubgenres);
    }
  };

  const toggleSubgenre = (sub: Subgenre) => {
    setSubgeneros((prev) =>
      prev.includes(sub) ? prev.filter((item) => item !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanNombre = nombre.trim();
    if (!cleanNombre) {
      setFormError('El título del libro es obligatorio.');
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
    if (sagaMode === 'existing' && selectedSagaId) {
      const found = sagas.find((s) => s.id === selectedSagaId);
      if (found) {
        finalSagaId = found.id;
        finalSagaNombre = newSagaName.trim() || found.nombre;
      }
    } else if (sagaMode === 'new' && newSagaName.trim()) {
      finalSagaNombre = newSagaName.trim();
    }

    setIsSaving(true);
    try {
      const cachedDataUrl =
        portadaUrl && portadaUrl !== editingBook?.portadaUrl
          ? await tryCacheCoverDataUrl(portadaUrl)
          : editingBook?.portadaDataUrl;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-5xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden sm:my-6">
        <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 sm:py-4 bg-[#f0e5cc] dark:bg-[#101520]">
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

        <div className="p-4 sm:p-6 max-h-[calc(92dvh-56px)] sm:max-h-[84vh] overflow-y-auto overscroll-contain space-y-5 sm:space-y-6">
          <div className="rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-[#f4ead4] to-[#efe3c8] dark:from-amber-500/10 dark:via-[#161E2E] dark:to-[#101520] p-4">
            <label className="block text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 font-semibold mb-2">
              1. Búsqueda Bibliográfica Instantánea (Open Library + Google Books)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <p className="text-xs text-stone-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  Selecciona la edición deseada con un clic para autocompletar portada y metadatos:
                </p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {formError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-3 flex flex-col items-center">
                <div className="w-40 md:w-full max-w-[190px]">
                  <BookCover
                    nombre={nombre || 'Título del libro'}
                    autor={autor || 'Autor'}
                    portadaUrl={portadaUrl}
                    portadaFallbackUrl={portadaFallbackUrl}
                  />
                </div>
                <div className="w-full mt-3">
                  <label className="block text-[11px] text-stone-600 dark:text-slate-400 mb-1">
                    URL de portada (autocompletada o personalizada)
                  </label>
                  <input
                    type="url"
                    value={portadaUrl}
                    onChange={(e) => setPortadaUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="md:col-span-9 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Nombre (Título del libro) *
                    </label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Autor</label>
                    <input
                      type="text"
                      value={autor}
                      onChange={(e) => setAutor(e.target.value)}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Género (Selección única)
                    </label>
                    <select
                      value={genero}
                      onChange={(e) => setGenero(e.target.value as Genre | '')}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-sm"
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
                    <label className="block text-xs font-semibold mb-1">Estado de lectura</label>
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

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4] dark:bg-[#101520] p-3.5">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold mb-1">Asociación a Saga</label>
                    <select
                      value={sagaMode}
                      onChange={(e) => {
                        const nextMode = e.target.value as 'none' | 'existing' | 'new';
                        setSagaMode(nextMode);
                        if (nextMode === 'existing' && selectedSagaId) {
                          const found = sagas.find((s) => s.id === selectedSagaId);
                          if (found) setNewSagaName(found.nombre);
                        } else if (nextMode === 'new' && selectedSagaId) {
                          setSelectedSagaId('');
                          setNewSagaName('');
                        }
                      }}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-2 text-xs"
                    >
                      <option value="none">Libro independiente (Sin saga)</option>
                      <option value="existing">Saga existente ({sagas.length})</option>
                      <option value="new">Crear nueva saga</option>
                    </select>
                  </div>

                  {sagaMode === 'existing' && (
                    <div className="sm:col-span-5 space-y-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Seleccionar Saga</label>
                        <select
                          value={selectedSagaId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSelectedSagaId(id);
                            const found = sagas.find((s) => s.id === id);
                            setNewSagaName(found ? found.nombre : '');
                          }}
                          className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-2 text-xs"
                        >
                          <option value="">— Elige una saga —</option>
                          {sagas.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedSagaId && (
                        <div>
                          <label className="block text-[11px] font-semibold text-amber-800 dark:text-amber-400 mb-1">
                            Editar nombre de la saga
                          </label>
                          <input
                            type="text"
                            value={newSagaName}
                            onChange={(e) => setNewSagaName(e.target.value)}
                            placeholder="Nombre de la saga..."
                            className="w-full rounded-lg border border-amber-600/40 dark:border-amber-500/40 bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-1.5 text-xs focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {sagaMode === 'new' && (
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold mb-1">
                        Nombre de la nueva saga
                      </label>
                      <input
                        type="text"
                        value={newSagaName}
                        onChange={(e) => setNewSagaName(e.target.value)}
                        placeholder="Ej. El Archivo de las Tormentas"
                        className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-2 text-xs"
                      />
                    </div>
                  )}

                  {sagaMode !== 'none' && (
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold mb-1">Volumen (#)</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={volumen}
                        onChange={(e) => setVolumen(e.target.value)}
                        placeholder="Ej. 1"
                        className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-2 text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Año Publicación</label>
                    <input
                      type="number"
                      value={fechaPublicacion}
                      onChange={(e) => setFechaPublicacion(e.target.value)}
                      placeholder="Ej. 2007"
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Páginas</label>
                    <input
                      type="number"
                      min="1"
                      value={paginas}
                      onChange={(e) => setPaginas(e.target.value)}
                      placeholder="Ej. 880"
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Puntuación</label>
                    <select
                      value={puntuacion ?? ''}
                      onChange={(e) =>
                        setPuntuacion(
                          e.target.value ? (Number(e.target.value) as StarRating) : null
                        )
                      }
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
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
                    <label className="block text-xs font-semibold mb-1">ISBN</label>
                    <input
                      type="text"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      placeholder="ISBN-13 / ISBN-10"
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Fecha Inicio</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Fecha Fin</label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Lectura Virtual (URL o referencia)
                    </label>
                    <input
                      type="text"
                      value={lecturaVirtual}
                      onChange={(e) => setLecturaVirtual(e.target.value)}
                      placeholder="https://... o Kindle / Kobo"
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Editorial</label>
                    <input
                      type="text"
                      value={editorial}
                      onChange={(e) => setEditorial(e.target.value)}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Idioma</label>
                    <input
                      type="text"
                      value={idioma}
                      onChange={(e) => setIdioma(e.target.value)}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Edición</label>
                    <input
                      type="text"
                      value={edicion}
                      onChange={(e) => setEdicion(e.target.value)}
                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Sinopsis</label>
                  <textarea
                    rows={3}
                    value={sinopsis}
                    onChange={(e) => setSinopsis(e.target.value)}
                    className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-2.5 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-amber-900/20 dark:border-[#242E42] pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-amber-900/25 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-5 py-2.5 text-xs shadow-lg transition disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingBook ? 'Guardar Cambios' : 'Añadir a mi biblioteca'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
