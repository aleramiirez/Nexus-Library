import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Edit3,
  FileText,
  FileUp,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { Book, Saga } from '../types/models';
import { GENRES, Genre, READING_STATUSES, ReadingStatus } from '../constants/catalogs';
import {
  enrichParsedEbookFromCatalog,
  ParsedEbookFile,
  parseEbookFile
} from '../services/epubParserService';
import { isDuplicateBook } from '../services/importExportService';
import { BookCover } from './BookCover';
import { ReadingStatusControl } from './ReadingStatusControl';
import { LibrarySelect } from './LibrarySelect';
import '../dashboard-panels.css';

interface EpubImportModalProps {
  isOpen: boolean;
  existingBooks: Book[];
  sagas: Saga[];
  initialFiles?: File[];
  onClose: () => void;
  onSaveBook: (
    bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
  onOpenInEditor?: (parsed: ParsedEbookFile) => void;
  onShowToast?: (message: string) => void;
}

interface StagedEbookItem extends ParsedEbookFile {
  selected: boolean;
  isDuplicate: boolean;
  progreso: ReadingStatus;
  enriching?: boolean;
}

export const EpubImportModal: React.FC<EpubImportModalProps> = ({
  isOpen,
  existingBooks,
  sagas = [],
  initialFiles,
  onClose,
  onSaveBook,
  onOpenInEditor,
  onShowToast
}) => {
  const [items, setItems] = useState<StagedEbookItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [autoDetectSagas, setAutoDetectSagas] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState<ReadingStatus>('❌ No Leído');
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedInitialRef = useRef<File[] | undefined>(undefined);

  useEffect(() => {
    if (
      isOpen &&
      initialFiles &&
      initialFiles.length > 0 &&
      processedInitialRef.current !== initialFiles
    ) {
      processedInitialRef.current = initialFiles;
      void handleFilesSelected(initialFiles);
    }
    if (!isOpen) {
      processedInitialRef.current = undefined;
    }
  }, [isOpen, initialFiles]);

  if (!isOpen) return null;

  const checkDuplicate = (candidate: { nombre: string; autor: string; isbn: string }): boolean => {
    return isDuplicateBook(candidate, existingBooks).duplicate;
  };

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList).filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      return ['epub', 'fb2', 'pdf', 'mobi', 'azw3'].includes(ext);
    });

    if (filesArray.length === 0) return;

    setIsProcessingFiles(true);
    setImportSuccessCount(null);

    const newStaged: StagedEbookItem[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      setProcessingStatus(`Leyendo archivo ${i + 1} de ${filesArray.length}: ${file.name}...`);
      try {
        let parsed = await parseEbookFile(file);

        const needsEnrichment =
          autoEnrich &&
          (!parsed.portadaDataUrl ||
            !parsed.sinopsis ||
            !parsed.genero ||
            !parsed.paginas ||
            parsed.sourceFormat !== 'epub');

        if (needsEnrichment) {
          setProcessingStatus(
            `Completando ficha de "${parsed.nombre}" (${i + 1}/${filesArray.length})...`
          );
          parsed = await enrichParsedEbookFromCatalog(parsed);
        }

        const duplicate = checkDuplicate({
          nombre: parsed.nombre,
          autor: parsed.autor,
          isbn: parsed.isbn
        });

        newStaged.push({
          ...parsed,
          sagaNombre: autoDetectSagas ? parsed.sagaNombre : '',
          volumen: autoDetectSagas ? parsed.volumen : null,
          selected: !duplicate,
          isDuplicate: duplicate,
          progreso: defaultStatus
        });
      } catch {
        // Ignore broken file and continue
      }
    }

    setItems((prev) => [...prev, ...newStaged]);
    setIsProcessingFiles(false);
    setProcessingStatus('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFilesSelected(e.dataTransfer.files);
    }
  };

  const updateItem = (id: string, patch: Partial<StagedEbookItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (patch.nombre !== undefined || patch.autor !== undefined || patch.isbn !== undefined) {
          updated.isDuplicate = checkDuplicate({
            nombre: updated.nombre,
            autor: updated.autor,
            isbn: updated.isbn
          });
        }
        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEnrichSingleItem = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target || target.enriching) return;

    updateItem(id, { enriching: true });
    try {
      const enriched = await enrichParsedEbookFromCatalog(target);
      updateItem(id, {
        ...enriched,
        enriching: false
      });
    } catch {
      updateItem(id, { enriching: false });
    }
  };

  const handleApplyDefaultStatus = (status: ReadingStatus) => {
    setDefaultStatus(status);
    setItems((prev) => prev.map((item) => ({ ...item, progreso: status })));
  };

  const selectedItems = items.filter((item) => item.selected && item.nombre.trim().length > 0);
  const duplicateCount = items.filter((item) => item.isDuplicate).length;

  const handleImportSelected = async () => {
    if (selectedItems.length === 0 || isSaving) return;

    setIsSaving(true);
    setSaveProgress({ current: 0, total: selectedItems.length });

    let savedCount = 0;
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setSaveProgress({ current: i + 1, total: selectedItems.length });
      try {
        await onSaveBook({
          nombre: item.nombre.trim(),
          autor: item.autor.trim() || 'Autor desconocido',
          genero: item.genero || '',
          subgeneros: item.subgeneros || [],
          fechaPublicacion: item.fechaPublicacion,
          paginas: item.paginas,
          puntuacion: null,
          progreso: item.progreso,
          sagaId: null,
          sagaNombre: item.sagaNombre.trim(),
          volumen: item.volumen,
          fechaInicio: '',
          fechaFin: '',
          lecturaVirtual: item.lecturaVirtual || 'Digital (.epub / eBook)',
          tiempoLectura: '',
          isbn: item.isbn.trim(),
          editorial: item.editorial.trim(),
          idioma: item.idioma.trim() || 'Español',
          edicion: item.edicion.trim() || 'eBook',
          sinopsis: item.sinopsis.trim(),
          portadaUrl: item.portadaUrl || '',
          portadaFallbackUrl: item.portadaFallbackUrl || '',
          portadaDataUrl: item.portadaDataUrl || undefined
        });
        savedCount++;
      } catch {
        // Continue with remaining items
      }
    }

    setIsSaving(false);
    setImportSuccessCount(savedCount);

    const importedIds = new Set(selectedItems.map((i) => i.id));
    setItems((prev) => prev.filter((item) => !importedIds.has(item.id)));

    if (onShowToast && savedCount > 0) {
      onShowToast(
        savedCount === 1
          ? `Se ha añadido "${selectedItems[0].nombre}" a tu biblioteca.`
          : `Se han añadido ${savedCount} libros desde archivos a tu biblioteca.`
      );
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setImportSuccessCount(null);
    onClose();
  };

  const inputCls =
    'w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-1.5 text-xs text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 shadow-inner focus:outline-none focus:border-amber-600 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[94dvh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border-t sm:border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera fija */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-amber-900/20 dark:border-[#242E42] bg-[#f0e5cc] dark:bg-[#101520] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-600/30 shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-xl font-bold truncate">
                  Bandeja de Recepción Bibliotecaria
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-600/30">
                  Importación Masiva
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-slate-400 truncate">
                Extrae automáticamente título, autor, portada original, sinopsis, ISBN y saga
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-5 flex-1 min-h-0">
          {/* Zona Drag & Drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            onClick={() => !isProcessingFiles && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-5 sm:p-7 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-amber-500 bg-amber-500/15 scale-[0.995]'
                : 'border-amber-900/30 dark:border-[#2E3A52] hover:border-amber-600 dark:hover:border-amber-400/60 bg-[#f5ebd6]/70 dark:bg-[#0D1017]/60 hover:bg-[#f5ebd6] dark:hover:bg-[#0D1017]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub,.fb2,.pdf,.mobi,.azw3,application/epub+zip"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {isProcessingFiles ? (
              <div className="py-4 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-9 h-9 text-amber-600 dark:text-amber-400 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    Analizando tus archivos de libros...
                  </p>
                  <p className="text-xs text-stone-600 dark:text-slate-400">{processingStatus}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-600/30 text-amber-800 dark:text-amber-300 flex items-center justify-center shadow-inner">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold">
                    Arrastra aquí tus archivos{' '}
                    <span className="text-amber-700 dark:text-amber-400 font-bold">.epub</span> o
                    haz clic para seleccionarlos
                  </p>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                    Puedes subir <strong>uno o muchos libros a la vez</strong>. Compatible con{' '}
                    <span className="font-semibold text-stone-800 dark:text-slate-200">
                      .epub, .fb2, .pdf, .mobi y .azw3
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Barra de preferencias de extracción */}
          <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-[#f3e8d0]/80 dark:bg-[#101520] border border-amber-900/20 dark:border-[#242E42]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoEnrich}
                  onChange={(e) => setAutoEnrich(e.target.checked)}
                  className="w-4 h-4 rounded border-amber-900/30 text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Completar datos faltantes con el catálogo
                  </span>
                  <span className="text-stone-600 dark:text-slate-400 block">
                    Si al archivo le falta género, páginas o portada, se rellenan solos.
                  </span>
                </div>
              </label>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-stone-600 dark:text-slate-400 whitespace-nowrap">
                  Estado inicial:
                </span>
                <ReadingStatusControl
                  value={defaultStatus}
                  onChange={handleApplyDefaultStatus}
                />
              </div>
            </div>

            <div className="pt-2.5 border-t border-amber-900/10 dark:border-[#242E42]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoDetectSagas}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoDetectSagas(checked);
                    if (!checked) {
                      setItems((prev) =>
                        prev.map((item) => ({ ...item, sagaNombre: '', volumen: null }))
                      );
                    }
                  }}
                  className="w-4 h-4 rounded border-amber-900/30 text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-stone-800 dark:text-slate-200">
                    <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Detectar sagas automáticamente
                  </span>
                  <span className="text-stone-600 dark:text-slate-400 block">
                    {autoDetectSagas
                      ? 'Extrae sagas y volúmenes de los archivos (descarta títulos repetidos como en libros sueltos).'
                      : 'Desactivado: todos los libros entrarán sin saga para que los vincules tú a mano.'}
                  </span>
                </div>
              </label>
              {!autoDetectSagas && (
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Control manual activado
                </span>
              )}
            </div>
          </div>

          {/* Notificación de éxito tras importar */}
          {importSuccessCount !== null && items.length === 0 && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                    ¡{importSuccessCount}{' '}
                    {importSuccessCount === 1 ? 'libro añadido' : 'libros añadidos'} con éxito!
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                    Ya puedes verlos con su portada y ficha completa en tu biblioteca.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shrink-0"
              >
                Ver mi biblioteca
              </button>
            </div>
          )}

          {/* Lista interactiva de libros cargados */}
          {items.length > 0 && (
            <div className="space-y-3">
              {/* Controles de selección masiva */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-slate-400">
                  <span className="font-semibold text-stone-900 dark:text-slate-100">
                    {items.length} {items.length === 1 ? 'archivo cargado' : 'archivos cargados'}
                  </span>
                  <span>•</span>
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                    {selectedItems.length} seleccionados
                  </span>
                  {duplicateCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600 dark:text-amber-300">
                        {duplicateCount} ya en tu biblioteca
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) =>
                        prev.map((item) => ({ ...item, selected: !item.isDuplicate }))
                      )
                    }
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#f3e8d0] dark:bg-[#0D1017] border border-amber-900/20 dark:border-[#283246] text-stone-700 dark:text-slate-300 hover:border-amber-600 transition-colors"
                  >
                    Solo nuevos
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.map((item) => ({ ...item, selected: true })))
                    }
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#f3e8d0] dark:bg-[#0D1017] border border-amber-900/20 dark:border-[#283246] text-stone-700 dark:text-slate-300 hover:border-amber-600 transition-colors"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-colors"
                  >
                    Vaciar lista
                  </button>
                </div>
              </div>

              {/* Tarjetas de libros extraídos */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-3.5 sm:p-4 transition-all ${
                      item.selected
                        ? 'bg-[#f6eedb]/90 dark:bg-[#101520] border-amber-600/45 dark:border-amber-500/40 shadow-sm'
                        : 'bg-[#f6eedb]/40 dark:bg-[#0D1017]/50 border-amber-900/15 dark:border-[#222B3C] opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, { selected: !item.selected })}
                        className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          item.selected
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'border-amber-900/30 dark:border-[#2E3A52] bg-[#fffcf5] dark:bg-[#141A26] text-transparent hover:border-amber-500'
                        }`}
                        title={item.selected ? 'Quitar selección' : 'Seleccionar para importar'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      {/* Miniatura de portada */}
                      <div className="shrink-0 flex flex-col items-center gap-1.5 w-16 sm:w-20">
                        <div className="w-16 sm:w-20">
                          <BookCover
                            nombre={item.nombre || 'Sin título'}
                            autor={item.autor || 'Autor'}
                            portadaUrl={item.portadaUrl}
                            portadaFallbackUrl={item.portadaFallbackUrl}
                            portadaDataUrl={item.portadaDataUrl}
                            size="sm"
                          />
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fffcf5] dark:bg-[#141A26] border border-amber-900/20 dark:border-[#283246] text-stone-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                          .{item.sourceFormat}
                        </span>
                      </div>

                      {/* Campos editables en línea */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        {/* Fila 1: Badges de estado y archivo */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="inline-flex items-center gap-1 text-[11px] text-stone-600 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                              <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="truncate">{item.fileName}</span>
                            </span>

                            {item.portadaDataUrl && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                                Portada original extraída
                              </span>
                            )}

                            {item.isDuplicate && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40">
                                <AlertCircle className="w-3 h-3" />
                                Ya en tu biblioteca
                              </span>
                            )}
                          </div>

                          {/* Acciones rápidas de la tarjeta */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleEnrichSingleItem(item.id)}
                              disabled={item.enriching}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#fffcf5] dark:bg-[#141A26] hover:bg-amber-500/15 text-stone-700 dark:text-slate-300 border border-amber-900/25 dark:border-[#283246] transition-colors disabled:opacity-50"
                              title="Buscar o completar datos faltantes con el catálogo"
                            >
                              {item.enriching ? (
                                <Loader2 className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400" />
                              ) : (
                                <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              )}
                              <span className="hidden sm:inline">Completar datos</span>
                            </button>

                            {onOpenInEditor && (
                              <button
                                type="button"
                                onClick={() => onOpenInEditor(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#fffcf5] dark:bg-[#141A26] hover:bg-amber-500/15 text-stone-800 dark:text-slate-200 border border-amber-900/25 dark:border-[#283246] transition-colors"
                                title="Abrir en el editor completo de libro"
                              >
                                <Edit3 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span className="hidden sm:inline">Ficha completa</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Quitar de la lista"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Fila 2: Título y Autor */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-400 mb-0.5">
                              Título
                            </label>
                            <input
                              type="text"
                              value={item.nombre}
                              onChange={(e) => updateItem(item.id, { nombre: e.target.value })}
                              placeholder="Título del libro"
                              className={inputCls + ' font-semibold'}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-400 mb-0.5">
                              Autor/a
                            </label>
                            <input
                              type="text"
                              value={item.autor}
                              onChange={(e) => updateItem(item.id, { autor: e.target.value })}
                              placeholder="Nombre del autor"
                              className={inputCls}
                            />
                          </div>
                        </div>

                        {/* Fila 3: Género, Estado, Saga y Volumen */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-400 mb-0.5">
                              Género
                            </label>
                            <LibrarySelect
                              value={item.genero || ''}
                              onChange={(val) => updateItem(item.id, { genero: val as Genre })}
                              placeholder="Seleccionar..."
                              options={[
                                { value: '', label: 'Seleccionar...' },
                                ...GENRES.map((g) => ({ value: g, label: g }))
                              ]}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-400 mb-0.5">
                              Estado
                            </label>
                            <ReadingStatusControl
                              value={item.progreso}
                              onChange={(st) => updateItem(item.id, { progreso: st })}
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-400">
                                Saga (opcional)
                              </label>
                              {item.sagaNombre && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateItem(item.id, { sagaNombre: '', volumen: null })
                                  }
                                  className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline"
                                  title="Quitar saga (dejar como libro independiente)"
                                >
                                  Quitar saga
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                list="nexus-library-sagas-list"
                                value={item.sagaNombre}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateItem(item.id, {
                                    sagaNombre: val,
                                    volumen: val.trim() ? (item.volumen ?? 1) : null
                                  });
                                }}
                                placeholder="Ej: Canción de hielo y fuego"
                                className={inputCls + (item.sagaNombre ? ' pr-6' : '')}
                              />
                              {item.sagaNombre && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateItem(item.id, { sagaNombre: '', volumen: null })
                                  }
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200"
                                  title="Quitar saga"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-400 mb-0.5">
                              Volumen #
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={item.volumen ?? ''}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  volumen: e.target.value ? Number(e.target.value) : null
                                })
                              }
                              placeholder="Ej: 1"
                              className={inputCls}
                            />
                          </div>
                        </div>

                        {/* Fila 4: Resumen de metadatos extraídos */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-stone-600 dark:text-slate-400">
                          {item.paginas && (
                            <span className="inline-flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              ~{item.paginas} págs.
                            </span>
                          )}
                          {item.fechaPublicacion && <span>Año: {item.fechaPublicacion}</span>}
                          {item.editorial && <span>Ed: {item.editorial}</span>}
                          {item.isbn && <span>ISBN: {item.isbn}</span>}
                          {item.sagaNombre && (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                              <Layers className="w-3 h-3" />
                              Saga: {item.sagaNombre}
                              {item.volumen ? ` (#${item.volumen})` : ''}
                            </span>
                          )}
                          {item.sinopsis && (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              ✓ Sinopsis incluida
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barra de acciones inferior fija */}
        <div className="px-4 sm:px-6 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))] border-t border-amber-900/20 dark:border-[#242E42] bg-[#f0e5cc]/95 dark:bg-[#101520]/95 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-600 dark:text-slate-400 flex items-center justify-between sm:justify-start gap-2">
            {isSaving ? (
              <span className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando libro {saveProgress.current} de {saveProgress.total}...
              </span>
            ) : items.length > 0 ? (
              <span>
                Se añadirán{' '}
                <strong className="text-stone-900 dark:text-slate-100">
                  {selectedItems.length}
                </strong>{' '}
                de {items.length} libros cargados
              </span>
            ) : (
              <span>Selecciona uno o varios archivos .epub de tu dispositivo</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-amber-900/25 dark:border-[#283246] text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={() => void handleImportSelected()}
              disabled={selectedItems.length === 0 || isSaving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold shadow-lg shadow-amber-600/25 transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>
                    Añadir {selectedItems.length > 0 ? `${selectedItems.length} ` : ''}
                    {selectedItems.length === 1 ? 'libro a la biblioteca' : 'libros a la biblioteca'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
        {/* Sugerencias de sagas ya existentes en la biblioteca */}
        <datalist id="nexus-library-sagas-list">
          {sagas.map((s) => (
            <option key={s.id} value={s.nombre} />
          ))}
        </datalist>
      </div>
    </div>
  );
};
