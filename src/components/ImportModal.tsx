import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileJson,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';
import { Book, Saga } from '../types/models';
import {
  exportLibraryToCsv,
  exportLibraryToJson,
  parseBackupJson
} from '../services/importExportService';
import {
  restoreBackupPayload,
  updateBookPartialRecord
} from '../db/database';
import { bookMetadataService } from '../services/bookMetadataService';

interface ImportModalProps {
  isOpen: boolean;
  books: Book[];
  sagas: Saga[];
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  books,
  sagas,
  onClose
}) => {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  if (!isOpen) return null;

  const booksMissingCovers = books.filter((b) => !b.portadaUrl);

  const handleEnrichMissingCovers = async () => {
    if (booksMissingCovers.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(null);
    let updatedCount = 0;

    const batch = booksMissingCovers;
    setEnrichProgress({ current: 0, total: batch.length });

    for (let i = 0; i < batch.length; i++) {
      const book = batch[i];
      setEnrichProgress({ current: i + 1, total: batch.length });
      try {
        const match = await bookMetadataService.findBestMatchForBook({
          nombre: book.nombre,
          autor: book.autor,
          isbn: book.isbn
        });

        if (match) {
          await updateBookPartialRecord(book.id, {
            portadaUrl: book.portadaUrl || match.portadaUrl,
            portadaFallbackUrl: book.portadaFallbackUrl || match.portadaFallbackUrl,
            isbn: book.isbn || match.isbn,
            paginas: book.paginas ?? match.paginas,
            fechaPublicacion: book.fechaPublicacion ?? match.fechaPublicacion,
            editorial: book.editorial || match.editorial,
            idioma: book.idioma || match.idioma,
            sinopsis: book.sinopsis || match.sinopsis,
            genero: book.genero || match.suggestedGenre,
            subgeneros:
              book.subgeneros.length > 0 ? book.subgeneros : match.suggestedSubgenres
          });
          updatedCount++;
        }
      } catch {
        // continúa con el siguiente libro
      }
      await new Promise((r) => setTimeout(r, 350));
    }

    setEnrichProgress(null);
    setIsProcessing(false);
    setStatusMessage({
      type: 'success',
      text:
        'Se completaron portadas y datos bibliográficos en ' +
        String(updatedCount) +
        ' de ' +
        String(batch.length) +
        ' libros sin sobrescribir tus puntuaciones ni estados personales.'
    });
  };

  const handleDownloadJsonBackup = () => {
    try {
      const json = exportLibraryToJson(books, sagas);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nexus-library-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({
        type: 'success',
        text: 'Copia de seguridad JSON exportada correctamente.'
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Fallo al generar el archivo de exportación JSON.'
      });
    }
  };

  const handleDownloadCsvExport = () => {
    try {
      const csv = exportLibraryToCsv(books);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nexus-library-coleccion-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({
        type: 'success',
        text: 'Colección exportada en formato CSV correctamente.'
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Fallo al generar el archivo CSV.'
      });
    }
  };

  const handleRestoreJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMessage(null);
    try {
      const text = await file.text();
      const backup = parseBackupJson(text);

      setIsProcessing(true);
      const { addedBooks, skippedDuplicates } = await restoreBackupPayload(backup);

      setIsProcessing(false);
      setStatusMessage({
        type: 'success',
        text:
          'Restauración JSON completada: ' +
          String(addedBooks) +
          ' libros restaurados (' +
          String(skippedDuplicates) +
          ' registros ya existentes conservados sin sobrescribir).'
      });
    } catch (err: unknown) {
      setIsProcessing(false);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'El archivo JSON seleccionado no es válido.'
      });
    }
    e.target.value = '';
  };

  const progressPct = enrichProgress
    ? String(Math.round((enrichProgress.current / enrichProgress.total) * 100)) + '%'
    : '0%';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden sm:my-6">
        <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 sm:py-4 bg-[#f0e5cc] dark:bg-[#101520]">
          <h2 className="font-serif text-lg sm:text-xl font-bold">
            Copias de Seguridad y Datos de la Biblioteca
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 max-h-[calc(92dvh-56px)] sm:max-h-[78vh] overflow-y-auto overscroll-contain space-y-5">
          {statusMessage && (
            <div
              className={
                'rounded-xl border p-3.5 text-xs flex items-start gap-2.5 ' +
                (statusMessage.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200')
              }
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#f4ead4] dark:bg-[#101520] p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Exportar Biblioteca
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                  Descarga una copia completa en JSON (incluyendo libros, sagas y portadas) para
                  respaldar tu colección o llevarla a otro dispositivo, o expórtala en CSV.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadJsonBackup}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 text-xs"
                >
                  <FileJson className="w-4 h-4" /> Exportar Backup JSON
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsvExport}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-900/25 dark:border-slate-600 bg-[#fffcf5] dark:bg-transparent hover:border-amber-600 dark:hover:border-amber-400 px-3.5 py-2 text-xs font-semibold text-stone-800 dark:text-slate-200"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Exportar CSV
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#f4ead4] dark:bg-[#101520] p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Restaurar Copia JSON
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                  Restaura un archivo de respaldo JSON generado por NEXUS LIBRARY. Los libros ya
                  existentes se conservarán sin duplicarse.
                </p>
              </div>
              <label className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-600/40 dark:border-amber-500/40 bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 dark:hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 font-semibold px-4 py-2 text-xs cursor-pointer transition">
                <Upload className="w-4 h-4" /> Seleccionar archivo .JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleRestoreJsonFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#f4ead4] dark:bg-[#101520] p-4">
            <h3 className="font-serif text-lg font-bold text-amber-800 dark:text-amber-300">
              Autocompletar portadas y metadatos faltantes
            </h3>
            <p className="text-xs text-stone-700 dark:text-slate-300 mt-1 leading-relaxed">
              Si tienes libros registrados manualmente sin imagen de cubierta, puedes buscarlos
              automáticamente en Open Library y Google Books para recuperar su portada oficial,
              año, páginas e ISBN, manteniendo intactos tus estados de lectura y puntuaciones.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-stone-600 dark:text-slate-400">
                Libros sin portada actualmente: <strong>{booksMissingCovers.length}</strong>
              </span>
              <button
                type="button"
                disabled={isProcessing || booksMissingCovers.length === 0}
                onClick={handleEnrichMissingCovers}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold px-4 py-2 text-xs transition"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Completar portadas ({booksMissingCovers.length})
              </button>
            </div>

            {enrichProgress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-amber-800 dark:text-amber-400 mb-1">
                  <span>Consultando catálogos bibliográficos...</span>
                  <span>
                    {enrichProgress.current} / {enrichProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 dark:bg-amber-400 transition-all"
                    style={{ width: progressPct }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
