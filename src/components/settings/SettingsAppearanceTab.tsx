import React, { useEffect, useState } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Check,
  Info,
  Volume2,
  VolumeX,
  Award,
  BookOpen,
  Bell,
  Sparkles
} from 'lucide-react';
import { soundService, SoundPreferences } from '../../services/soundService';

interface SettingsAppearanceTabProps {
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const SettingsAppearanceTab: React.FC<SettingsAppearanceTabProps> = ({
  darkMode,
  onToggleTheme
}) => {
  const [soundPrefs, setSoundPrefs] = useState<SoundPreferences>(() => soundService.getPreferences());

  useEffect(() => {
    return soundService.subscribe(setSoundPrefs);
  }, []);

  const handleToggleSound = (enabled: boolean) => {
    soundService.updatePreferences({ enabled });
    if (enabled) {
      soundService.playBrassBell(true);
    }
  };

  const handleUpdateSoundPref = (key: keyof SoundPreferences, value: boolean) => {
    soundService.updatePreferences({ [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl editorial-card-surface p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="font-serif text-xl font-bold flex items-center gap-2">
            <Palette className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Tema Visual de la
            Biblioteca
          </h2>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 leading-relaxed">
            Elige la estética en la que prefieres disfrutar de tu colección. Nexus Library está
            diseñado especialmente para destacar en el tema claro de papel crema clásico, evocando
            las páginas de un libro tradicional.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Opción Tema Claro */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (darkMode) onToggleTheme();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (darkMode) onToggleTheme();
              }
            }}
            className={
              'group relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 ' +
              (!darkMode
                ? 'border-amber-600 bg-[#fffcf5] dark:bg-[#151D2A] shadow-md shadow-amber-900/10 ring-1 ring-amber-600/30'
                : 'border-amber-900/20 dark:border-[#283246] bg-[#f4ebd6]/60 dark:bg-[#101520] hover:border-amber-500/50 hover:bg-[#fffcf5]/70 dark:hover:bg-[#141A26]')
            }
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                    Papel Crema Clásico
                  </h3>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                    Recomendado / Diseño Principal
                  </span>
                </div>
              </div>
              {!darkMode ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-0.5 shadow-sm">
                  <Check className="w-3 h-3" /> Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 dark:border-[#283246] bg-white/40 dark:bg-[#161D2B] text-stone-500 dark:text-slate-400 text-[10px] font-semibold px-2.5 py-0.5 group-hover:border-amber-500/50 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                  Seleccionar
                </span>
              )}
            </div>

            <div className="rounded-xl border border-amber-900/15 bg-[#f7f0df] p-3 text-xs text-stone-800 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-serif font-bold text-amber-900">
                <span>Estantería de Lectura</span>
                <span className="text-amber-700">★★★★★</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-snug">
                Fondo cálido en papel de lectura, tipografía serif editorial y estanterías de
                madera para una experiencia natural y sin fatiga visual.
              </p>
            </div>
          </div>

          {/* Opción Tema Oscuro */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!darkMode) onToggleTheme();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!darkMode) onToggleTheme();
              }
            }}
            className={
              'group relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 ' +
              (darkMode
                ? 'border-amber-400 bg-[#0E131E] shadow-xl shadow-black/40 ring-1 ring-amber-400/30'
                : 'border-amber-900/20 dark:border-[#283246] bg-[#f4ebd6]/60 dark:bg-[#101520] hover:border-amber-500/50 hover:bg-[#fffcf5]/70 dark:hover:bg-[#141A26]')
            }
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100">
                    Biblioteca Nocturna
                  </h3>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                    Lectura en penumbra
                  </span>
                </div>
              </div>
              {darkMode ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-0.5 shadow-sm">
                  <Check className="w-3 h-3" /> Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 dark:border-[#283246] bg-white/40 dark:bg-[#161D2B] text-stone-500 dark:text-slate-400 text-[10px] font-semibold px-2.5 py-0.5 group-hover:border-amber-500/50 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                  Seleccionar
                </span>
              )}
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-[#080C15] p-3 text-xs text-slate-200 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-serif font-bold text-amber-300">
                <span>Estantería de Lectura</span>
                <span className="text-amber-400">★★★★★</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Fondo pizarra oscuro con acentos dorados y carmesí. Ideal si prefieres leer de
                noche o reducir el brillo de la pantalla.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/60 dark:bg-[#101520] p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
            Nexus Library prioriza siempre el tema claro por diseño. Si eliges el tema oscuro,
            tu preferencia se recordará en este navegador para tus próximas visitas.
          </p>
        </div>
      </div>

      {/* Card: Efectos Sonoros y Ceremonias Bibliotecarias */}
      <div className="rounded-2xl editorial-card-surface p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-900/15 dark:border-[#222B3C] pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Efectos Sonoros y Ceremonias Bibliotecarias
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 leading-relaxed">
              Microinteracciones sonoras táctiles sintetizadas en tiempo real (0 latencia, sin descargas).
              Añaden la textura acústica de una biblioteca histórica al completar obras y hojear páginas.
            </p>
          </div>

          {/* Interruptor maestro */}
          <button
            type="button"
            onClick={() => handleToggleSound(!soundPrefs.enabled)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/20 self-start sm:self-auto ${
              soundPrefs.enabled ? 'bg-amber-600' : 'bg-stone-300 dark:bg-slate-700'
            }`}
            role="switch"
            aria-checked={soundPrefs.enabled}
            title={soundPrefs.enabled ? 'Silenciar efectos sonoros' : 'Activar efectos sonoros'}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] ${
                soundPrefs.enabled ? 'translate-x-5 text-amber-600' : 'translate-x-0 text-stone-400'
              }`}
            >
              {soundPrefs.enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </span>
          </button>
        </div>

        {/* Selector de volumen y ajustes */}
        {soundPrefs.enabled && (
          <div className="space-y-4 pt-1 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#fdf8ee]/70 dark:bg-[#101520]">
              <div>
                <span className="text-xs font-serif font-bold text-stone-900 dark:text-slate-100 block">
                  Intensidad del Volumen
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400">
                  Nivel de presencia acústica en los altavoces o auriculares
                </span>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                {[
                  { label: 'Suave', value: 0.4 },
                  { label: 'Equilibrado', value: 0.75 },
                  { label: 'Pleno', value: 1.0 }
                ].map((lvl) => {
                  const isActive = Math.abs(soundPrefs.volume - lvl.value) < 0.15;
                  return (
                    <button
                      key={lvl.label}
                      type="button"
                      onClick={() => {
                        soundService.updatePreferences({ volume: lvl.value });
                        soundService.playBrassBell(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isActive
                          ? 'bg-amber-600 text-slate-950 font-bold shadow-xs'
                          : 'border border-amber-900/15 dark:border-[#242E42] text-stone-600 dark:text-slate-400 hover:bg-amber-500/10'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de sonidos con botones de prueba */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Sello de Lacre */}
              <div className="rounded-xl border border-amber-900/15 dark:border-[#232C3F] bg-white/60 dark:bg-[#111623] p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-red-950/15 text-red-700 dark:text-red-400 border border-red-900/20 shrink-0 mt-0.5">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100">
                        Sello de Lacre Ceremonial
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-snug mt-0.5">
                        Golpe sordo y resonancia al completar obras o superar metas de lectura.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundPrefs.waxSeal}
                    onChange={(e) => handleUpdateSoundPref('waxSeal', e.target.checked)}
                    className="rounded border-amber-900/30 text-amber-600 focus:ring-amber-500/20 h-4 w-4 mt-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => soundService.playWaxSeal(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-amber-900/20 dark:border-amber-400/20 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-serif font-bold text-amber-900 dark:text-amber-300 transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Probar Sello de Lacre</span>
                </button>
              </div>

              {/* Pase de Páginas */}
              <div className="rounded-xl border border-amber-900/15 dark:border-[#232C3F] bg-white/60 dark:bg-[#111623] p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-600/20 shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100">
                        Pase de Páginas de Pergamino
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-snug mt-0.5">
                        Susurro acústico de papel seco al abrir fichas de libro y hojear sus pestañas.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundPrefs.pageTurn}
                    onChange={(e) => handleUpdateSoundPref('pageTurn', e.target.checked)}
                    className="rounded border-amber-900/30 text-amber-600 focus:ring-amber-500/20 h-4 w-4 mt-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => soundService.playPageTurn(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-amber-900/20 dark:border-amber-400/20 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-serif font-bold text-amber-900 dark:text-amber-300 transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Probar Pase de Página</span>
                </button>
              </div>

              {/* Campanilla de Latón */}
              <div className="rounded-xl border border-amber-900/15 dark:border-[#232C3F] bg-white/60 dark:bg-[#111623] p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-600/20 shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100">
                        Campanilla de Mostrador
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-snug mt-0.5">
                        Timbre cristalino de latón clásico de servicio bibliotecario.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundPrefs.brassBell}
                    onChange={(e) => handleUpdateSoundPref('brassBell', e.target.checked)}
                    className="rounded border-amber-900/30 text-amber-600 focus:ring-amber-500/20 h-4 w-4 mt-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => soundService.playBrassBell(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-amber-900/20 dark:border-amber-400/20 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-serif font-bold text-amber-900 dark:text-amber-300 transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Probar Campanilla</span>
                </button>
              </div>

              {/* Sello Ex Libris de Tinta */}
              <div className="rounded-xl border border-amber-900/15 dark:border-[#232C3F] bg-white/60 dark:bg-[#111623] p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-700/15 text-amber-900 dark:text-amber-300 border border-amber-700/25 shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100">
                        Sello Ex Libris de Tinta
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-snug mt-0.5">
                        Golpe de tampón de tinta con timbre seco al estampar sellos en libros.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => soundService.playInkStamp(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-amber-900/20 dark:border-amber-400/20 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-serif font-bold text-amber-900 dark:text-amber-300 transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Probar Sello Ex Libris</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
