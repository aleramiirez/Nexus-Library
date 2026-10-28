import React, { useEffect, useState } from 'react';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Laptop,
  Sparkles,
  WifiOff,
  Flame
} from 'lucide-react';
import { pwaInstallService, PwaInstallState } from '../services/pwaInstallService';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  const [pwaState, setPwaState] = useState<PwaInstallState>(() => pwaInstallService.getState());
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(() => {
    if (pwaState.isIOS) return 'ios';
    if (pwaState.isAndroid) return 'android';
    return 'desktop';
  });
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    const unsub = pwaInstallService.subscribe((state) => {
      setPwaState(state);
      if (state.isInstalled) {
        setInstalledSuccess(true);
      }
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    setIsInstalling(true);
    const result = await pwaInstallService.promptInstall();
    setIsInstalling(false);
    if (result === 'accepted') {
      setInstalledSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-amber-900/30 dark:border-[#2A354A] bg-gradient-to-b from-[#fdfaf2] via-[#f7f0df] to-[#efe5cc] dark:from-[#171E2C] dark:via-[#131824] dark:to-[#0D111A] text-stone-900 dark:text-slate-100 p-6 sm:p-8 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Adorno superior dorado */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600/20 via-amber-500 to-amber-600/20" />

        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="absolute right-4 top-4 p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white hover:bg-amber-500/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-white">
              Instalar Nexus Library
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-400">
              Lleva tu biblioteca en el móvil o escritorio como una aplicación nativa
            </p>
          </div>
        </div>

        {/* Ventajas clave */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
          <div className="rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-white/50 dark:bg-[#151B27] p-2.5">
            <Sparkles className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
            <span className="block text-[11px] font-bold text-stone-800 dark:text-slate-200">
              Sin barras
            </span>
            <span className="text-[10px] text-stone-500 dark:text-slate-400">Pantalla completa</span>
          </div>
          <div className="rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-white/50 dark:bg-[#151B27] p-2.5">
            <WifiOff className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
            <span className="block text-[11px] font-bold text-stone-800 dark:text-slate-200">
              Uso Offline
            </span>
            <span className="text-[10px] text-stone-500 dark:text-slate-400">Acceso sin conexión</span>
          </div>
          <div className="rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-white/50 dark:bg-[#151B27] p-2.5">
            <Flame className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
            <span className="block text-[11px] font-bold text-stone-800 dark:text-slate-200">
              1-Toque
            </span>
            <span className="text-[10px] text-stone-500 dark:text-slate-400">En pantalla de inicio</span>
          </div>
        </div>

        {/* Estado si ya está instalada */}
        {installedSuccess || pwaState.isStandalone ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-center space-y-2 mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              ¡Nexus Library ya está instalada!
            </p>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
              Puedes abrirla directamente desde el icono de tu pantalla de inicio o cajón de aplicaciones.
            </p>
          </div>
        ) : (
          <>
            {/* Si el navegador permite la instalación directa con 1 clic (Android/Chrome/Edge) */}
            {pwaState.canPrompt && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleDirectInstall}
                  disabled={isInstalling}
                  className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold py-3.5 px-5 text-sm shadow-lg shadow-amber-900/20 dark:shadow-amber-500/20 transition active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalling ? 'Instalando...' : 'Instalar en este dispositivo ahora'}</span>
                </button>
                <p className="text-[11px] text-center text-stone-500 dark:text-slate-400 mt-2">
                  Instalación instantánea y gratuita sin ocupar apenas espacio
                </p>
              </div>
            )}

            {/* Selector de pestañas por dispositivo */}
            <div className="flex border-b border-amber-900/20 dark:border-[#2A354A] mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={
                  'flex-1 flex items-center justify-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition ' +
                  (activeTab === 'ios'
                    ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400')
                }
              >
                <Smartphone className="w-3.5 h-3.5" /> iPhone / iPad
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={
                  'flex-1 flex items-center justify-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition ' +
                  (activeTab === 'android'
                    ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400')
                }
              >
                <Smartphone className="w-3.5 h-3.5" /> Android
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={
                  'flex-1 flex items-center justify-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition ' +
                  (activeTab === 'desktop'
                    ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400')
                }
              >
                <Laptop className="w-3.5 h-3.5" /> PC / Mac
              </button>
            </div>

            {/* Contenido según dispositivo */}
            <div className="rounded-2xl border border-amber-900/20 dark:border-[#222B3D] bg-white/40 dark:bg-[#10141F] p-4 text-xs space-y-3.5 text-stone-700 dark:text-slate-300">
              {activeTab === 'ios' && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-900 dark:text-white">
                        Abre Nexus Library en Safari
                      </p>
                      <p className="text-stone-500 dark:text-slate-400">
                        Pulsa el icono de <span className="font-medium inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><Share className="w-3.5 h-3.5 inline" /> Compartir</span> en la barra inferior.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-900 dark:text-white">
                        Añadir a pantalla de inicio
                      </p>
                      <p className="text-stone-500 dark:text-slate-400">
                        Baja en el menú y selecciona <span className="font-medium inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><PlusSquare className="w-3.5 h-3.5 inline" /> «Añadir a pantalla de inicio»</span>.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'android' && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-900 dark:text-white">
                        Menú del navegador (Chrome / Edge / Samsung)
                      </p>
                      <p className="text-stone-500 dark:text-slate-400">
                        Pulsa los tres puntos verticales <span className="font-bold">⋮</span> en la esquina superior derecha.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-900 dark:text-white">
                        Instalar o Añadir a inicio
                      </p>
                      <p className="text-stone-500 dark:text-slate-400">
                        Toca en <span className="font-medium text-amber-700 dark:text-amber-400">«Instalar aplicación»</span> o <span className="font-medium text-amber-700 dark:text-amber-400">«Añadir a pantalla de inicio»</span>.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'desktop' && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-900 dark:text-white">
                        Barra de direcciones de Chrome / Edge / Brave
                      </p>
                      <p className="text-stone-500 dark:text-slate-400">
                        Haz clic en el icono de instalación <span className="font-medium text-amber-700 dark:text-amber-400">⊕</span> que aparece a la derecha de la barra de URL.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-900 dark:text-white">
                        Ventana independiente
                      </p>
                      <p className="text-stone-500 dark:text-slate-400">
                        Se abrirá como una aplicación de escritorio nativa en tu barra de tareas o Dock.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-amber-900/20 dark:border-[#2A354A] bg-white/60 dark:bg-[#161D2B] hover:bg-amber-500/10 text-stone-700 dark:text-slate-200 px-4 py-2 text-xs font-semibold transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
