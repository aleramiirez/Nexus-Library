import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Compass,
  Award,
  BookOpen,
  ShieldCheck,
  MapPin,
  Check
} from 'lucide-react';
import { Book } from '../types/models';
import { BookCover } from './BookCover';
import { UserAvatar } from './UserAvatar';
import {
  Continent,
  CONTINENT_NAMES,
  CountryPassportEntry,
  COUNTRIES_CATALOG,
  literaryGeographyService,
  isBookRead
} from '../services/literaryGeographyService';
import { soundService } from '../services/soundService';
import { profileService } from '../services/profileService';

export interface LiteraryPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  memberId?: string | null;
  onOpenBookDetail?: (book: Book) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type PassportTab = 'identity' | 'visas' | 'badges';

const CONTINENT_FILTERS: { id: Continent | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'europe', label: 'Europa' },
  { id: 'latam', label: 'América Latina' },
  { id: 'north_america', label: 'América del Norte' },
  { id: 'asia', label: 'Asia' },
  { id: 'africa', label: 'África' },
  { id: 'oceania', label: 'Oceanía' }
];

export const LiteraryPassportModal: React.FC<LiteraryPassportModalProps> = ({
  isOpen,
  onClose,
  books,
  displayName,
  username,
  avatarUrl,
  memberId,
  onOpenBookDetail,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<PassportTab>('visas');
  const [selectedContinent, setSelectedContinent] = useState<Continent | 'all'>('all');
  const [selectedEntry, setSelectedEntry] = useState<CountryPassportEntry | null>(null);
  const [assigningBook, setAssigningBook] = useState<Book | null>(null);

  // Calcular datos del pasaporte
  const passport = useMemo(() => {
    return literaryGeographyService.calculatePassport(books);
  }, [books]);

  // Fallback inteligente si los props vienen vacíos (por ejemplo usuario en localStorage o invitado)
  const cachedProfile = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (memberId) {
      return profileService.getCachedProfile(memberId);
    }
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('nexus_library_profile_'));
      if (keys.length > 0) {
        const raw = localStorage.getItem(keys[0]);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Ignorar errores de storage
    }
    return null;
  }, [memberId]);

  const effectiveDisplayName =
    displayName?.trim() ||
    cachedProfile?.displayName ||
    cachedProfile?.username ||
    profileService.getGuestAlias() ||
    'Lector Nexus';

  const effectiveUsername =
    username?.trim() ||
    cachedProfile?.username ||
    (profileService.getGuestAlias()
      ? profileService.getGuestAlias().toLowerCase().replace(/\s+/g, '_')
      : 'lector');

  const effectiveAvatarUrl =
    avatarUrl ||
    cachedProfile?.avatarUrl ||
    profileService.getGuestAvatar() ||
    null;

  const cleanName = effectiveDisplayName;
  const cleanUsername = effectiveUsername.startsWith('@') ? effectiveUsername : `@${effectiveUsername}`;
  const cleanId = (memberId || cachedProfile?.id || 'INVITADO').slice(0, 8).toUpperCase();

  const filteredEntries = useMemo(() => {
    if (selectedContinent === 'all') return passport.entries;
    return passport.entries.filter((e) => e.country.continent === selectedContinent);
  }, [passport.entries, selectedContinent]);

  // Libros del país seleccionado ordenados con prioridad a los leídos
  const sortedEntryBooks = useMemo(() => {
    if (!selectedEntry?.books) return [];
    return [...selectedEntry.books].sort((a, b) => {
      const aRead = isBookRead(a);
      const bRead = isBookRead(b);
      if (aRead !== bRead) return aRead ? -1 : 1;

      const aReading =
        !aRead &&
        (a.progreso?.toLowerCase().includes('leyendo') ||
          a.progreso?.toLowerCase() === 'reading');
      const bReading =
        !bRead &&
        (b.progreso?.toLowerCase().includes('leyendo') ||
          b.progreso?.toLowerCase() === 'reading');
      if (aReading !== bReading) return aReading ? -1 : 1;

      return (a.nombre || '').localeCompare(b.nombre || '', 'es');
    });
  }, [selectedEntry]);

  if (!isOpen) return null;

  const handleTabChange = (tab: PassportTab) => {
    setActiveTab(tab);
  };

  const handleSelectEntry = (entry: CountryPassportEntry) => {
    setSelectedEntry(entry);
  };

  const handleAssignCountry = (book: Book, countryCode: string) => {
    literaryGeographyService.setAuthorCountry(book.autor, countryCode);
    setAssigningBook(null);
    soundService.playInkStamp();
    onShowToast?.(
      `¡Autor «${book.autor}» asignado a ${COUNTRIES_CATALOG[countryCode]?.name || countryCode}!`,
      'success'
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 pt-8 sm:pt-10 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="catalog-card-panel relative w-full max-w-4xl max-h-[90vh] flex flex-col p-0 shadow-2xl mt-3 sm:mt-4 overflow-visible">
        {/* Pestaña de latón superior */}
        <div className="catalog-brass-tab z-20 whitespace-nowrap">
          Pasaporte Consular · República de las Letras
        </div>

        {/* Cabecera ceremonial */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-amber-900/15 dark:border-[#242f42] bg-[#f7eedc]/85 dark:bg-[#141b27]/85 rounded-t-[14px]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-600/30 dark:border-amber-400/30 shadow-xs">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber-800 dark:text-amber-400 font-bold">
                  EXPEDIENTE CONSULAR LITERARIO
                </span>
                <span className="hidden sm:inline-block px-2 py-0.2 rounded-full bg-amber-900/10 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 text-[10px] font-mono border border-amber-900/20 dark:border-amber-400/20">
                  № NL-PAS-{cleanId}
                </span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 leading-tight">
                Pasaporte Literario Internacional
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar Pasaporte"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de pestañas interiores del Pasaporte: pestañas archivísticas limpias sin marcos apretados */}
        <div className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 border-b border-amber-900/15 dark:border-[#242f42] bg-[#f7eedc]/90 dark:bg-[#141b27]/90 text-xs font-serif overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleTabChange('visas')}
            className={`relative py-3 px-1 transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'visas'
                ? 'text-amber-950 dark:text-amber-300 font-bold border-b-2 border-amber-800 dark:border-amber-400 -mb-[1px]'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200 border-b-2 border-transparent'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="sm:hidden font-semibold">Visados</span>
            <span className="hidden sm:inline font-semibold">Visados y Sellos Consulares</span>
            <span className="ml-0.5 sm:ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-mono font-bold shrink-0">
              {passport.totalCountriesStamped}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('identity')}
            className={`relative py-3 px-1 transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'identity'
                ? 'text-amber-950 dark:text-amber-300 font-bold border-b-2 border-amber-800 dark:border-amber-400 -mb-[1px]'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200 border-b-2 border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="sm:hidden font-semibold">Ficha Consular</span>
            <span className="hidden sm:inline font-semibold">Ficha Consular del Lector</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('badges')}
            className={`relative py-3 px-1 transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'badges'
                ? 'text-amber-950 dark:text-amber-300 font-bold border-b-2 border-amber-800 dark:border-amber-400 -mb-[1px]'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200 border-b-2 border-transparent'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="sm:hidden font-semibold">Insignias</span>
            <span className="hidden sm:inline font-semibold">Insignias de Exploración</span>
            <span className="ml-0.5 sm:ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-mono font-bold shrink-0">
              {passport.badges.filter((b) => b.unlocked).length}/{passport.badges.length}
            </span>
          </button>
        </div>

        {/* Contenido del Pasaporte (soporta papel claro y modo oscuro) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 rounded-b-[18px]">
          {/* ════════════════════ PESTAÑA 1: VISADOS Y SELLOS ════════════════════ */}
          {activeTab === 'visas' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Filtro de continentes */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {CONTINENT_FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedContinent(item.id);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-serif font-semibold transition ${
                        selectedContinent === item.id
                          ? 'bg-amber-600 dark:bg-amber-500 text-white dark:text-slate-950 font-bold shadow-xs'
                          : 'bg-amber-900/5 dark:bg-[#151d2d] text-stone-700 dark:text-slate-300 hover:bg-amber-500/10 border border-amber-900/15 dark:border-slate-700/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 font-semibold">
                  {passport.totalCountriesStamped} países sellados · {passport.totalContinentsStamped} continentes
                </span>
              </div>

              {/* Cuadrícula de Sellos de Visado Consular */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
                {filteredEntries.map((entry) => {
                  const c = entry.country;
                  const isStamped = entry.stamped;

                  return (
                    <div
                      key={c.code}
                      onClick={() => handleSelectEntry(entry)}
                      role="button"
                      tabIndex={0}
                      className={`group relative p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-between text-center select-none ${
                        isStamped
                          ? 'border-amber-700/30 dark:border-amber-500/40 bg-gradient-to-b from-[#fffcf5] to-[#f7eedc] dark:from-[#182338] dark:to-[#101827] hover:border-amber-600 dark:hover:border-amber-400 hover:scale-103 shadow-md'
                          : 'border-stone-300/70 dark:border-slate-800 bg-stone-200/30 dark:bg-[#0d131f]/60 opacity-55 hover:opacity-85'
                      }`}
                    >
                      {/* Sello de visado gráfico con tinta */}
                      <div
                        className={`w-full py-2.5 px-2 rounded-xl flex flex-col items-center justify-center transition ${
                          isStamped
                            ? 'border-2 border-dashed'
                            : 'border border-dotted border-stone-400/50 dark:border-slate-700'
                        }`}
                        style={{
                          borderColor: isStamped ? `${c.color}75` : undefined,
                          backgroundColor: isStamped ? `${c.color}0d` : 'transparent'
                        }}
                      >
                        {/* Bandera / Código Consular */}
                        <div className="flex items-center gap-1.5">
                          <img
                            src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                            alt=""
                            className="w-5 h-3.5 object-cover rounded-xs border border-black/10 shadow-xs"
                            loading="lazy"
                          />
                          <span
                            className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded border uppercase"
                            style={{
                              color: isStamped ? c.color : '#78716c',
                              borderColor: isStamped ? `${c.color}40` : '#a8a29e',
                              backgroundColor: isStamped ? `${c.color}15` : 'transparent'
                            }}
                          >
                            {c.code}
                          </span>
                        </div>

                        <span
                          className="font-mono text-[8.5px] uppercase tracking-widest font-black mt-1"
                          style={{ color: isStamped ? c.color : '#78716c' }}
                        >
                          {c.sealLatinName}
                        </span>

                        <span className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 mt-0.5 leading-tight">
                          {c.name}
                        </span>
                      </div>

                      {/* Estado del visado */}
                      <div className="mt-3 pt-2 border-t border-amber-900/10 dark:border-slate-800 w-full flex items-center justify-between text-[10px] font-mono">
                        {isStamped ? (
                          <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1 mx-auto">
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            {entry.readCount} {entry.readCount === 1 ? 'obra leída' : 'obras leídas'}
                          </span>
                        ) : (
                          <span className="text-stone-500 dark:text-slate-500 mx-auto italic font-serif">
                            Por descubrir
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Obras sin identificar país (con selector amigable para el lector) */}
              {passport.unmappedBooks.length > 0 && (
                <div className="mt-8 pt-5 border-t border-amber-900/15 dark:border-amber-900/20">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-amber-200">
                        Obras sin país asignado ({passport.unmappedBooks.length})
                      </h3>
                    </div>
                    <span className="text-[11px] text-stone-600 dark:text-slate-400">
                      Asigna la procedencia de sus autores para coleccionar sus sellos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {passport.unmappedBooks.slice(0, 6).map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl border border-amber-900/15 dark:border-slate-800 bg-[#fffcf5]/70 dark:bg-[#121929] flex items-center justify-between gap-2 shadow-xs"
                      >
                        <div className="truncate text-left">
                          <p className="font-serif text-xs font-semibold text-stone-900 dark:text-slate-200 truncate">
                            {b.nombre}
                          </p>
                          <p className="text-[10px] text-stone-600 dark:text-slate-400 truncate">
                            {b.autor || 'Autor desconocido'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAssigningBook(b)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-600/30 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 text-[10px] font-bold shrink-0 transition"
                        >
                          Asignar país
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════ PESTAÑA 2: FICHA CONSULAR ════════════════════ */}
          {activeTab === 'identity' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Carnet Consular de Pasaporte */}
              <div className="rounded-3xl bg-gradient-to-br from-[#fbf4e2] via-[#f7ecd5] to-[#f2e2be] dark:from-[#1a2336] dark:via-[#141b2a] dark:to-[#0c121e] border-2 border-amber-800/25 dark:border-amber-500/35 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                  {/* Foto o Sello Heráldico Consular */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="p-1 rounded-2xl border-2 border-amber-600/40 dark:border-amber-400 bg-amber-500/10 dark:bg-amber-950/40 shadow-md">
                      <UserAvatar
                        avatarUrl={effectiveAvatarUrl}
                        displayName={cleanName}
                        username={cleanUsername}
                        size="xl"
                        className="w-24 h-24 sm:w-28 sm:h-28 text-3xl font-serif rounded-xl"
                      />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-amber-900 dark:text-amber-400 font-black">
                      VISADO OFICIAL
                    </span>
                  </div>

                  {/* Datos del Ciudadano de las Letras */}
                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/30 dark:border-amber-500/30 font-mono text-[11px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{passport.diplomaticRank.badge}</span>
                      </div>
                      <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-full bg-amber-900/10 dark:bg-amber-400/10 border border-amber-900/15 dark:border-amber-400/20 text-stone-600 dark:text-slate-400 font-semibold">
                        NL-PAS-{cleanId}
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-amber-100">
                      {cleanName}
                    </h3>
                    <p className="font-mono text-xs text-amber-800 dark:text-amber-400 font-bold">
                      {cleanUsername}
                    </p>

                    <div className="pt-2 border-t border-amber-900/15 dark:border-slate-700/60">
                      <p className="font-serif text-sm font-bold text-stone-800 dark:text-slate-200">
                        {passport.diplomaticRank.title}
                      </p>
                      <p className="font-serif italic text-xs text-amber-900/80 dark:text-amber-400/80 font-medium">
                        {passport.diplomaticRank.latinTitle}
                      </p>
                      <p className="text-xs text-stone-700 dark:text-slate-400 mt-1 leading-relaxed">
                        {passport.diplomaticRank.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métricas Consulares Clave */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-amber-900/20 dark:border-amber-900/30">
                  <div className="p-3 rounded-xl bg-white/60 dark:bg-black/30 border border-amber-900/15 dark:border-slate-800 text-center shadow-xs">
                    <span className="text-[10px] font-mono uppercase text-stone-600 dark:text-slate-400 block font-semibold">
                      Países Sellados
                    </span>
                    <span className="font-serif text-2xl font-bold text-amber-800 dark:text-amber-300">
                      {passport.totalCountriesStamped}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/60 dark:bg-black/30 border border-amber-900/15 dark:border-slate-800 text-center shadow-xs">
                    <span className="text-[10px] font-mono uppercase text-stone-600 dark:text-slate-400 block font-semibold">
                      Continentes
                    </span>
                    <span className="font-serif text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {passport.totalContinentsStamped}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/60 dark:bg-black/30 border border-amber-900/15 dark:border-slate-800 text-center shadow-xs">
                    <span className="text-[10px] font-mono uppercase text-stone-600 dark:text-slate-400 block font-semibold">
                      Obras Catalogadas
                    </span>
                    <span className="font-serif text-2xl font-bold text-stone-900 dark:text-slate-100">
                      {passport.totalBooksMapped}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/60 dark:bg-black/30 border border-amber-900/15 dark:border-slate-800 text-center shadow-xs">
                    <span className="text-[10px] font-mono uppercase text-stone-600 dark:text-slate-400 block font-semibold">
                      Insignias Consulares
                    </span>
                    <span className="font-serif text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {passport.badges.filter((b) => b.unlocked).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════ PESTAÑA 3: INSIGNIAS DE EXPLORACIÓN ════════════════════ */}
          {activeTab === 'badges' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {passport.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-2xl border-2 transition flex items-start gap-4 ${
                      badge.unlocked
                        ? 'border-amber-700/30 dark:border-amber-500/40 bg-gradient-to-br from-[#fffcf5] to-[#f7eedc] dark:from-[#182438] dark:to-[#0f1726] shadow-sm'
                        : 'border-stone-300/70 dark:border-slate-800/80 bg-stone-200/40 dark:bg-[#0d121c]/50 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                        badge.unlocked
                          ? 'bg-amber-500/20 border-amber-600/30 dark:border-amber-500/40 shadow-inner'
                          : 'bg-stone-300/40 dark:bg-slate-800/40 border-stone-400 dark:border-slate-700'
                      }`}
                    >
                      {badge.icon}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100">
                          {badge.title}
                        </h4>
                        {badge.unlocked && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/30">
                            SELLADO
                          </span>
                        )}
                      </div>
                      <p className="font-serif italic text-xs text-amber-800 dark:text-amber-400/80 font-semibold">
                        {badge.latinTitle}
                      </p>
                      <p className="text-xs text-stone-600 dark:text-slate-400 leading-snug">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Modal Desplegable de Inspección de Visado de País ─── */}
        {selectedEntry && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
            <div className="catalog-card-panel relative w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-900/15 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <img
                    src={`https://flagcdn.com/w80/${selectedEntry.country.code.toLowerCase()}.png`}
                    alt={selectedEntry.country.name}
                    className="w-10 h-7 object-cover rounded shadow border border-amber-900/20 shrink-0"
                    loading="lazy"
                  />
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-amber-800 dark:text-amber-400 font-black block">
                      VISADO CONSULAR · {selectedEntry.country.sealLatinName}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                      {selectedEntry.country.name} ({CONTINENT_NAMES[selectedEntry.country.continent] || selectedEntry.country.continent})
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Estadísticas de este país */}
              <div className="flex items-center justify-between text-xs font-mono text-stone-800 dark:text-slate-300 p-2.5 rounded-xl bg-amber-900/5 dark:bg-black/30 border border-amber-900/15 dark:border-slate-800">
                <span>Obras leídas: <strong className="text-amber-800 dark:text-amber-400">{selectedEntry.readCount}</strong></span>
                <span>Total en biblioteca: <strong className="text-amber-800 dark:text-amber-400">{selectedEntry.books.length}</strong></span>
                <span>Autores: <strong className="text-amber-800 dark:text-amber-400">{selectedEntry.authors.length}</strong></span>
              </div>

              {/* Lista de libros de este país (prioridad absoluta a los leídos) */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {sortedEntryBooks.length === 0 ? (
                  <div className="py-6 px-4 text-center border border-dashed border-amber-900/20 dark:border-slate-800 rounded-xl bg-amber-900/5 dark:bg-black/20">
                    <p className="font-serif text-xs italic text-stone-600 dark:text-slate-400">
                      Aún no has registrado obras de este país.
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-1">
                      ¡Lee una obra o asigna un autor de su literatura para conseguir este sello!
                    </p>
                  </div>
                ) : (
                  sortedEntryBooks.map((b) => {
                    const isRead = isBookRead(b);
                    const isReading =
                      !isRead &&
                      (b.progreso?.toLowerCase().includes('leyendo') ||
                        b.progreso?.toLowerCase() === 'reading');

                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedEntry(null);
                          onClose();
                          onOpenBookDetail?.(b);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition group shadow-xs ${
                          isRead
                            ? 'border-emerald-600/35 dark:border-emerald-500/30 bg-[#f7fcf7] dark:bg-[#0c1914] hover:border-emerald-600'
                            : 'border-amber-900/15 dark:border-slate-800 hover:border-amber-600 dark:hover:border-amber-500/40 bg-[#fffcf5] dark:bg-[#0d131f]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-8 h-11 shrink-0 rounded overflow-hidden shadow">
                            <BookCover
                              nombre={b.nombre}
                              autor={b.autor}
                              portadaUrl={b.portadaUrl}
                              portadaFallbackUrl={b.portadaFallbackUrl}
                              portadaDataUrl={b.portadaDataUrl}
                              size="sm"
                              variant="book"
                            />
                          </div>
                          <div className="truncate">
                            <p className="font-serif text-xs font-bold text-stone-900 dark:text-slate-200 truncate group-hover:text-amber-700 dark:group-hover:text-amber-300">
                              {b.nombre}
                            </p>
                            <p className="text-[11px] text-stone-600 dark:text-slate-400 truncate">
                              {b.autor}
                            </p>
                          </div>
                        </div>

                        {isRead ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 shrink-0 border border-emerald-600/35">
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Leído</span>
                            {b.puntuacion ? (
                              <span className="ml-0.5 text-amber-600 dark:text-amber-400">★{b.puntuacion}</span>
                            ) : null}
                          </span>
                        ) : isReading ? (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 shrink-0 border border-amber-600/25">
                            Leyendo
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0 border border-stone-300/40 dark:border-stone-700">
                            Por leer
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal para Asignar País a un Autor ─── */}
        {assigningBook && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
            <div className="catalog-card-panel relative w-full max-w-md p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-900/15 dark:border-slate-700">
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                    Asignar País a {assigningBook.autor || 'Autor'}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400">
                    Libro: «{assigningBook.nombre}»
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigningBook(null)}
                  className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto grid grid-cols-2 gap-2 pr-1 text-xs">
                {Object.values(COUNTRIES_CATALOG).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleAssignCountry(assigningBook, c.code)}
                    className="p-2 rounded-xl border border-amber-900/15 dark:border-slate-800 hover:border-amber-600 dark:hover:border-amber-400 bg-[#fffcf5] dark:bg-[#0d131f] flex items-center gap-2 text-left transition hover:bg-amber-500/10 shadow-xs"
                  >
                    <img
                      src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                      alt=""
                      className="w-5 h-3.5 object-cover rounded-xs border border-black/10 shrink-0"
                      loading="lazy"
                    />
                    <span className="font-serif font-bold text-stone-900 dark:text-slate-200">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
