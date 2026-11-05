import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  X,
  Camera,
  ScanBarcode,
  Image as ImageIcon,
  Keyboard,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { BibliographicCandidate } from '../types/models';
import {
  searchBookByIsbn,
  extractCleanIsbn
} from '../services/bookMetadataService';
import { soundService } from '../services/soundService';
import { BookCover } from './BookCover';

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookSelected: (
    candidate: BibliographicCandidate,
    mode: 'direct' | 'customize'
  ) => void;
  onShowToast?: (message: string, options?: { type?: 'success' | 'error' | 'info' }) => void;
}

type ScannerStatus =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'searching'
  | 'found'
  | 'not_found'
  | 'error';

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBookSelected,
  onShowToast
}) => {
  const modalRef = useFocusTrap({ isOpen, onClose });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scannedIsbn, setScannedIsbn] = useState<string>('');
  const [foundCandidate, setFoundCandidate] = useState<BibliographicCandidate | null>(null);

  // Cámara y hardware
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  // Modo manual de introducción de ISBN
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [manualIsbn, setManualIsbn] = useState<string>('');
  const [isManualSubmitting, setIsManualSubmitting] = useState<boolean>(false);

  const html5QrCodeRef = useRef<any>(null);
  const isStoppingRef = useRef<boolean>(false);
  const activeStreamTrackRef = useRef<MediaStreamTrack | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Detener la cámara de forma segura
  const stopCamera = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      if (activeStreamTrackRef.current) {
        try {
          if (isTorchOn) {
            await (activeStreamTrackRef.current as any).applyConstraints({
              advanced: [{ torch: false }]
            });
          }
        } catch {
          // ignore
        }
        activeStreamTrackRef.current = null;
      }

      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      }
    } catch (err) {
      console.warn('Error al detener la cámara del escáner:', err);
    } finally {
      setIsTorchOn(false);
      setHasTorch(false);
      isStoppingRef.current = false;
    }
  }, [isTorchOn]);

  // Procesar un ISBN detectado (vía cámara, foto o teclado)
  const processDetectedIsbn = useCallback(
    async (rawCode: string) => {
      const clean = extractCleanIsbn(rawCode) || rawCode.replace(/[-\s]/g, '').trim();
      if (!clean) return;

      // Filtro de ISBN: EAN-13 empezado en 978 o 979, o ISBN-10
      const isEan13 = /^(978|979)\d{10}$/.test(clean);
      const isIsbn10 = /^\d{9}[\dX]$/i.test(clean);

      if (!isEan13 && !isIsbn10) {
        // Ignorar códigos de barras ajenos a libros (ej. comestibles o QR normales)
        return;
      }

      // Detener cámara inmediatamente para ahorrar batería y recursos
      await stopCamera();

      // Reproducir sonido ceremonial de descubrimiento
      try {
        soundService.playBarcodeScanSuccess();
      } catch {
        // ignore
      }

      setScannedIsbn(clean);
      setStatus('searching');
      setErrorMessage('');

      try {
        const candidate = await searchBookByIsbn(clean);
        if (candidate) {
          setFoundCandidate(candidate);
          setStatus('found');
        } else {
          setFoundCandidate(null);
          setStatus('not_found');
        }
      } catch (err) {
        console.error('Error al consultar ISBN:', err);
        setErrorMessage('Error al consultar los catálogos en línea.');
        setStatus('not_found');
      }
    },
    [stopCamera]
  );

  // Iniciar el escáner de cámara con html5-qrcode
  const startCamera = useCallback(async () => {
    setStatus('starting');
    setErrorMessage('');
    setFoundCandidate(null);
    setScannedIsbn('');

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      // Crear instancia si aún no existe
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('nexus-barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ],
          verbose: false
        });
      }

      const scanner = html5QrCodeRef.current;
      if (scanner.isScanning) {
        await scanner.stop();
      }

      // Detectar cámaras disponibles
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          if (!selectedCameraId) {
            // Preferir cámara trasera ('back', 'rear', 'environment')
            const backCam = devices.find((d) =>
              /back|rear|environment|trasera/i.test(d.label)
            );
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          }
        }
      } catch {
        // Fallback si no enumera dispositivos
      }

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: 'environment' };

      const config = {
        fps: 12,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(320, Math.floor(viewfinderWidth * 0.88));
          const height = Math.min(180, Math.floor(viewfinderHeight * 0.5));
          return { width, height };
        },
        aspectRatio: 1.333333
      };

      await scanner.start(
        cameraConfig,
        config,
        (decodedText: string) => {
          processDetectedIsbn(decodedText);
        },
        () => {
          // Frame sin código detectado, continuar
        }
      );

      setStatus('scanning');

      // Comprobar soporte de linterna (Torch)
      try {
        const videoElem = document.querySelector(
          '#nexus-barcode-reader video'
        ) as HTMLVideoElement | null;
        if (videoElem && videoElem.srcObject instanceof MediaStream) {
          const track = videoElem.srcObject.getVideoTracks()[0];
          if (track) {
            activeStreamTrackRef.current = track;
            const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
            if (capabilities.torch) {
              setHasTorch(true);
            }
          }
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn('No se pudo acceder a la cámara:', err);
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMessage(
          'Permiso de cámara denegado. Puedes conceder el permiso en los ajustes de tu navegador o usar las opciones alternativas abajo.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ninguna cámara disponible en este dispositivo.');
      } else {
        setErrorMessage(
          'No se pudo inicializar la cámara. Puedes subir una foto del código de barras o escribir el ISBN a mano.'
        );
      }
      setStatus('error');
    }
  }, [selectedCameraId, processDetectedIsbn]);

  // Alternar linterna
  const toggleTorch = async () => {
    if (!activeStreamTrackRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await (activeStreamTrackRef.current as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Error al alternar la linterna:', err);
    }
  };

  // Escanear desde archivo / foto capturada
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('searching');
    setErrorMessage('');

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      // Crear instancia temporal o usar la actual
      const scanner = html5QrCodeRef.current || new Html5Qrcode('nexus-barcode-reader');
      html5QrCodeRef.current = scanner;

      if (scanner.isScanning) {
        await scanner.stop();
      }

      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        processDetectedIsbn(decodedText);
      } else {
        setStatus('error');
        setErrorMessage('No se detectó ningún código de barras legible en la imagen.');
      }
    } catch (err) {
      console.warn('Error escaneando imagen:', err);
      setStatus('error');
      setErrorMessage(
        'No se pudo encontrar un código de barras en la foto. Asegúrate de enfocar con buena iluminación o escribe el ISBN manualmente.'
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Búsqueda manual por ISBN escrito
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = extractCleanIsbn(manualIsbn) || manualIsbn.replace(/[-\s]/g, '').trim();
    if (!clean || clean.length < 9) {
      onShowToast?.('Introduce un ISBN válido de 10 o 13 dígitos', { type: 'error' });
      return;
    }

    setIsManualSubmitting(true);
    await processDetectedIsbn(clean);
    setIsManualSubmitting(false);
  };

  // Reanudar escaneo (por ejemplo, tras encontrar un libro o error)
  const handleResetScan = async () => {
    setFoundCandidate(null);
    setScannedIsbn('');
    setErrorMessage('');
    await startCamera();
  };

  // Iniciar cámara al abrir el modal y detener al cerrar
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setStatus('idle');
      setFoundCandidate(null);
      setScannedIsbn('');
      setErrorMessage('');
      setIsManualOpen(false);
      setManualIsbn('');
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 pt-8 sm:pt-10 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-scanner-title"
        className="catalog-card-panel relative w-full max-w-xl max-h-[92vh] flex flex-col p-0 shadow-2xl mt-3 sm:mt-5 overflow-visible border border-amber-900/30 dark:border-amber-500/30"
      >
        {/* Pestaña de latón superior */}
        <div className="catalog-brass-tab z-20 whitespace-nowrap pointer-events-none max-w-[calc(100%-36px)] truncate">
          Lente Bibliográfica · Reconocimiento ISBN
        </div>

        {/* Cabecera del Modal */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 pt-5 pb-3.5 border-b border-amber-900/15 dark:border-[#242f42] bg-[#f7eedc]/95 dark:bg-[#141b27]/95 rounded-t-[14px] sm:rounded-t-[17px]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <ScanBarcode className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div className="min-w-0">
              <h2
                id="barcode-scanner-title"
                className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-[#f8f5ee] truncate"
              >
                Escanear Código de Barras
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400 truncate">
                Apunta al reverso del libro para autocompletar la ficha
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-[#f8f5ee] hover:bg-black/5 dark:hover:bg-white/5 transition"
            aria-label="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#faf6ee] dark:bg-[#0f141f] rounded-b-[14px] sm:rounded-b-[17px]">
          {/* ESTADO: ESCANEANDO O INICIANDO */}
          {(status === 'starting' || status === 'scanning') && (
            <div className="space-y-4">
              {/* Visor de Cámara con Retícula Ceremonial */}
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[340px] bg-black rounded-2xl overflow-hidden shadow-inner border border-amber-900/20 dark:border-amber-400/20 flex items-center justify-center">
                {/* Elemento de Montaje de html5-qrcode */}
                <div
                  id="nexus-barcode-reader"
                  className="w-full h-full object-cover"
                />

                {/* Spinner inicial mientras arranca la cámara */}
                {status === 'starting' && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 text-amber-200">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <span className="text-xs font-serif italic tracking-wide">
                      Iniciando lente de la cámara...
                    </span>
                  </div>
                )}

                {/* Retícula de Encuadre con Esquinas Doradas y Línea Láser */}
                {status === 'scanning' && (
                  <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center p-4">
                    {/* Caja de escaneo */}
                    <div className="relative w-[85%] max-w-[320px] h-[160px] sm:h-[180px] rounded-xl border border-amber-400/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      {/* Esquinas doradas ceremoniales */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-amber-400 rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-amber-400 rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-amber-400 rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-amber-400 rounded-br" />

                      {/* Haz de luz láser animado */}
                      <div className="nexus-scanner-laser" />

                      {/* Guía central */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="px-2.5 py-1 rounded bg-black/60 text-[11px] font-mono text-amber-300 backdrop-blur-xs tracking-wider">
                          ISBN / EAN-13
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-amber-100/90 font-serif italic text-center drop-shadow-md">
                      Centra el código de barras aquí
                    </p>
                  </div>
                )}
              </div>

              {/* Barra de Controles Rápidos de la Cámara */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                {/* Linterna si está soportada */}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition ${
                      isTorchOn
                        ? 'bg-amber-600 text-slate-950 border-amber-500 shadow-xs'
                        : 'bg-white/60 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-amber-900/15 dark:border-amber-400/20 hover:bg-amber-500/10'
                    }`}
                  >
                    {isTorchOn ? (
                      <>
                        <FlashlightOff className="w-3.5 h-3.5" />
                        <span>Apagar luz</span>
                      </>
                    ) : (
                      <>
                        <Flashlight className="w-3.5 h-3.5" />
                        <span>Linterna</span>
                      </>
                    )}
                  </button>
                )}

                {/* Selector de cámara si hay más de una */}
                {cameras.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="text-xs bg-white/70 dark:bg-stone-800/70 border border-amber-900/15 dark:border-amber-400/20 rounded-lg px-2 py-1 text-stone-800 dark:text-stone-200 outline-none"
                    >
                      {cameras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label || `Cámara ${c.id.slice(0, 4)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ESTADO: BUSCANDO EN CATÁLOGOS */}
          {status === 'searching' && (
            <div className="p-8 text-center space-y-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center shadow-lg animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-[#f8f5ee]">
                  Buscando en los códices...
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 font-mono">
                  Código detectado: <strong className="text-amber-700 dark:text-amber-400">{scannedIsbn}</strong>
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-500 mt-2 italic font-serif">
                  Consultando Google Books y Open Library para recuperar portada en alta resolución, sinopsis y datos completos...
                </p>
              </div>
            </div>
          )}

          {/* ESTADO: LIBRO ENCONTRADO (VISTA PREVIA Y ACCIONES) */}
          {status === 'found' && foundCandidate && (
            <div className="space-y-5 animate-scale-in">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Libro identificado con éxito!</span>
              </div>

              {/* Ficha Visual del Libro Encontrado */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-stone-900/70 border border-amber-900/15 dark:border-amber-400/20 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                {/* Portada */}
                <div className="w-24 sm:w-28 shrink-0 mx-auto sm:mx-0 shadow-md rounded-md overflow-hidden">
                  <BookCover
                    nombre={foundCandidate.nombre}
                    autor={foundCandidate.autor}
                    portadaUrl={foundCandidate.portadaUrl}
                    portadaFallbackUrl={foundCandidate.portadaFallbackUrl}
                    size="md"
                    variant="book"
                  />
                </div>

                {/* Metadatos */}
                <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                  <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/20">
                    ISBN: {foundCandidate.isbn}
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-[#f8f5ee] leading-snug line-clamp-2">
                    {foundCandidate.nombre}
                  </h3>

                  <p className="font-serif italic text-sm text-stone-700 dark:text-stone-300">
                    {foundCandidate.autor || 'Autor desconocido'}
                  </p>

                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-stone-600 dark:text-stone-400 flex-wrap pt-1">
                    {foundCandidate.editorial && (
                      <span className="font-medium text-stone-800 dark:text-stone-200">
                        {foundCandidate.editorial}
                      </span>
                    )}
                    {foundCandidate.editorial && foundCandidate.fechaPublicacion && (
                      <span>·</span>
                    )}
                    {foundCandidate.fechaPublicacion && (
                      <span>Año {foundCandidate.fechaPublicacion}</span>
                    )}
                    {foundCandidate.paginas && (
                      <>
                        <span>·</span>
                        <span>{foundCandidate.paginas} págs</span>
                      </>
                    )}
                  </div>

                  {foundCandidate.sinopsis && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 pt-1 italic font-serif leading-relaxed">
                      "{foundCandidate.sinopsis}"
                    </p>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onBookSelected(foundCandidate, 'direct');
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-950" />
                  <span>✨ Añadir directamente a mi biblioteca</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onBookSelected(foundCandidate, 'customize');
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-900/20 dark:border-amber-400/30 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>✏️ Revisar y personalizar ficha antes de guardar</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleResetScan}
                    className="text-xs text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 underline transition cursor-pointer"
                  >
                    Escanear otro libro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ESTADO: NO ENCONTRADO O ERROR */}
          {(status === 'not_found' || status === 'error') && (
            <div className="p-6 rounded-2xl bg-amber-900/5 dark:bg-amber-400/5 border border-amber-900/15 dark:border-amber-400/20 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-[#f8f5ee]">
                  {status === 'not_found'
                    ? 'No se encontraron metadatos en línea'
                    : 'Aviso de la lente de escaneo'}
                </h3>
                {scannedIsbn && (
                  <p className="text-xs font-mono text-amber-700 dark:text-amber-400">
                    Código detectado: <strong>{scannedIsbn}</strong>
                  </p>
                )}
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {errorMessage ||
                    'El código es válido pero este título no consta todavía en las bases de datos abiertas.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                {scannedIsbn && (
                  <button
                    type="button"
                    onClick={() => {
                      onBookSelected(
                        {
                          id: `manual-${scannedIsbn}`,
                          source: 'openlibrary',
                          nombre: '',
                          autor: '',
                          fechaPublicacion: null,
                          paginas: null,
                          isbn: scannedIsbn,
                          editorial: '',
                          idioma: 'Español',
                          edicion: '',
                          sinopsis: '',
                          portadaUrl: `https://covers.openlibrary.org/b/isbn/${scannedIsbn}-L.jpg`,
                          portadaFallbackUrl: '',
                          rawCategories: [],
                          suggestedGenre: '',
                          suggestedSubgenres: []
                        },
                        'customize'
                      );
                      onClose();
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    ✏️ Crear ficha con este ISBN ({scannedIsbn})
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetScan}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-amber-900/20 dark:border-amber-400/20 text-stone-700 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar con la cámara</span>
                </button>
              </div>
            </div>
          )}

          {/* Opciones de Respaldo: Tomar Foto y Entrada Manual */}
          <div className="pt-2 border-t border-amber-900/10 dark:border-[#242f42] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-serif italic text-stone-600 dark:text-stone-400">
                ¿Problemas con el reflejo o la luz?
              </span>

              <div className="flex items-center gap-2">
                {/* Botón Tomar / Subir Foto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="barcode-image-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-900/15 dark:border-amber-400/20 font-medium transition cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Subir o tomar foto</span>
                </button>

                {/* Botón Escribir a Mano */}
                <button
                  type="button"
                  onClick={() => setIsManualOpen(!isManualOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200/60 dark:bg-stone-800/60 hover:bg-stone-300/60 dark:hover:bg-stone-700/60 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-medium transition cursor-pointer"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>{isManualOpen ? 'Ocultar teclado' : 'Escribir ISBN'}</span>
                </button>
              </div>
            </div>

            {/* Formulario Manual de ISBN */}
            {isManualOpen && (
              <form
                onSubmit={handleManualSearch}
                className="p-3.5 rounded-xl bg-white/60 dark:bg-stone-900/60 border border-amber-900/15 dark:border-amber-400/20 space-y-2 animate-fadeIn"
              >
                <label
                  htmlFor="manual-isbn-input"
                  className="block text-xs font-medium text-stone-700 dark:text-stone-300"
                >
                  Introduce el código ISBN (10 o 13 dígitos):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="manual-isbn-input"
                    type="text"
                    value={manualIsbn}
                    onChange={(e) => setManualIsbn(e.target.value)}
                    placeholder="Ej. 9788445071403"
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#1a2233] border border-amber-900/20 dark:border-amber-400/20 text-xs font-mono text-stone-900 dark:text-[#f8f5ee] outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={isManualSubmitting || manualIsbn.trim().length < 9}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isManualSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ScanBarcode className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
