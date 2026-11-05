import React, { useMemo } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  FileText,
  BookOpen,
  FileUp,
  ShieldCheck
} from 'lucide-react';
import { Book } from '../../types/models';
import { BatchMetadataMode } from '../BatchMetadataModal';
import { DashboardCard, DashboardCardHeader } from '../DashboardCard';
import '../../dashboard-panels.css';

interface SettingsMetadataTabProps {
  books: Book[];
  onOpenEpubImport?: () => void;
  isPersisted: boolean | null;
  onRequestStorage: () => Promise<void>;
  onOpenBatchModal: (mode: BatchMetadataMode) => void;
}

export const SettingsMetadataTab: React.FC<SettingsMetadataTabProps> = ({
  books,
  onOpenEpubImport,
  isPersisted,
  onRequestStorage,
  onOpenBatchModal
}) => {
  const {
    booksMissingCovers,
    booksWithCoversCount,
    coverPercentage,
    booksMissingSynopsis,
    booksWithSynopsisCount,
    synopsisPercentage
  } = useMemo(() => {
    const missingCovers = books.filter((b) => !b.portadaUrl && !b.portadaDataUrl);
    const withCovers = books.length - missingCovers.length;
    const cPct = books.length > 0 ? Math.round((withCovers / books.length) * 100) : 100;
    const missingSyn = books.filter((b) => !b.sinopsis || b.sinopsis.trim().length === 0);
    const withSyn = books.length - missingSyn.length;
    const sPct = books.length > 0 ? Math.round((withSyn / books.length) * 100) : 100;
    return {
      booksMissingCovers: missingCovers,
      booksWithCoversCount: withCovers,
      coverPercentage: cPct,
      booksMissingSynopsis: missingSyn,
      booksWithSynopsisCount: withSyn,
      synopsisPercentage: sPct
    };
  }, [books]);

  return (
    <div className="space-y-6">
      <DashboardCard variant="base" className="space-y-5">
        <DashboardCardHeader
          icon={<Sparkles className="w-5 h-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />}
          title="Portadas y Datos de Libros"
          subtitle="Completa automáticamente las portadas que falten y añade detalles como la sinopsis, editorial, fecha de publicación e ISBN buscando en los catálogos bibliográficos oficiales."
        />

        {/* Grid con las dos tarjetas asistidas: Portadas y Sinopsis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta 1: Portadas de Libros */}
          <div className="rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/90 p-5 flex flex-col justify-between gap-4 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-stone-600 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                  <ImageIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  Portadas de Libros
                </span>
                <span className="rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-bold px-2 py-0.5">
                  {coverPercentage}%
                </span>
              </div>

              <div>
                <span className="font-serif text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-300">
                  {booksWithCoversCount} de {books.length}
                </span>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                  libros con portada registrada
                </p>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-1.5">
                <div className="w-full h-2 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                    style={{ width: `${coverPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-400">
                  <span>{booksWithCoversCount} con portada</span>
                  <span>{booksMissingCovers.length} sin portada</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenBatchModal('covers')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {booksMissingCovers.length === 0
                  ? 'Revisar portadas del catálogo'
                  : `Completar portadas (${booksMissingCovers.length} faltantes)`}
              </span>
            </button>
          </div>

          {/* Tarjeta 2: Sinopsis & Argumentos */}
          <div className="rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/90 p-5 flex flex-col justify-between gap-4 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-stone-600 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                  <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  Sinopsis & Argumentos
                </span>
                <span className="rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-bold px-2 py-0.5">
                  {synopsisPercentage}%
                </span>
              </div>

              <div>
                <span className="font-serif text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-300">
                  {booksWithSynopsisCount} de {books.length}
                </span>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                  libros con sinopsis registrada
                </p>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-1.5">
                <div className="w-full h-2 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                    style={{ width: `${synopsisPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-400">
                  <span>{booksWithSynopsisCount} con sinopsis</span>
                  <span>{booksMissingSynopsis.length} sin sinopsis</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenBatchModal('synopsis')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>
                {booksMissingSynopsis.length === 0
                  ? 'Revisar sinopsis del catálogo'
                  : `Completar sinopsis (${booksMissingSynopsis.length} faltantes)`}
              </span>
            </button>
          </div>
        </div>

        {onOpenEpubImport && (
          <div className="rounded-xl border border-amber-600/35 dark:border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-[#f4ebd6] to-[#efe3c8] dark:from-amber-500/10 dark:via-[#161E2E] dark:to-[#101520] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-600/30 shrink-0 mt-0.5">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                  Cargar Libros desde Archivos (.epub, .fb2, .pdf)
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 leading-relaxed max-w-xl">
                  Sube uno o varios archivos de libros desde tu ordenador o móvil. Nexus Library lee sus metadatos internos para rellenar título, autor, portada original, sinopsis, páginas y saga automáticamente.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenEpubImport}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-md shrink-0"
            >
              <FileUp className="w-4 h-4" /> Subir archivos (.epub)
            </button>
          </div>
        )}

        {/* Blindaje de almacenamiento en el navegador */}
        <div className="rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-slate-100">
                Protección de datos en este equipo
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                {isPersisted
                  ? 'Activado: Tu navegador no borrará tu biblioteca aunque quede poco espacio en disco.'
                  : 'Protege tu biblioteca local contra limpiezas automáticas de archivos temporales del navegador.'}
              </p>
            </div>
          </div>

          {!isPersisted && (
            <button
              type="button"
              onClick={onRequestStorage}
              className="rounded-xl border border-amber-900/25 dark:border-slate-700 hover:border-amber-500 bg-[#fffcf5] dark:bg-[#0D1017] px-3.5 py-2 text-xs font-semibold text-stone-800 dark:text-slate-200 transition shrink-0"
            >
              Activar protección
            </button>
          )}
        </div>
      </DashboardCard>
    </div>
  );
};
