import React from 'react';
import {
  HardDrive,
  FileUp,
  FileCode,
  Download,
  FileSpreadsheet,
  Upload,
  BookOpen
} from 'lucide-react';
import { Book, Saga } from '../../types/models';
import { DashboardCard, DashboardCardHeader } from '../DashboardCard';
import '../../dashboard-panels.css';

interface SettingsBackupTabProps {
  books: Book[];
  sagas: Saga[];
  onOpenEpubImport?: () => void;
  onDownloadJson: () => void;
  onDownloadCsv: () => void;
  onImportCsvFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRestoreJsonFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsBackupTab: React.FC<SettingsBackupTabProps> = ({
  books,
  sagas,
  onOpenEpubImport,
  onDownloadJson,
  onDownloadCsv,
  onImportCsvFile,
  onRestoreJsonFile
}) => {
  return (
    <div className="space-y-6">
      <DashboardCard variant="base" className="space-y-6">
        <DashboardCardHeader
          icon={<HardDrive className="w-5 h-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />}
          title="Copias de Seguridad y Portabilidad"
          subtitle="Tus lecturas te pertenecen. Puedes guardar una copia completa de seguridad para conservarla en tu ordenador o exportar tus libros para abrirlos en una hoja de cálculo."
        />

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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-md shrink-0 cursor-pointer"
            >
              <FileUp className="w-4 h-4" /> Subir archivos (.epub)
            </button>
          </div>
        )}

        {/* Opciones de Exportación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                <FileCode className="w-4 h-4" />
                <span>Copia Completa de Seguridad (JSON)</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Guarda toda tu biblioteca con libros, sagas, fechas de lectura, valoraciones y
                notas personales. Es el formato ideal para restaurar tu colección en cualquier momento.
              </p>
            </div>
            <button
              type="button"
              onClick={onDownloadJson}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition shadow-sm w-full cursor-pointer"
            >
              <Download className="w-4 h-4" /> Descargar Copia ({books.length} libros)
            </button>
          </div>

          <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-4 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-semibold text-sm">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Hoja de Cálculo (Excel / CSV)</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Genera una tabla con tus títulos, autores, fechas, géneros y estados de lectura.
                Compatible con Microsoft Excel, Google Sheets y Notion.
              </p>
            </div>
            <button
              type="button"
              onClick={onDownloadCsv}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/40 dark:border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-bold px-4 py-2 text-xs transition shadow-sm w-full cursor-pointer"
            >
              <Download className="w-4 h-4" /> Exportar a Excel / CSV
            </button>
          </div>
        </div>

        {/* Importación desde Goodreads o StoryGraph */}
        <div className="rounded-xl border border-amber-600/40 dark:border-amber-500/40 bg-gradient-to-br from-[#f8f0dc] via-[#f4ead4] to-[#ede0c4] dark:from-[#171F2F] dark:via-[#141A26] dark:to-[#101520] p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-serif text-base font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                Migrar desde Goodreads o StoryGraph
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed max-w-xl">
                Importa tu archivo <code>goodreads_library_export.csv</code>. Traspasaremos todos tus libros, puntuaciones con estrellas, estados de lectura, fechas y reseñas personales agrupando tus sagas automáticamente.
              </p>
            </div>
            <label className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition cursor-pointer shrink-0 active:scale-95">
              <Upload className="w-4 h-4" /> Importar CSV de Goodreads
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onImportCsvFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Restauración de archivo */}
        <div className="rounded-xl border border-dashed border-amber-900/30 dark:border-[#283246] bg-[#f4ebd6]/50 dark:bg-[#101520] p-5 text-center space-y-3">
          <Upload className="w-8 h-8 mx-auto text-amber-700 dark:text-amber-400" />
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
              Restaurar desde archivo de copia
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Selecciona un archivo <code>.json</code> descargado previamente. Nexus Library añadirá
              los libros y sagas sin sobreescribir ni duplicar los que ya tengas guardados.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" /> Seleccionar archivo de copia (.json)
            <input
              type="file"
              accept=".json,application/json"
              onChange={onRestoreJsonFile}
              className="hidden"
            />
          </label>
        </div>

        {/* Resumen amigable de almacenamiento en este dispositivo */}
        <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/70 dark:bg-[#101520] p-4 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span className="font-semibold text-stone-800 dark:text-slate-200">
              Almacenamiento en este equipo:
            </span>
            <span className="text-stone-600 dark:text-slate-400">
              <strong>{books.length} libros</strong> y <strong>{sagas.length} sagas</strong> guardados
              para leer en cualquier momento, incluso sin conexión a internet.
            </span>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};
