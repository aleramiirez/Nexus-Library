import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Search,
  Images,
  Sparkles,
  Upload,
  Link2,
  Check,
  CheckCircle2,
  Loader2,
  AlertCircle,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { BibliographicCandidate, EditionCoverOption } from '../types/models';
import {
  fetchEditionCovers,
  searchAlternativeCovers,
  processImageFileUpload,
  normalizeCoverUrl
} from '../services/coverService';

export interface SelectedCoverPayload {
  portadaUrl: string;
  portadaFallbackUrl?: string;
  portadaDataUrl?: string;
  editionInfo?: {
    publisher?: string;
    year?: string | number | null;
    title?: string;
  };
}

export interface BookCoverPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookAuthor?: string;
  isbn?: string;
  currentCoverUrl: string;
  currentCoverFallbackUrl?: string;
  currentCoverDataUrl?: string;
  existingCandidates?: BibliographicCandidate[];
  onSelectCover: (payload: SelectedCoverPayload) => void;
}

type TabType = 'editions' | 'search' | 'upload';

export const BookCoverPickerModal: React.FC<BookCoverPickerModalProps> = ({
  isOpen,
  onClose,
  bookTitle,
  bookAuthor,
  isbn,
  currentCoverUrl,
  currentCoverFallbackUrl,
  currentCoverDataUrl,
  existingCandidates = [],
  onSelectCover
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('editions');
  const [editionCovers, setEditionCovers] = useState<EditionCoverOption[]>([]);
  const [isLoadingEditions, setIsLoadingEditions] = useState(false);
  const [editionsError, setEditionsError] = useState<string | null>(null);

  // Pestaña de Búsqueda libre
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EditionCoverOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Pestaña de Subida / URL
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Portada seleccionada en el modal
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [selectedFallback, setSelectedFallback] = useState<string>('');
  const [selectedDataUrl, setSelectedDataUrl] = useState<string | undefined>(undefined);
  const [selectedMetadata, setSelectedMetadata] = useState<{
    publisher?: string;
    year?: string | number | null;
    title?: string;
  }>({});

  // Imágenes con error de carga (404 / bloqueadas por CORS)
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());

  // Inicializar portada actual al abrir
  useEffect(() => {
    if (!isOpen) return;
    const initialUrl = currentCoverDataUrl || currentCoverUrl || '';
    setSelectedUrl(initialUrl);
    setSelectedFallback(currentCoverFallbackUrl || '');
    setSelectedDataUrl(currentCoverDataUrl);
    setFailedImageUrls(new Set());
    setActiveTab('editions');
    setUploadError(null);
  }, [isOpen, currentCoverUrl, currentCoverFallbackUrl, currentCoverDataUrl]);

  // Cargar ediciones cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;
    const cleanTitle = (bookTitle || '').trim();
    if (!cleanTitle && !isbn) {
      setEditionCovers([]);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function loadCovers() {
      setIsLoadingEditions(true);
      setEditionsError(null);
      try {
        const covers = await fetchEditionCovers({
          title: cleanTitle,
          author: bookAuthor,
          isbn,
          existingCandidates,
          signal: controller.signal
        });
        if (isMounted) {
          setEditionCovers(covers);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setEditionsError('No se pudieron obtener todas las portadas de ediciones.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingEditions(false);
        }
      }
    }

    loadCovers();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isOpen, bookTitle, bookAuthor, isbn, existingCandidates]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelectOption = (opt: EditionCoverOption) => {
    setSelectedUrl(opt.url);
    setSelectedFallback(opt.fallbackUrl || '');
    setSelectedDataUrl(undefined);
    setSelectedMetadata({
      publisher: opt.publisher,
      year: opt.year,
      title: opt.title
    });
  };

  const handleExecuteSearch = async (queryText?: string) => {
    const text = (queryText !== undefined ? queryText : searchQuery).trim();
    if (text.length < 2) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchAlternativeCovers(text);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessingUpload(true);
    setUploadError(null);
    try {
      const { dataUrl } = await processImageFileUpload(file);
      setUploadedDataUrl(dataUrl);
      setSelectedUrl(dataUrl);
      setSelectedDataUrl(dataUrl);
      setSelectedFallback('');
      setSelectedMetadata({
        title: file.name.replace(/\.[^/.]+$/, ''),
        publisher: 'Archivo local'
      });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error al procesar la imagen.');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleApplyCustomUrl = () => {
    const norm = normalizeCoverUrl(customUrlInput);
    if (!norm) {
      setUploadError('Por favor ingresa una URL válida (https://...)');
      return;
    }
    setUploadError(null);
    setSelectedUrl(norm);
    setSelectedFallback('');
    setSelectedDataUrl(undefined);
    setSelectedMetadata({
      publisher: 'URL personalizada'
    });
  };

  const handleConfirm = () => {
    if (!selectedUrl) {
      onClose();
      return;
    }
    onSelectCover({
      portadaUrl: selectedUrl,
      portadaFallbackUrl: selectedFallback,
      portadaDataUrl: selectedDataUrl,
      editionInfo: selectedMetadata
    });
    onClose();
  };

  const markImageFailed = (url: string) => {
    setFailedImageUrls((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  // Filtrar portadas que no dieron error de red
  const visibleEditionCovers = useMemo(() => {
    return editionCovers.filter((c) => !failedImageUrls.has(c.url));
  }, [editionCovers, failedImageUrls]);

  const visibleSearchResults = useMemo(() => {
    return searchResults.filter((c) => !failedImageUrls.has(c.url));
  }, [searchResults, failedImageUrls]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-picker-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-2xl border border-amber-900/30 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Cabecera ─── */}
        <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 sm:py-3.5 bg-[#f0e5cc] dark:bg-[#101520] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300">
              <Images className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="cover-picker-title"
                className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-white truncate leading-tight"
              >
                Elegir Portada de otra Edición
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 truncate">
                {bookTitle || 'Libro sin título'}
                {bookAuthor ? ` · ${bookAuthor}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition shrink-0"
            aria-label="Cerrar selector de portadas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Pestañas de Navegación ─── */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 pb-2 border-b border-amber-900/15 dark:border-[#242E42] bg-[#f8efdc]/50 dark:bg-[#121824]/50 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('editions')}
            className={
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ' +
              (activeTab === 'editions'
                ? 'bg-amber-500/25 border border-amber-600/40 dark:border-amber-400 text-amber-950 dark:text-amber-200 shadow-sm'
                : 'text-stone-600 dark:text-slate-400 hover:bg-amber-900/10 dark:hover:bg-slate-800 border border-transparent')
            }
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Ediciones encontradas</span>
            {visibleEditionCovers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-600/20 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300">
                {visibleEditionCovers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('search');
              if (!searchQuery && bookTitle) {
                setSearchQuery(bookTitle);
              }
            }}
            className={
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ' +
              (activeTab === 'search'
                ? 'bg-amber-500/25 border border-amber-600/40 dark:border-amber-400 text-amber-950 dark:text-amber-200 shadow-sm'
                : 'text-stone-600 dark:text-slate-400 hover:bg-amber-900/10 dark:hover:bg-slate-800 border border-transparent')
            }
          >
            <Search className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Buscar otra portada</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ' +
              (activeTab === 'upload'
                ? 'bg-amber-500/25 border border-amber-600/40 dark:border-amber-400 text-amber-950 dark:text-amber-200 shadow-sm'
                : 'text-stone-600 dark:text-slate-400 hover:bg-amber-900/10 dark:hover:bg-slate-800 border border-transparent')
            }
          >
            <Upload className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Subir imagen o URL</span>
          </button>
        </div>

        {/* ─── Contenedor Central Scrollable ─── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          {/* TAB 1: Ediciones encontradas */}
          {activeTab === 'editions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-slate-400">
                <p>
                  Haz clic en cualquier portada para seleccionarla como la carátula de tu libro:
                </p>
                {isLoadingEditions && (
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Buscando ediciones...
                  </span>
                )}
              </div>

              {isLoadingEditions && visibleEditionCovers.length === 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 py-6">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] rounded-xl bg-amber-900/10 dark:bg-slate-800 animate-pulse border border-amber-900/15 dark:border-slate-700"
                    />
                  ))}
                </div>
              )}

              {!isLoadingEditions && visibleEditionCovers.length === 0 && (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#f5ecda]/50 dark:bg-[#0f1420]/50 space-y-3">
                  <Images className="w-10 h-10 mx-auto text-stone-400 dark:text-slate-500" />
                  <p className="font-serif font-semibold text-sm text-stone-800 dark:text-slate-200">
                    No se encontraron portadas alternativas automáticas para este título
                  </p>
                  <p className="text-xs text-stone-600 dark:text-slate-400 max-w-md mx-auto">
                    Puedes buscar por título de edición (ej. ilustrada, conmemorativa) o subir una imagen propia.
                  </p>
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('search');
                        setSearchQuery(bookTitle);
                        handleExecuteSearch(bookTitle);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 transition"
                    >
                      Buscar portadas de "{bookTitle}"
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-900/30 dark:border-slate-700 hover:bg-amber-900/10 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 transition"
                    >
                      Subir archivo local
                    </button>
                  </div>
                </div>
              )}

              {visibleEditionCovers.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {visibleEditionCovers.map((opt) => {
                    const isSelected = selectedUrl === opt.url;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={
                          'group relative flex flex-col rounded-xl overflow-hidden text-left border transition-all duration-150 ' +
                          (isSelected
                            ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/15 dark:bg-amber-500/20 shadow-lg scale-[1.02]'
                            : 'border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121824] hover:border-amber-600/60 dark:hover:border-amber-400/50 hover:shadow-md')
                        }
                      >
                        {/* Contenedor de la imagen */}
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-amber-950/10 dark:bg-black/30">
                          <img
                            src={opt.url}
                            alt={opt.title || 'Portada de edición'}
                            loading="lazy"
                            onError={() => markImageFailed(opt.url)}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />

                          {/* Pliegue vertical de lomo sutil */}
                          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 via-white/10 to-transparent pointer-events-none" />

                          {/* Badge de seleccionado */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-amber-500 text-stone-950 p-1 rounded-full shadow-md">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}

                          {opt.badge && !isSelected && (
                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-amber-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                              {opt.badge}
                            </div>
                          )}
                        </div>

                        {/* Metadatos de la edición */}
                        <div className="p-2 sm:p-2.5 flex flex-col gap-0.5 min-w-0">
                          <p className="text-[11px] font-semibold text-stone-800 dark:text-slate-200 truncate leading-tight">
                            {opt.publisher || opt.title || 'Edición estándar'}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">
                            <span>{opt.year || 'Año desconocido'}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Buscar otra portada */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
                  Buscar portadas por título, edición o editorial
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleExecuteSearch();
                        }
                      }}
                      placeholder="Ej. El nombre del viento ilustrado, Dune Folio Society..."
                      className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecuteSearch()}
                    disabled={isSearching || searchQuery.trim().length < 2}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 transition flex items-center gap-1.5 shrink-0"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Buscar</span>
                  </button>
                </div>

                {/* Sugerencias de búsqueda rápida */}
                {bookTitle && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-stone-500 dark:text-slate-400">
                      Sugerencias:
                    </span>
                    {[
                      `${bookTitle} ilustrada`,
                      `${bookTitle} coleccionista`,
                      `${bookTitle} conmemorativa`,
                      `${bookTitle} debolsillo`
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          handleExecuteSearch(suggestion);
                        }}
                        className="rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-600/30 px-2.5 py-0.5 text-[11px] text-amber-950 dark:text-amber-300 transition"
                      >
                        ✦ {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isSearching && (
                <div className="flex items-center justify-center py-12 gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando bases de datos bibliográficas...</span>
                </div>
              )}

              {!isSearching && hasSearched && visibleSearchResults.length === 0 && (
                <div className="text-center py-8 text-xs text-stone-600 dark:text-slate-400">
                  No se encontraron portadas para "{searchQuery}". Prueba con términos más simples o sube una imagen directamente.
                </div>
              )}

              {visibleSearchResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {visibleSearchResults.map((opt) => {
                    const isSelected = selectedUrl === opt.url;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={
                          'group relative flex flex-col rounded-xl overflow-hidden text-left border transition-all duration-150 ' +
                          (isSelected
                            ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/15 dark:bg-amber-500/20 shadow-lg scale-[1.02]'
                            : 'border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121824] hover:border-amber-600/60 dark:hover:border-amber-400/50 hover:shadow-md')
                        }
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-amber-950/10 dark:bg-black/30">
                          <img
                            src={opt.url}
                            alt={opt.title || 'Portada encontrada'}
                            loading="lazy"
                            onError={() => markImageFailed(opt.url)}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 via-white/10 to-transparent pointer-events-none" />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-amber-500 text-stone-950 p-1 rounded-full shadow-md">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="p-2 sm:p-2.5 flex flex-col gap-0.5 min-w-0">
                          <p className="text-[11px] font-semibold text-stone-800 dark:text-slate-200 truncate leading-tight">
                            {opt.title || 'Sin título'}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">
                            <span className="truncate">{opt.publisher || opt.year || 'Edición'}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Subir imagen o URL */}
          {activeTab === 'upload' && (
            <div className="max-w-xl mx-auto space-y-6 py-2">
              {/* Zona de subida de archivo */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="rounded-2xl border-2 border-dashed border-amber-900/30 dark:border-[#283246] hover:border-amber-600 dark:hover:border-amber-400 bg-[#fffcf5]/70 dark:bg-[#0D1017]/70 p-6 sm:p-8 text-center transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-serif font-bold text-sm sm:text-base text-stone-800 dark:text-slate-200">
                  Arrastra una imagen de portada o haz clic para seleccionarla
                </p>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                  Formatos admitidos: JPG, PNG, WEBP (se optimizará automáticamente para Nexus)
                </p>
                {isProcessingUpload && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Optimizando imagen...
                  </div>
                )}
              </div>

              {/* Separador "o" */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-amber-900/20 dark:border-slate-800 w-full" />
                <span className="bg-[#fbf6ea] dark:bg-[#141A26] px-3 text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400 font-mono">
                  o pega un enlace
                </span>
              </div>

              {/* Input de URL directa */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                  URL directa de la imagen (debe comenzar con https://)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="https://ejemplo.com/portada.jpg"
                      className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    disabled={!customUrlInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-amber-900/30 dark:border-slate-700 bg-[#f4ead4] dark:bg-[#161D2B] hover:bg-amber-900/15 dark:hover:bg-slate-800 text-stone-900 dark:text-slate-100 disabled:opacity-50 transition"
                  >
                    Cargar
                  </button>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Barra Inferior de Confirmación ─── */}
        <div className="border-t border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 bg-[#f0e5cc] dark:bg-[#101520] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {selectedUrl ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-10 rounded overflow-hidden shadow-sm border border-amber-900/20 dark:border-slate-700 bg-amber-950/10 shrink-0">
                  <img
                    src={selectedUrl}
                    alt="Portada elegida"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 text-xs">
                  <p className="font-semibold text-stone-900 dark:text-white truncate">
                    Portada seleccionada
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate">
                    {selectedMetadata.publisher || selectedMetadata.year
                      ? `${selectedMetadata.publisher || 'Edición'} ${selectedMetadata.year ? `(${selectedMetadata.year})` : ''}`
                      : 'Lista para aplicar'}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-xs text-stone-500 dark:text-slate-400 italic">
                Ninguna portada seleccionada
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-amber-900/25 dark:border-slate-700 hover:bg-amber-900/10 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedUrl}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 disabled:opacity-50 transition shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Usar esta portada</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
