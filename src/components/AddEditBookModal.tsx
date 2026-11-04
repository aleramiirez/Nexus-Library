import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  Search,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  AlertCircle,
  BookPlus,
  BookOpen,
  Info,
  ChevronRight,
  ChevronLeft,
  Images,
  FileUp,
  ScanBarcode
} from 'lucide-react';
import { calculateReadingTime } from '../utils/readingTime';
import {
  BibliographicCandidate,
  Book,
  Saga,
  StarRating
} from '../types/models';
import {
  Genre,
  ReadingStatus,
  SUBGENRES,
  Subgenre,
  getRecommendedSubgenres,
  normalizeText,
  matchesSubgenreSearch
} from '../constants/catalogs';
import { bookMetadataService } from '../services/bookMetadataService';
import { BookCover } from './BookCover';
import { BookCoverPickerModal, SelectedCoverPayload } from './BookCoverPickerModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { isDuplicateBook } from '../services/importExportService';
import { tryCacheCoverDataUrl } from '../services/coverService';
import {
  enrichParsedEbookFromCatalog,
  ParsedEbookFile,
  parseEbookFile
} from '../services/epubParserService';
import {
  COUNTRIES_CATALOG,
  literaryGeographyService
} from '../services/literaryGeographyService';
import { getTodayLocalDateString } from '../db/database';
import { BookFormEssentialTab } from './book-form/BookFormEssentialTab';
import { BookFormReadingTab } from './book-form/BookFormReadingTab';
import { BookFormEditionTab } from './book-form/BookFormEditionTab';
import '../dashboard-panels.css';

