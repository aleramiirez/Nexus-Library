import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Globe,
  Compass,
  Award,
  BookOpen,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  MapPin,
  Check,
  Layers,
  ArrowRight,
  Volume2
} from 'lucide-react';
import { Book } from '../types/models';
import { BookCover } from './BookCover';
import { UserAvatar } from './UserAvatar';
import {
  Continent,
  CountryPassportEntry,
  COUNTRIES_CATALOG,
  literaryGeographyService
} from '../services/literaryGeographyService';
import { soundService } from '../services/soundService';

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
  const [selectedContinent, setSelectedContinent] = useState<Continent | 'Todos'>('Todos');
  const [selectedEntry, setSelectedEntry] = useState<CountryPassportEntry | null>(null);
  const [assigningBook, setAssigningBook] = useState<Book | null>(null);

  // Calcular datos del pasaporte
  const passport = useMemo(() => {
    return literaryGeographyService.calculatePassport(books);
  }, [books]);

  const cleanName = displayName?.trim() || 'Lector Nexus';
  const cleanUsername = username?.trim() ? `@${username.trim()}` : '@lector';
  const cleanId = (memberId || 'INVITADO').slice(0, 8).toUpperCase();

  const filteredEntries = useMemo(() => {
    if (selectedContinent === 'Todos') return passport.entries;
    return passport.entries.filter((e) => e.country.continent === selectedContinent);
  }, [passport.entries, selectedContinent]);

  if (!isOpen) return null;

  const handleTabChange = (tab: PassportTab) => {
    setActiveTab(tab);
    soundService.playPageTurn();
  };

  const handleSelectEntry = (entry: CountryPassportEntry) => {
    setSelectedEntry(entry);
    soundService.playInkStamp();
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 pt-7 sm:pt-9 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0e1422] text-slate-100 shadow-2xl border-2 border-amber-600/30 overflow-hidden ring-1 ring-amber-400/20">
        {/* Cabecera ceremonial de pasaporte */}
        <div className="relative bg-gradient-to-r from-[#172033] via-[#1f2c45] to-[#172033] border-b border-amber-500/25 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-xs">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-bold">
                  REPÚBLICA DE LAS LETRAS · EXPEDIENTE CONSULAR
                </span>
                <span className="hidden sm:inline-block px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-mono border border-amber-500/20">
                  № NL-PAS-{cleanId}
                </span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-amber-100 leading-tight">
                Pasaporte Literario Internacional
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar Pasaporte"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de pestañas interiores del Pasaporte */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#121929] border-b border-amber-900/20 text-xs font-serif font-semibold">
          <button
            type="button"
            onClick={() => handleTabChange('visas')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'visas'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/35 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Visados y Sellos Consulares</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono">
              {passport.totalCountriesStamped}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('identity')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'identity'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/35 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Ficha Consular del Lector</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('badges')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'badges'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/35 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Insignias de Exploración</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono">
              {passport.badges.filter((b) => b.unlocked).length}/{passport.badges.length}
            </span>
          </button>
        </div>

        {/* Contenido scrolleable del Pasaporte */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#090d16] space-y-6">
          {/* ════════════════════ PESTAÑA 1: VISADOS Y SELLOS ════════════════════ */}
          {activeTab === 'visas' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Filtro de continentes */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {(
                    ['Todos', 'Europa', 'América Latina', 'América del Norte', 'Asia', 'África'] as const
                  ).map((cont) => (
                    <button
                      key={cont}
                      type="button"
                      onClick={() => {
                        setSelectedContinent(cont);
                        soundService.playPageTurn();
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-serif font-medium transition ${
                        selectedContinent === cont
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'bg-[#151d2d] text-slate-400 hover:text-amber-200 border border-slate-700/50'
                      }`}
                    >
                      {cont}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] font-mono text-amber-300/80">
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
                      className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-between text-center select-none ${
                        isStamped
                          ? 'border-amber-500/40 bg-gradient-to-b from-[#182338] to-[#101827] hover:border-amber-400 hover:scale-103 shadow-lg'
                          : 'border-slate-800 bg-[#0d131f]/60 opacity-50 hover:opacity-80'
                      }`}
                      style={{
                        boxShadow: isStamped ? `0 8px 24px -6px ${c.color}25` : undefined
                      }}
                    >
                      {/* Sello de visado gráfico */}
                      <div
                        className={`w-full py-2.5 px-2 rounded-xl flex flex-col items-center justify-center transition ${
                          isStamped
                            ? 'border border-dashed'
                            : 'border border-dotted border-slate-700'
                        }`}
                        style={{
                          borderColor: isStamped ? `${c.color}60` : undefined,
                          backgroundColor: isStamped ? `${c.color}10` : 'transparent'
                        }}
                      >
                        <span className="text-2xl filter drop-shadow">{c.flag}</span>
                        <span
                          className="font-mono text-[9px] uppercase tracking-widest font-bold mt-1"
                          style={{ color: isStamped ? c.color : '#94a3b8' }}
                        >
                          {c.sealLatinName}
                        </span>
                        <span className="font-serif font-bold text-sm text-slate-100 mt-0.5">
                          {c.name}
                        </span>
                      </div>

                      {/* Estado del visado */}
                      <div className="mt-3 pt-2 border-t border-slate-800 w-full flex items-center justify-between text-[10px] font-mono">
                        {isStamped ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1 mx-auto">
                            <Check className="w-3 h-3 text-emerald-400" />
                            {entry.readCount} {entry.readCount === 1 ? 'obra' : 'obras'}
                          </span>
                        ) : (
                          <span className="text-slate-500 mx-auto italic font-serif">
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
                <div className="mt-8 pt-5 border-t border-amber-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-500" />
                      <h3 className="font-serif text-sm font-bold text-amber-200">
                        Obras sin país asignado ({passport.unmappedBooks.length})
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Asigna la procedencia de sus autores para coleccionar sus sellos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {passport.unmappedBooks.slice(0, 6).map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl border border-slate-800 bg-[#121929] flex items-center justify-between gap-2"
                      >
                        <div className="truncate text-left">
                          <p className="font-serif text-xs font-semibold text-slate-200 truncate">
                            {b.nombre}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {b.autor || 'Autor desconocido'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAssigningBook(b)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-bold shrink-0 transition"
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
              <div className="rounded-3xl bg-gradient-to-br from-[#1a2336] via-[#141b2a] to-[#0c121e] border-2 border-amber-500/35 p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                  {/* Foto o Sello Heráldico Consular */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="p-1 rounded-2xl border-2 border-amber-400 bg-amber-950/40 shadow-xl">
                      <UserAvatar
                        avatarUrl={avatarUrl}
                        displayName={cleanName}
                        size="xl"
                        className="w-24 h-24 sm:w-28 sm:h-28 text-3xl font-serif rounded-xl"
                      />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-amber-400 font-bold">
                      VISADO OFICIAL
                    </span>
                  </div>

                  {/* Datos del Ciudadano de las Letras */}
                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{passport.diplomaticRank.badge}</span>
                    </div>

                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-amber-100">
                      {cleanName}
                    </h3>
                    <p className="font-mono text-xs text-amber-400">{cleanUsername}</p>

                    <div className="pt-2 border-t border-slate-700/60">
                      <p className="font-serif text-sm font-semibold text-slate-200">
                        {passport.diplomaticRank.title}
                      </p>
                      <p className="font-serif italic text-xs text-amber-400/80">
                        {passport.diplomaticRank.latinTitle}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {passport.diplomaticRank.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métricas Consulares Clave */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-amber-900/30">
                  <div className="p-3 rounded-xl bg-black/30 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Países Sellados
                    </span>
                    <span className="font-serif text-2xl font-bold text-amber-300">
                      {passport.totalCountriesStamped}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Continentes
                    </span>
                    <span className="font-serif text-2xl font-bold text-emerald-300">
                      {passport.totalContinentsStamped}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Obras Catalogadas
                    </span>
                    <span className="font-serif text-2xl font-bold text-slate-100">
                      {passport.totalBooksMapped}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-slate-800 text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Insignias Consulares
                    </span>
                    <span className="font-serif text-2xl font-bold text-amber-400">
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
                        ? 'border-amber-500/40 bg-gradient-to-br from-[#182438] to-[#0f1726] shadow-md'
                        : 'border-slate-800/80 bg-[#0d121c]/50 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                        badge.unlocked
                          ? 'bg-amber-500/20 border-amber-500/40 shadow-inner'
                          : 'bg-slate-800/40 border-slate-700'
                      }`}
                    >
                      {badge.icon}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-sm text-slate-100">
                          {badge.title}
                        </h4>
                        {badge.unlocked && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/30">
                            SELLADO
                          </span>
                        )}
                      </div>
                      <p className="font-serif italic text-xs text-amber-400/80">
                        {badge.latinTitle}
                      </p>
                      <p className="text-xs text-slate-400 leading-snug">
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
            <div className="relative w-full max-w-lg rounded-2xl bg-[#131c2d] border-2 border-amber-500/40 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{selectedEntry.country.flag}</span>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-amber-400 font-bold block">
                      VISADO CONSULAR · {selectedEntry.country.sealLatinName}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-white">
                      {selectedEntry.country.name} ({selectedEntry.country.continent})
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Estadísticas de este país */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 p-2.5 rounded-xl bg-black/30 border border-slate-800">
                <span>Obras leídas: <strong className="text-amber-400">{selectedEntry.readCount}</strong></span>
                <span>Autores: <strong className="text-amber-400">{selectedEntry.authors.length}</strong></span>
              </div>

              {/* Lista de libros de este país */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {selectedEntry.books.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedEntry(null);
                      onOpenBookDetail?.(b);
                    }}
                    className="p-2.5 rounded-xl border border-slate-800 hover:border-amber-500/40 bg-[#0d131f] flex items-center justify-between gap-3 cursor-pointer transition group"
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
                        <p className="font-serif text-xs font-bold text-slate-200 truncate group-hover:text-amber-300">
                          {b.nombre}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {b.autor}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 shrink-0 border border-amber-500/20">
                      {b.progreso || 'Registrado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal para Asignar País a un Autor ─── */}
        {assigningBook && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
            <div className="relative w-full max-w-md rounded-2xl bg-[#131c2d] border-2 border-amber-500/40 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div>
                  <h3 className="font-serif text-base font-bold text-white">
                    Asignar País a {assigningBook.autor || 'Autor'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Libro: «{assigningBook.nombre}»
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigningBook(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
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
                    className="p-2 rounded-xl border border-slate-800 hover:border-amber-400 bg-[#0d131f] flex items-center gap-2 text-left transition hover:bg-amber-500/10"
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="font-serif font-bold text-slate-200">{c.name}</span>
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
