import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Compass,
  MapPin,
  Globe,
  BookOpen,
  Sparkles,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Sliders,
  Award,
  ShieldCheck,
  Flag,
  Search,
  ArrowRight,
  Bookmark,
  Star,
  Loader2,
  Flame,
  FileText,
  Maximize2,
  Minimize2,
  ArrowDown
} from 'lucide-react';
import { Book, BibliographicCandidate } from '../types/models';
import LiteraryAtlasMap, { ContinentId, CountryMapNode } from './LiteraryAtlasMap';
import {
  literaryGeographyService,
  COUNTRIES_CATALOG,
  CONTINENT_NAMES,
  Continent,
  getCountryCanonBooks,
  fetchMoreCountryBooks,
  getUnassignedCountryBooks,
  isBookRead,
  CountryInfo
} from '../services/literaryGeographyService';
import { updateBookQuickCountry } from '../db/database';
import { isBookAlreadyInLibrary } from '../services/bookMetadataService';
import { BookCover } from './BookCover';
import { LiteraryPassportModal } from './LiteraryPassportModal';
import { soundService } from '../services/soundService';
import '../dashboard-panels.css';

export interface LiteraryAtlasViewProps {
  books: Book[];
  onQuickAddBook: (candidate: BibliographicCandidate) => Promise<void>;
  onCustomizeBook: (candidate: BibliographicCandidate) => void;
  onOpenBookDetail?: (book: Book) => void;
  onOpenPassportCard?: () => void;
  userDisplayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  memberId?: string | null;
}

function findEarliestReadDate(books: Book[]): string | undefined {
  let earliest: string | undefined;
  for (const b of books) {
    const d = b.fechaFin || b.fechaInicio || b.createdAt;
    if (d) {
      if (!earliest || d < earliest) {
        earliest = d;
      }
    }
  }
  return earliest;
}