interface AddEditBookModalProps {
  isOpen: boolean;
  editingBook: Book | null;
  initialCandidate?: BibliographicCandidate | null;
  initialParsedEbook?: ParsedEbookFile | null;
  sagas: Saga[];
  existingBooks: Book[];
  onClose: () => void;
  onSave: (
    bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onOpenMultiEpubImport?: (files: File[]) => void;
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
  { id: 'edition', label: 'Publicación & Detalles', icon: Info, shortLabel: 'Detalles' }
];

export const AddEditBookModal: React.FC<AddEditBookModalProps> = ({
  isOpen,
  editingBook,
  initialCandidate,
  initialParsedEbook,
  sagas,
  existingBooks,
  onClose,
  onSave,
  onOpenMultiEpubImport
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
  const [subgenreFilterText, setSubgenreFilterText] = useState('');
  const [showAllSubgenres, setShowAllSubgenres] = useState(false);
  const [fechaPublicacion, setFechaPublicacion] = useState<string>('');
  const [paginas, setPaginas] = useState<string>('');
  const [paginaActual, setPaginaActual] = useState<string>('');
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
  const [lecturaVirtual, setLecturaVirtual] = useState<string>('Digital (.epub / eBook)');
  const [tiempoLectura, setTiempoLectura] = useState<string>('');

  const [isbn, setIsbn] = useState('');
  const [editorial, setEditorial] = useState('');
  const [idioma, setIdioma] = useState('');
  const [edicion, setEdicion] = useState('');
  const [pais, setPais] = useState('');
  const [sinopsis, setSinopsis] = useState('');
  const [notasPersonales, setNotasPersonales] = useState('');
  const [portadaUrl, setPortadaUrl] = useState('');
  const [portadaFallbackUrl, setPortadaFallbackUrl] = useState('');
  const [customDataUrl, setCustomDataUrl] = useState<string | undefined>(undefined);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const [coverBadgeMsg, setCoverBadgeMsg] = useState<string | null>(null);

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedFileBadge, setParsedFileBadge] = useState<string | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const ebookInputRef = useRef<HTMLInputElement>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const focusTrapRef = useFocusTrap({ isOpen, onClose });

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
      setPaginaActual(editingBook.paginaActual ? String(editingBook.paginaActual) : '');
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
      setFechaFin(editingBook.fechaFin || editingBook.fechaPausado || '');
      setLecturaVirtual(editingBook.lecturaVirtual);
      setTiempoLectura(editingBook.tiempoLectura);
      setIsbn(editingBook.isbn);
      setEditorial(editingBook.editorial);
      setIdioma(editingBook.idioma);
      setEdicion(editingBook.edicion);
      setPais(editingBook.pais || '');
      setSinopsis(editingBook.sinopsis);
      setNotasPersonales(editingBook.notasPersonales || '');
      setPortadaUrl(editingBook.portadaUrl);
      setPortadaFallbackUrl(editingBook.portadaFallbackUrl);
      setCustomDataUrl(editingBook.portadaDataUrl);
      setIsCoverPickerOpen(false);
      setCoverBadgeMsg(null);
    } else if (initialParsedEbook) {
      applyParsedEbook(initialParsedEbook);
      setIsCoverPickerOpen(false);
    } else if (initialCandidate) {
      applyCandidate(initialCandidate);
      setCustomDataUrl(undefined);
      setIsCoverPickerOpen(false);
      setCoverBadgeMsg(null);
      setParsedFileBadge(null);
    } else {
      setNombre('');
      setAutor('');
      setGenero('');
      setSubgeneros([]);
      setFechaPublicacion('');
      setPaginas('');
      setPaginaActual('');
      setPuntuacion(null);
      setProgreso('❌ No Leído');
      setSagaMode('none');
      setSelectedSagaId('');
      setNewSagaName('');
      setVolumen('');
      setFechaInicio('');
      setFechaFin('');
      setLecturaVirtual('Digital (.epub / eBook)');
      setTiempoLectura('');
      setIsbn('');
      setEditorial('');
      setIdioma('');
      setEdicion('');
      setPais('');
      setSinopsis('');
      setNotasPersonales('');
      setPortadaUrl('');
      setPortadaFallbackUrl('');
      setCustomDataUrl(undefined);
      setIsCoverPickerOpen(false);
      setCoverBadgeMsg(null);
      setParsedFileBadge(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingBook, initialCandidate, initialParsedEbook]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isOpen]);

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
    setPais(cand.pais || '');
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

  const applyParsedEbook = (parsed: ParsedEbookFile) => {
    setSelectedCandidateId(null);
    if (parsed.nombre) setNombre(parsed.nombre);
    if (parsed.autor) setAutor(parsed.autor);
    if (parsed.genero) setGenero(parsed.genero);
    if (parsed.subgeneros && parsed.subgeneros.length > 0) {
      setSubgeneros(parsed.subgeneros);
    }
    if (parsed.fechaPublicacion) setFechaPublicacion(String(parsed.fechaPublicacion));
    if (parsed.paginas) setPaginas(String(parsed.paginas));
    if (parsed.isbn) setIsbn(parsed.isbn);
    if (parsed.editorial) setEditorial(parsed.editorial);
    if (parsed.idioma) setIdioma(parsed.idioma);
    if (parsed.edicion) setEdicion(parsed.edicion);
    if (parsed.sinopsis) setSinopsis(parsed.sinopsis);
    if (parsed.lecturaVirtual) setLecturaVirtual(parsed.lecturaVirtual);
    if (parsed.portadaUrl) setPortadaUrl(parsed.portadaUrl);
    if (parsed.portadaFallbackUrl) setPortadaFallbackUrl(parsed.portadaFallbackUrl);
    if (parsed.portadaDataUrl) {
      setCustomDataUrl(parsed.portadaDataUrl);
      setCoverBadgeMsg('Portada extraída del archivo');
    }

    if (parsed.sagaNombre) {
      const matched = sagas.find(
        (s) => s.nombre.trim().toLowerCase() === parsed.sagaNombre.trim().toLowerCase()
      );
      if (matched) {
        setSagaMode('existing');
        setSelectedSagaId(matched.id);
        setNewSagaName(matched.nombre);
      } else {
        setSagaMode('new');
        setSelectedSagaId('');
        setNewSagaName(parsed.sagaNombre);
      }
    }
    if (parsed.volumen) {
      setVolumen(String(parsed.volumen));
    }

    setParsedFileBadge(`Datos cargados de "${parsed.fileName}"`);
  };

  const handleEbookFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    e.target.value = '';

    if (files.length > 1 && onOpenMultiEpubImport) {
      onClose();
      onOpenMultiEpubImport(files);
      return;
    }

    const file = files[0];
    setIsParsingFile(true);
    setSearchError('');
    try {
      let parsed = await parseEbookFile(file);
      if (!parsed.portadaDataUrl || !parsed.sinopsis || !parsed.genero || !parsed.paginas) {
        parsed = await enrichParsedEbookFromCatalog(parsed);
      }
      applyParsedEbook(parsed);
    } catch {
      setSearchError('No se pudo leer el archivo seleccionado. Verifica que sea un .epub o .fb2 válido.');
    } finally {
      setIsParsingFile(false);
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

  const recommendedForGenre = useMemo(() => {
    if (!genero) return [];
    return getRecommendedSubgenres(genero);
  }, [genero]);

  const sortedCountries = useMemo(() => {
    return Object.values(COUNTRIES_CATALOG).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const autoDetectedCountry = useMemo(() => {
    if (pais) return null;
    return literaryGeographyService.resolveBookCountry({ autor, nombre });
  }, [pais, autor, nombre]);

  const displayedSubgenres = useMemo(() => {
    // Lista deduplicada por texto normalizado
    const dedupedAll = SUBGENRES.filter(
      (sub, idx, arr) => arr.findIndex((x) => normalizeText(x) === normalizeText(sub)) === idx
    );

    // 1. Si el usuario escribe en el buscador rápido, buscar en TODOS los subgéneros
    // de forma totalmente insensible a emojis, mayúsculas, minúsculas y tildes
    if (subgenreFilterText.trim()) {
      const q = subgenreFilterText.trim();
      const allMatching = dedupedAll.filter((s) => matchesSubgenreSearch(s, q));

      // Si hay un género seleccionado, priorizar en los primeros puestos los del género actual
      if (genero) {
        const recNormSet = new Set(recommendedForGenre.map((s) => normalizeText(s)));
        const primary = allMatching.filter((s) => recNormSet.has(normalizeText(s)));
        const secondary = allMatching.filter((s) => !recNormSet.has(normalizeText(s)));
        return [...primary, ...secondary];
      }
      return allMatching;
    }

    // 2. Si no hay búsqueda por texto y hay género seleccionado sin toggle "todos"
    if (genero && !showAllSubgenres) {
      const recSet = new Set(recommendedForGenre.map((s) => normalizeText(s)));
      const baseList = [...recommendedForGenre];

      // Incluir cualquier subgénero que el libro ya tenga seleccionado para que nunca desaparezca
      subgeneros.forEach((selectedSub) => {
        if (!recSet.has(normalizeText(selectedSub))) {
          baseList.push(selectedSub);
          recSet.add(normalizeText(selectedSub));
        }
      });
      return baseList;
    }

    return dedupedAll;
  }, [genero, showAllSubgenres, recommendedForGenre, subgeneros, subgenreFilterText]);

  const isSubgenreActive = (sub: Subgenre) => {
    const normSub = normalizeText(sub);
    return subgeneros.some((item) => item === sub || normalizeText(item) === normSub);
  };

  const toggleSubgenre = (sub: Subgenre) => {
    const normSub = normalizeText(sub);
    setSubgeneros((prev) => {
      const exists = prev.some((item) => item === sub || normalizeText(item) === normSub);
      if (exists) {
        return prev.filter((item) => item !== sub && normalizeText(item) !== normSub);
      }
      return [...prev, sub];
    });
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
          paginaActual: paginaActual.trim() ? Number(paginaActual.trim()) : null,
          puntuacion,
          progreso,
          sagaId: finalSagaId,
          sagaNombre: finalSagaNombre,
          volumen: volumen ? Number(volumen) : null,
          fechaInicio,
          fechaFin,
          fechaPausado:
            progreso === '⏸️ Pausado'
              ? fechaFin || editingBook?.fechaPausado || getTodayLocalDateString()
              : null,
          lecturaVirtual: (lecturaVirtual || 'Digital (.epub / eBook)').trim(),
          tiempoLectura: calculateReadingTime({
            fechaInicio,
            fechaFin,
            paginas: paginas ? Number(paginas) : null,
            progreso,
            tiempoLectura: tiempoLectura.trim()
          }),
          isbn: isbn.trim(),
          editorial: editorial.trim(),
          idioma: idioma.trim(),
          edicion: edicion.trim() || editingBook?.edicion || '',
          pais: pais.trim().toUpperCase() || undefined,
          sinopsis: sinopsis.trim(),
          notasPersonales: notasPersonales.trim(),
          citas: editingBook?.citas || [],
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-add-edit-book-title"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar modal"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-default border-0 p-0"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-5xl h-[92dvh] sm:h-[86vh] max-h-[94dvh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl border-t sm:border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden sm:my-auto"
      >
        {/* ─── Header (Fixed / Pinned top) ─── */}
        <div className="shrink-0 flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 sm:py-3.5 bg-[#f0e5cc] dark:bg-[#101520]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 dark:text-amber-300 shadow-xs shrink-0">
              <BookPlus className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-add-edit-book-title" className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 leading-tight">
                  {editingBook ? 'Editar Ficha del Libro' : 'Nuevo Registro Bibliográfico'}
                </h2>
                <span className="hidden sm:inline-flex items-center text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/25">
                  {editingBook ? 'Expediente' : 'Catalogación'}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-slate-400">
                Archivo oficial de la biblioteca personal
              </p>
            </div>
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <label htmlFor="add-book-search-input" className="block text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 font-semibold">
                Búsqueda Bibliográfica o Carga desde Archivo
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBarcodeScannerOpen(true)}
                  className="h-8 px-2.5 rounded-xl border border-amber-600/45 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 transition shadow-sm flex items-center gap-1.5 shrink-0 text-xs font-semibold cursor-pointer"
                  title="Escanear código de barras con la cámara (ISBN)"
                  aria-label="Escanear código de barras con la cámara (ISBN)"
                >
                  <ScanBarcode className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span className="hidden sm:inline">Escanear ISBN</span>
                </button>
                <input
                  ref={ebookInputRef}
                  type="file"
                  accept=".epub,.fb2,.pdf,.mobi,.azw3,application/epub+zip"
                  multiple
                  onChange={handleEbookFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => ebookInputRef.current?.click()}
                  disabled={isParsingFile}
                  className="w-8 h-8 rounded-xl border border-amber-600/45 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 transition shadow-sm disabled:opacity-50 flex items-center justify-center shrink-0"
                  title="Rellenar datos desde archivo (.epub, .fb2, .pdf)"
                  aria-label="Rellenar datos desde archivo .epub"
                >
                  {isParsingFile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700 dark:text-amber-400" />
                  ) : (
                    <FileUp className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  )}
                </button>
              </div>
            </div>
            {parsedFileBadge && (
              <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{parsedFileBadge}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setParsedFileBadge(null)}
                  className="text-emerald-700 dark:text-emerald-300 hover:underline text-[11px] shrink-0"
                >
                  Ocultar
                </button>
              </div>
            )}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="add-book-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                placeholder="Escribe un título, autor o pega un ISBN (ej. El nombre del viento, Brandon Sanderson, 9788401352836)..."
                className="w-full rounded-xl border border-amber-900/25 dark:border-[#2E3B52] bg-[#fffcf5] dark:bg-[#0D1017]/90 pl-10 pr-10 py-2.5 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-400 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
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
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-100')
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    <span className="ml-1 text-[10px] font-normal text-stone-500 dark:text-slate-400">
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
              {activeTab === 'essential' && (
                <BookFormEssentialTab
                  nombre={nombre}
                  setNombre={setNombre}
                  autor={autor}
                  setAutor={setAutor}
                  genero={genero}
                  setGenero={setGenero}
                  subgeneros={subgeneros}
                  setSubgeneros={setSubgeneros}
                  subgenreFilterText={subgenreFilterText}
                  setSubgenreFilterText={setSubgenreFilterText}
                  showAllSubgenres={showAllSubgenres}
                  setShowAllSubgenres={setShowAllSubgenres}
                  displayedSubgenres={displayedSubgenres}
                  isSubgenreActive={isSubgenreActive}
                  toggleSubgenre={toggleSubgenre}
                  progreso={progreso}
                  setProgreso={setProgreso}
                  fechaInicio={fechaInicio}
                  setFechaInicio={setFechaInicio}
                  fechaFin={fechaFin}
                  setFechaFin={setFechaFin}
                  portadaUrl={portadaUrl}
                  portadaFallbackUrl={portadaFallbackUrl}
                  customDataUrl={customDataUrl}
                  onOpenCoverPicker={() => setIsCoverPickerOpen(true)}
                  coverBadgeMsg={coverBadgeMsg}
                />
              )}
              {activeTab === 'reading' && (
                <BookFormReadingTab
                  puntuacion={puntuacion}
                  setPuntuacion={setPuntuacion}
                  fechaInicio={fechaInicio}
                  setFechaInicio={setFechaInicio}
                  fechaFin={fechaFin}
                  setFechaFin={setFechaFin}
                  lecturaVirtual={lecturaVirtual}
                  setLecturaVirtual={setLecturaVirtual}
                  paginas={paginas}
                  paginaActual={paginaActual}
                  setPaginaActual={setPaginaActual}
                  progreso={progreso}
                  tiempoLectura={tiempoLectura}
                  sagas={sagas}
                  existingBooks={existingBooks}
                  selectedSagaId={selectedSagaId}
                  setSelectedSagaId={setSelectedSagaId}
                  newSagaName={newSagaName}
                  setNewSagaName={setNewSagaName}
                  volumen={volumen}
                  setVolumen={setVolumen}
                  sagaMode={sagaMode}
                  setSagaMode={setSagaMode}
                  isSagaPickerOpen={isSagaPickerOpen}
                  setIsSagaPickerOpen={setIsSagaPickerOpen}
                  sagaSearchFilter={sagaSearchFilter}
                  setSagaSearchFilter={setSagaSearchFilter}
                  isEditingSagaName={isEditingSagaName}
                  setIsEditingSagaName={setIsEditingSagaName}
                  sagaPickerRef={sagaPickerRef}
                />
              )}
              {activeTab === 'edition' && (
                <BookFormEditionTab
                  fechaPublicacion={fechaPublicacion}
                  setFechaPublicacion={setFechaPublicacion}
                  paginas={paginas}
                  setPaginas={setPaginas}
                  editorial={editorial}
                  setEditorial={setEditorial}
                  pais={pais}
                  setPais={setPais}
                  sortedCountries={sortedCountries}
                  autoDetectedCountry={autoDetectedCountry}
                  idioma={idioma}
                  setIdioma={setIdioma}
                  isbn={isbn}
                  setIsbn={setIsbn}
                  portadaUrl={portadaUrl}
                  setPortadaUrl={setPortadaUrl}
                  onOpenCoverPicker={() => setIsCoverPickerOpen(true)}
                  sinopsis={sinopsis}
                  setSinopsis={setSinopsis}
                  notasPersonales={notasPersonales}
                  setNotasPersonales={setNotasPersonales}
                />
              )}
            </div>
          </div>
        </div>

        {/* ─── Footer navigation + actions (Fixed & pinned at bottom) ─── */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 pb-[max(12px,env(safe-area-inset-bottom))] bg-[#f0e5cc] dark:bg-[#101520] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
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

      {/* Escáner de código de barras ISBN */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onBookSelected={(candidate) => {
          applyCandidate(candidate);
          setIsBarcodeScannerOpen(false);
        }}
      />
    </div>
  );
};