export const LiteraryAtlasView: React.FC<LiteraryAtlasViewProps> = ({
  books,
  onQuickAddBook,
  onCustomizeBook,
  onOpenBookDetail,
  onOpenPassportCard,
  userDisplayName,
  username,
  avatarUrl,
  memberId
}) => {
  // ─── Resumen Consular y Rango ───
  const passportSummary = useMemo(
    () => literaryGeographyService.calculatePassport(books),
    [books]
  );
  const { diplomaticRank } = passportSummary;

  // ─── Construcción de Nodos del Mapa Cartográfico ───
  const { mapCountries, defaultCountryCode, countryBooksMap } = useMemo(() => {
    const booksByCode: Record<string, Book[]> = {};

    books.forEach((b) => {
      const country = literaryGeographyService.resolveBookCountry(b);
      if (country) {
        if (!booksByCode[country.code]) {
          booksByCode[country.code] = [];
        }
        booksByCode[country.code].push(b);
      }
    });

    let bestCode = 'ES';
    let maxRead = -1;

    const list: CountryMapNode[] = Object.values(COUNTRIES_CATALOG).map((info) => {
      const bList = booksByCode[info.code] || [];
      const readBooks = bList.filter((b) => isBookRead(b));
      const readingBooks = bList.filter(
        (b) =>
          !isBookRead(b) &&
          (b.progreso?.toLowerCase().includes('leyendo') ||
            b.progreso?.toLowerCase() === 'reading')
      );
      const unreadBooks = bList.filter(
        (b) =>
          !isBookRead(b) &&
          !b.progreso?.toLowerCase().includes('leyendo') &&
          b.progreso?.toLowerCase() !== 'reading'
      );

      const readCount = readBooks.length;
      const readingCount = readingBooks.length;
      const unreadCount = unreadBooks.length;
      const totalCount = bList.length;
      const canonCount = getCountryCanonBooks(info.code).length;
      const firstReadDate = findEarliestReadDate(readBooks);

      if (readCount > maxRead) {
        maxRead = readCount;
        bestCode = info.code;
      }

      return {
        code: info.code,
        name: info.name,
        flag: info.flag,
        continent: info.continent,
        readCount,
        readingCount,
        unreadCount,
        totalCount,
        canonCount,
        firstReadDate
      };
    });

    return {
      mapCountries: list,
      defaultCountryCode: bestCode,
      countryBooksMap: booksByCode
    };
  }, [books]);

  // País activo seleccionado y continente activo
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(
    () => defaultCountryCode
  );
  const [activeContinent, setActiveContinent] = useState<ContinentId>('all');
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Atajo de teclado (Escape) y bloqueo de scroll al expandir el mapa
  useEffect(() => {
    if (!isMapExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMapExpanded(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isMapExpanded]);

  // Si cambia la lista de países y el seleccionado ya no existe, volvemos al por defecto
  const activeCountryInfo: CountryInfo =
    COUNTRIES_CATALOG[selectedCountryCode] || COUNTRIES_CATALOG.ES;

  // Libros del usuario en el país activo, ordenados dando prioridad absoluta a los leídos
  const currentCountryBooks = useMemo(() => {
    const list = countryBooksMap[selectedCountryCode] || [];
    return [...list].sort((a, b) => {
      const aRead = isBookRead(a);
      const bRead = isBookRead(b);
      // 1. Leídos primero
      if (aRead !== bRead) return aRead ? -1 : 1;

      // 2. Leyendo segundo
      const aReading =
        !aRead &&
        (a.progreso?.toLowerCase().includes('leyendo') ||
          a.progreso?.toLowerCase() === 'reading');
      const bReading =
        !bRead &&
        (b.progreso?.toLowerCase().includes('leyendo') ||
          b.progreso?.toLowerCase() === 'reading');
      if (aReading !== bReading) return aReading ? -1 : 1;

      // 3. Dentro del mismo estado, fecha más reciente primero (si existe)
      const aDate = a.fechaFin || a.fechaInicio || a.createdAt || '';
      const bDate = b.fechaFin || b.fechaInicio || b.createdAt || '';
      if (aDate && bDate && aDate !== bDate) return bDate.localeCompare(aDate);

      // 4. Mejor puntuación
      const aScore = a.puntuacion || 0;
      const bScore = b.puntuacion || 0;
      if (aScore !== bScore) return bScore - aScore;

      // 5. Alfabético por nombre
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }, [countryBooksMap, selectedCountryCode]);

  const currentCountryReadCount = useMemo(
    () => currentCountryBooks.filter((b) => isBookRead(b)).length,
    [currentCountryBooks]
  );

  // Canon del país activo + obras adicionales cargadas bajo demanda
  const [extraCountryBooks, setExtraCountryBooks] = useState<
    Record<string, BibliographicCandidate[]>
  >({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [addingCandidateId, setAddingCandidateId] = useState<string | null>(null);

  const canonBooks = useMemo(() => {
    const curated = getCountryCanonBooks(selectedCountryCode);
    const extra = extraCountryBooks[selectedCountryCode] || [];
    // Evitar duplicados por id o título
    const seen = new Set<string>();
    const result: BibliographicCandidate[] = [];
    [...curated, ...extra].forEach((c) => {
      const key = `${c.nombre.toLowerCase().trim()}::${(c.autor || '').toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    });
    return result;
  }, [selectedCountryCode, extraCountryBooks]);

  const handleFetchMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const extra = await fetchMoreCountryBooks(selectedCountryCode);
      setExtraCountryBooks((prev) => ({
        ...prev,
        [selectedCountryCode]: [...(prev[selectedCountryCode] || []), ...extra]
      }));
    } catch {
      // Ignorar fallo de red
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Añadir candidato del canon
  const handleAddCandidate = async (candidate: BibliographicCandidate) => {
    setAddingCandidateId(candidate.id);
    try {
      // Nos aseguramos de marcar el país en el candidato
      const candWithCountry: BibliographicCandidate = {
        ...candidate,
        pais: selectedCountryCode
      };
      await onQuickAddBook(candWithCountry);
      soundService.playWaxSeal();
    } finally {
      setAddingCandidateId(null);
    }
  };

  const handleCustomizeCandidate = (candidate: BibliographicCandidate) => {
    onCustomizeBook({
      ...candidate,
      pais: selectedCountryCode
    });
  };

  // Libros sin país asignado
  const unassignedBooks = useMemo(
    () => getUnassignedCountryBooks(books),
    [books]
  );
  const [isUnassignedOpen, setIsUnassignedOpen] = useState(false);
  const [assigningBookId, setAssigningBookId] = useState<string | null>(null);

  const handleAssignCountry = async (bookId: string, countryCode: string) => {
    if (!countryCode) return;
    setAssigningBookId(bookId);
    try {
      await updateBookQuickCountry(bookId, countryCode);
      soundService.playInkStamp();
    } finally {
      setAssigningBookId(null);
    }
  };

  // Modal de Pasaporte local si no se pasó handler externo
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);
  const handleOpenPassport = () => {
    if (onOpenPassportCard) {
      onOpenPassportCard();
    } else {
      setIsPassportModalOpen(true);
    }
  };

  // Cálculo de progreso al siguiente rango diplomático
  const rankProgress = useMemo(() => {
    const stamped = passportSummary.totalCountriesStamped;
    const conts = passportSummary.totalContinentsStamped;
    switch (diplomaticRank.level) {
      case 1: {
        const pct = Math.min(100, Math.round((stamped / 2) * 100));
        return { pct, nextText: `${stamped}/2 países para Rango II · Agregado` };
      }
      case 2: {
        const pct = Math.min(100, Math.round(((stamped - 2) / 2) * 100));
        return { pct, nextText: `${stamped}/4 países para Rango III · Ministro` };
      }
      case 3: {
        const pct = Math.min(100, Math.round(((stamped - 4) / 2) * 100));
        return { pct, nextText: `${stamped}/6 países para Rango IV · Cónsul` };
      }
      case 4: {
        const p1 = (stamped - 6) / 4;
        const p2 = (conts - 3) / 1;
        const pct = Math.min(100, Math.round(Math.max(0, (p1 + p2) / 2) * 100));
        return { pct, nextText: `${stamped}/10 países y ${conts}/4 continentes para Rango V · Embajador` };
      }
      case 5:
      default:
        return { pct: 100, nextText: '¡Honor Máximo de la República de las Letras!' };
    }
  }, [diplomaticRank.level, passportSummary.totalCountriesStamped, passportSummary.totalContinentsStamped]);

  // Contadores globales
  const conqueredCount = useMemo(
    () => mapCountries.filter((c) => c.readCount > 0).length,
    [mapCountries]
  );
  const exploringCount = useMemo(
    () =>
      mapCountries.filter(
        (c) => c.readCount === 0 && (c.readingCount > 0 || c.unreadCount > 0)
      ).length,
    [mapCountries]
  );
  const continentsCount = passportSummary.totalContinentsStamped;

  // Estado del sello para el país activo
  const activeNode = mapCountries.find((c) => c.code === selectedCountryCode);
  const isActiveConquered = Boolean(activeNode && activeNode.readCount > 0);
  const isActiveExploring = Boolean(
    activeNode &&
      activeNode.readCount === 0 &&
      (activeNode.readingCount > 0 || activeNode.unreadCount > 0)
  );

  // Lista ordenada alfabéticamente de países para el selector rápido de territorio
  const sortedCatalogCountries = useMemo(() => {
    return Object.values(COUNTRIES_CATALOG).sort((a, b) =>
      a.name.localeCompare(b.name, 'es')
    );
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* =====================================================================
          BLOQUE 1: CABECERA DIPLOMÁTICA Y RANGO DEL LECTOR
         ===================================================================== */}
      <section className="catalog-card-panel relative overflow-visible mt-4 pt-8 sm:pt-9 p-5 sm:p-7 shadow-xl">
        <div className="catalog-brass-tab">
          Planisferio Diplomático & Pasaporte Consular
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
          {/* Rango y descripción */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xl shadow-md border border-amber-300/40">
                {diplomaticRank.level === 5 ? '👑' : diplomaticRank.level >= 3 ? '🏛️' : '🧭'}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    {diplomaticRank.badge}
                  </span>
                  <span className="font-serif italic text-xs text-amber-900/60 dark:text-amber-300/60 hidden sm:inline">
                    {diplomaticRank.latinTitle}
                  </span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-0.5">
                  {diplomaticRank.title}
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-sans">
              {diplomaticRank.description}
            </p>

            {/* Barra de progreso hacia el siguiente rango */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                <span>Progreso consular</span>
                <span className="font-mono text-amber-700 dark:text-amber-400">
                  {rankProgress.nextText}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden border border-amber-900/10 dark:border-amber-400/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${Math.max(5, rankProgress.pct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Estadísticas de Expedición & Botón de Pasaporte */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Conquistados */}
              <div className="flex flex-col items-center justify-center px-3.5 py-2.5 rounded-xl border border-rose-900/20 dark:border-rose-400/20 bg-rose-500/5 text-center min-w-[90px]">
                <span className="font-serif text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400 leading-none">
                  {conqueredCount}
                </span>
                <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-400 mt-1">
                  Conquistados
                </span>
              </div>

              {/* En Expedición */}
              <div className="flex flex-col items-center justify-center px-3.5 py-2.5 rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-500/5 text-center min-w-[90px]">
                <span className="font-serif text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 leading-none">
                  {exploringCount}
                </span>
                <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-400 mt-1">
                  En Expedición
                </span>
              </div>

              {/* Continentes */}
              <div className="flex flex-col items-center justify-center px-3.5 py-2.5 rounded-xl border border-blue-900/20 dark:border-blue-400/20 bg-blue-500/5 text-center min-w-[90px]">
                <span className="font-serif text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 leading-none">
                  {continentsCount}<span className="text-xs font-normal text-stone-400">/6</span>
                </span>
                <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-400 mt-1">
                  Continentes
                </span>
              </div>
            </div>

            {/* Botón Pasaporte Imprimible / Resumen */}
            <button
              type="button"
              onClick={handleOpenPassport}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-700/30 dark:border-amber-500/30 bg-[#fffcf5] dark:bg-[#151D2A] hover:bg-amber-500/15 text-stone-800 dark:text-amber-200 font-bold text-xs shadow-sm transition active:scale-95 w-full sm:w-auto"
              title="Abrir carnet diplomático y colección de sellos"
            >
              <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Ver Pasaporte & Sellos</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          BLOQUE 2: MAPA CARTOGRÁFICO INTERACTIVO (LITERARY ATLAS MAP)
         ===================================================================== */}
      <section className="relative">
        <LiteraryAtlasMap
          countries={mapCountries}
          selectedCountryCode={selectedCountryCode}
          activeContinent={activeContinent}
          onSelectCountry={(code) => {
            setSelectedCountryCode(code);
            soundService.playBrassBell();
          }}
          onSelectContinent={setActiveContinent}
          isExpanded={false}
          onToggleExpand={() => setIsMapExpanded(true)}
        />
      </section>

      {/* =====================================================================
          BLOQUE 3: PANEL DUAL DEL PAÍS SELECCIONADO
         ===================================================================== */}
      <section id="atlas-country-detail" className="catalog-card-panel p-5 sm:p-7 shadow-xl space-y-6 scroll-mt-6">
        {/* Cabecera del Territorio Activo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#242E42] pb-5">
          <div className="flex items-center gap-3.5">
            <img
              src={`https://flagcdn.com/w80/${activeCountryInfo.code.toLowerCase()}.png`}
              alt={activeCountryInfo.name}
              className="w-11 h-8 sm:w-13 sm:h-9 object-cover rounded-md shadow-md border border-amber-900/20 dark:border-amber-400/30 flex-shrink-0"
              loading="lazy"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  {CONTINENT_NAMES[activeCountryInfo.continent]}
                </span>
                <span className="font-serif italic text-xs text-amber-800/70 dark:text-amber-300/60 font-medium">
                  {activeCountryInfo.sealLatinName}
                </span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-0.5">
                {activeCountryInfo.name}
              </h3>
            </div>
          </div>

          {/* Sello de Estado Diplomático */}
          <div className="flex items-center gap-2.5">
            {isActiveConquered ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-rose-900/30 dark:border-rose-400/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs font-bold shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                <span>Sello Conquistado ({activeNode?.readCount} leídos)</span>
              </div>
            ) : isActiveExploring ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-900/30 dark:border-amber-400/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>En Expedición ({activeNode?.totalCount} en biblioteca)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-semibold">
                <span>○ Territorio Virgen por Explorar</span>
              </div>
            )}
          </div>
        </div>

        {/* Panel Dual: Cuaderno de Expedición vs Canon Nacional */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ─── Columna Izquierda: En tu Biblioteca (5 cols) ─── */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>En tu Biblioteca</span>
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-sans font-bold">
                  {currentCountryBooks.length}
                </span>
              </h4>

              {currentCountryReadCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  <Check className="w-3 h-3" /> {currentCountryReadCount} {currentCountryReadCount === 1 ? 'leído' : 'leídos'}
                </span>
              )}
            </div>

            {currentCountryBooks.length > 0 ? (
              <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                {currentCountryBooks.map((book) => {
                  const read = isBookRead(book);
                  const reading =
                    !read &&
                    (book.progreso?.toLowerCase().includes('leyendo') ||
                      book.progreso?.toLowerCase() === 'reading');

                  return (
                    <div
                      key={book.id}
                      onClick={() => onOpenBookDetail?.(book)}
                      className="group flex items-start gap-3 p-3 rounded-xl border border-amber-900/10 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#151D2A] hover:border-amber-600/40 hover:shadow-md transition cursor-pointer"
                    >
                      <div className="w-12 h-16 shrink-0 rounded overflow-hidden shadow-sm">
                        <BookCover
                          nombre={book.nombre}
                          autor={book.autor}
                          portadaUrl={book.portadaUrl}
                          portadaDataUrl={book.portadaDataUrl}
                          size="sm"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                          {book.nombre}
                        </h5>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate">
                          {book.autor || 'Autor desconocido'}
                        </p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {read ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3 h-3" /> Leído
                            </span>
                          ) : reading ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <Flame className="w-3 h-3" /> Leyendo
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                              Por leer
                            </span>
                          )}

                          {typeof book.puntuacion === 'number' && book.puntuacion > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {book.puntuacion}
                            </span>
                          )}

                          {book.fechaFin && (
                            <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-auto">
                              {book.fechaFin}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-amber-900/25 dark:border-stone-700 text-center space-y-3 bg-[#fffcf5]/50 dark:bg-[#151D2A]/40">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                    Aún no tienes libros de {activeCountryInfo.name}
                  </h5>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Añade una de las obras maestras del canon nacional a tu lista de lectura para estampar este sello en tu pasaporte.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ─── Columna Derecha: Canon Literario Nacional (7 cols) ─── */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Canon Literario Nacional</span>
                  <span className="text-xs font-normal text-stone-500 dark:text-stone-400">
                    (Descubrir)
                  </span>
                </h4>
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {canonBooks.length} obras clave
              </span>
            </div>

            <div className="space-y-3.5 max-h-[560px] overflow-y-auto pr-1">
              {canonBooks.map((cand) => {
                const alreadyInLib = isBookAlreadyInLibrary(cand, books);
                const isAdding = addingCandidateId === cand.id;

                return (
                  <div
                    key={cand.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-amber-900/15 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#151D2A] shadow-sm hover:border-amber-600/40 transition flex flex-col sm:flex-row gap-3.5 items-start"
                  >
                    {/* Portada */}
                    <div className="w-14 sm:w-16 h-20 sm:h-24 shrink-0 rounded overflow-hidden shadow-sm">
                      <BookCover
                        nombre={cand.nombre}
                        autor={cand.autor}
                        portadaUrl={cand.portadaUrl}
                        size="sm"
                      />
                    </div>

                    {/* Datos */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-serif font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 leading-snug">
                            {cand.nombre}
                          </h5>
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                            {cand.autor}
                            {cand.fechaPublicacion ? (
                              <span className="text-stone-400 font-normal ml-1.5">
                                · {cand.fechaPublicacion > 0 ? cand.fechaPublicacion : `${Math.abs(cand.fechaPublicacion)} a.C.`}
                              </span>
                            ) : null}
                          </p>
                        </div>

                        {alreadyInLib && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> En biblioteca
                          </span>
                        )}
                      </div>

                      {cand.sinopsis && (
                        <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                          {cand.sinopsis}
                        </p>
                      )}

                      {cand.recommendationReason && (
                        <p className="text-[11px] font-serif italic text-amber-900/70 dark:text-amber-300/70 line-clamp-1">
                          ✦ {cand.recommendationReason}
                        </p>
                      )}

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {!alreadyInLib ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAddCandidate(cand)}
                              disabled={isAdding}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-sm transition active:scale-95"
                            >
                              {isAdding ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              <span>Añadir a Por leer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCustomizeCandidate(cand)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-900/20 dark:border-stone-700 hover:bg-amber-500/10 text-stone-700 dark:text-stone-300 text-xs font-semibold transition"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>Personalizar</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-stone-500 italic">
                            Esta obra maestra ya forma parte de tu colección.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón para cargar más autores de ese país */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleFetchMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-700/30 dark:border-amber-500/30 bg-[#fffcf5] dark:bg-[#151D2A] hover:bg-amber-500/15 text-stone-800 dark:text-amber-200 font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span>Explorar más obras de {activeCountryInfo.name}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          BLOQUE 4: ASIGNADOR RÁPIDO PARA LIBROS SIN PAÍS
         ===================================================================== */}
      {unassignedBooks.length > 0 && (
        <section className="catalog-card-panel p-4 sm:p-5 shadow-lg border-amber-600/30 transition">
          <div
            onClick={() => setIsUnassignedOpen((prev) => !prev)}
            className="flex items-center justify-between gap-3 cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-bold">
                🧭
              </span>
              <div>
                <h4 className="font-serif text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                  Tienes {unassignedBooks.length} {unassignedBooks.length === 1 ? 'libro' : 'libros'} en tu biblioteca sin país asignado
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Asigna su territorio de origen para sumarlo al mapa y a tus visados consulares
                </p>
              </div>
            </div>

            <button
              type="button"
              className="p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 transition"
              aria-label={isUnassignedOpen ? 'Plegar' : 'Desplegar'}
            >
              {isUnassignedOpen ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>

          {isUnassignedOpen && (
            <div className="mt-4 pt-4 border-t border-amber-900/10 dark:border-[#242E42] space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {unassignedBooks.map((book) => {
                  const isBusy = assigningBookId === book.id;

                  return (
                    <div
                      key={book.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-amber-900/10 dark:border-stone-800 bg-[#fffcf5] dark:bg-[#151D2A]"
                    >
                      <div className="w-9 h-12 shrink-0 rounded overflow-hidden shadow-xs">
                        <BookCover
                          nombre={book.nombre}
                          autor={book.autor}
                          portadaUrl={book.portadaUrl}
                          portadaDataUrl={book.portadaDataUrl}
                          size="sm"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h6 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                          {book.nombre}
                        </h6>
                        <p className="text-[11px] text-stone-500 truncate">
                          {book.autor || 'Autor no especificado'}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <select
                          disabled={isBusy}
                          defaultValue=""
                          onChange={(e) => handleAssignCountry(book.id, e.target.value)}
                          className="text-xs font-semibold px-2 py-1.5 rounded-lg border border-amber-900/20 dark:border-stone-700 bg-white dark:bg-[#0E131E] text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="" disabled>
                            {isBusy ? 'Asignando...' : 'Asignar país...'}
                          </option>
                          {sortedCatalogCountries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          MODAL DE PASAPORTE COMPLETO (SI SE INVOCA LOCALMENTE)
         ===================================================================== */}
      {isPassportModalOpen && (
        <LiteraryPassportModal
          isOpen={isPassportModalOpen}
          onClose={() => setIsPassportModalOpen(false)}
          books={books}
          displayName={userDisplayName}
          username={username}
          avatarUrl={avatarUrl}
          memberId={memberId}
          onOpenBookDetail={onOpenBookDetail}
        />
      )}

      {/* =====================================================================
          MESA CARTOGRÁFICA DE GRAN FORMATO (LIGHTBOX OVERLAY DESPEJADO)
         ===================================================================== */}
      {isMapExpanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-1.5 sm:p-4 md:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsMapExpanded(false);
            }}
          >
            <div
              className="relative w-full max-w-7xl h-[94vh] sm:h-[95vh] rounded-xl sm:rounded-2xl shadow-2xl border border-amber-900/40 dark:border-amber-500/30 bg-[#f4ebd0] dark:bg-[#131b27] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mapa a pantalla completa en la mesa */}
              <LiteraryAtlasMap
                countries={mapCountries}
                selectedCountryCode={selectedCountryCode}
                activeContinent={activeContinent}
                onSelectCountry={(code) => {
                  setSelectedCountryCode(code);
                  soundService.playBrassBell();
                }}
                onSelectContinent={setActiveContinent}
                isExpanded={true}
                onToggleExpand={() => setIsMapExpanded(false)}
              />

              {/* Píldora flotante minimalista al seleccionar un país en la mesa grande */}
              {selectedCountryCode && activeCountryInfo && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#fbf6ea]/95 dark:bg-[#151d2b]/95 backdrop-blur-md border border-amber-600/40 shadow-2xl">
                    <img
                      src={`https://flagcdn.com/w40/${activeCountryInfo.code.toLowerCase()}.png`}
                      alt={activeCountryInfo.name}
                      className="w-5 h-3.5 object-cover rounded-xs border border-amber-900/20 shadow-xs"
                    />
                    <div className="flex items-center gap-1.5 font-serif text-sm font-bold text-stone-900 dark:text-stone-100">
                      <span>{activeCountryInfo.name}</span>
                      <span className="text-xs font-sans font-normal text-stone-500 dark:text-stone-400">
                        ({currentCountryBooks.length} en biblioteca · {canonBooks.length} en canon)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMapExpanded(false);
                        setTimeout(() => {
                          const el = document.getElementById('atlas-country-detail');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="ml-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white shadow-sm transition cursor-pointer"
                    >
                      <span>Ver obras</span>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default LiteraryAtlasView;
