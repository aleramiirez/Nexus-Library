import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Sparkles, Image as ImageIcon, Upload, Trash2, Crown, Lock, CheckCircle2 } from 'lucide-react';
import { AVATAR_PRESETS, getAvatarPreset } from '../constants/avatarPresets';
import { UserAvatar } from './UserAvatar';
import {
  ORDER_RANKS,
  OrderRank,
  OrderRankId,
  ReaderLevelInfo,
  getSelectedOrderFrame,
  setSelectedOrderFrame
} from '../services/levelingService';
import { soundService } from '../services/soundService';
import '../dashboard-panels.css';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  onSaveAvatar: (avatarUrl: string | null, frameId?: OrderRankId) => Promise<void>;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  levelInfo?: ReaderLevelInfo;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  displayName,
  username,
  onSaveAvatar,
  onShowToast,
  levelInfo
}) => {
  const [selected, setSelected] = useState<string | null>(currentAvatarUrl || null);
  const [customUrl, setCustomUrl] = useState<string>(
    currentAvatarUrl && !currentAvatarUrl.startsWith('preset:') ? currentAvatarUrl : ''
  );
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'frames'>('presets');

  const userLevel = levelInfo?.level ?? 1;
  const unlockedRanks = levelInfo?.unlockedRanks || ORDER_RANKS.filter((r) => userLevel >= r.minLevel);
  const [selectedFrameId, setSelectedFrameId] = useState<OrderRankId>(() => {
    return getSelectedOrderFrame(levelInfo?.rank?.id || 'I', unlockedRanks);
  });

  // Sincronizar estado al abrir el modal o si cambia el nivel/avatar del lector
  useEffect(() => {
    if (isOpen) {
      setSelected(currentAvatarUrl || null);
      setCustomUrl(
        currentAvatarUrl && !currentAvatarUrl.startsWith('preset:') ? currentAvatarUrl : ''
      );
      const currentRankId = levelInfo?.rank?.id || 'I';
      const activeFrame = getSelectedOrderFrame(currentRankId, unlockedRanks);
      setSelectedFrameId(activeFrame);
    }
  }, [isOpen, currentAvatarUrl, levelInfo?.rank?.id, levelInfo?.level]);

  // Escuchar cambios reactivos en el marco de la Orden
  useEffect(() => {
    const handleFrameChanged = (e: Event) => {
      const customEvent = e as CustomEvent<OrderRankId>;
      if (customEvent.detail) {
        setSelectedFrameId(customEvent.detail);
      }
    };
    window.addEventListener('nexus_order_frame_changed', handleFrameChanged);
    return () => window.removeEventListener('nexus_order_frame_changed', handleFrameChanged);
  }, []);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelected(presetId);
    soundService.playBrassBell();
    onSaveAvatar(presetId, selectedFrameId || undefined).catch(() => {});
    const preset = getAvatarPreset(presetId);
    if (preset) {
      onShowToast?.(`¡Sello «${preset.title}» aplicado a tu carnet!`, 'success');
    }
  };

  const handleSelectFrame = (rank: OrderRank) => {
    if (userLevel < rank.minLevel) {
      onShowToast?.(`Este marco se desbloquea al alcanzar el Nivel ${rank.minLevel} (${rank.name}).`, 'info');
      return;
    }
    setSelectedFrameId(rank.id);
    setSelectedOrderFrame(rank.id);
    onSaveAvatar(selected, rank.id).catch(() => {});
    soundService.playBrassBell();
    onShowToast?.(`¡Marco «${rank.visualFrame}» equipado en tu perfil!`, 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast?.('Por favor, selecciona un archivo de imagen válido (JPG, PNG, WEBP).', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onShowToast?.('La imagen supera el límite de 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomUrl(dataUrl);
        setSelected(dataUrl);
        soundService.playBrassBell();
        onSaveAvatar(dataUrl, selectedFrameId || undefined).catch(() => {});
        onShowToast?.('¡Foto personalizada aplicada a tu carnet!', 'success');
        setActiveTab('custom');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    const clean = customUrl.trim();
    if (!clean) {
      onShowToast?.('Introduce una URL o sube una imagen.', 'error');
      return;
    }
    setSelected(clean);
    soundService.playBrassBell();
    onSaveAvatar(clean, selectedFrameId || undefined).catch(() => {});
    onShowToast?.('¡Foto personalizada aplicada a tu carnet!', 'success');
  };

  const handleClearAvatar = () => {
    setSelected(null);
    setCustomUrl('');
    soundService.playPageTurn();
    onSaveAvatar(null, selectedFrameId || undefined).catch(() => {});
    onShowToast?.('Avatar restablecido a las iniciales de tu carnet.', 'info');
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 pt-8 sm:pt-10 bg-black/70 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="catalog-card-panel relative w-full max-w-3xl max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-2xl mt-2 sm:mt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="catalog-brass-tab">Heráldica & Sellos · Carnet de Lector</div>

        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3.5 border-b border-amber-900/15 dark:border-[#242E42]">
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={selected}
              displayName={displayName}
              username={username}
              size="lg"
              frameRankId={selectedFrameId}
            />
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 leading-tight">
                Elige tu Sello & Marco de la Orden
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                Personaliza la heráldica de tu carnet de lector y el marco ornamental según tus escalafones conquistados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de origen */}
        <div className="flex items-center gap-2 pt-3 border-b border-amber-900/10 dark:border-[#20293C] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'presets'
                ? 'border-amber-600 text-amber-900 dark:text-amber-300 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sellos de la Biblioteca ({AVATAR_PRESETS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('frames')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'frames'
                ? 'border-amber-600 text-amber-900 dark:text-amber-300 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-slate-300'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Marcos de la Orden ({ORDER_RANKS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'custom'
                ? 'border-amber-600 text-amber-900 dark:text-amber-300 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-slate-300'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Foto Personalizada / URL</span>
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {activeTab === 'presets' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
              {AVATAR_PRESETS.map((preset) => {
                const isCurrent = selected === preset.id;
                const Icon = preset.icon;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`relative w-full p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-between text-center transition group border overflow-hidden min-h-[148px] cursor-pointer ${
                      isCurrent
                        ? 'border-amber-600 bg-amber-500/15 shadow-md ring-2 ring-amber-500/30'
                        : 'border-amber-900/15 dark:border-[#222B3C] bg-[#fffcf5] dark:bg-[#111724] hover:border-amber-600/50 hover:bg-[#faebd0]/60'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${preset.gradient} border ${preset.borderColor} shadow-inner group-hover:scale-105 transition-transform shrink-0 my-1`}
                    >
                      <Icon className={`w-6 h-6 ${preset.iconColor}`} />
                    </div>

                    <div className="w-full min-w-0 px-1 flex flex-col items-center">
                      <span className="block w-full text-xs sm:text-[13px] font-bold font-serif text-stone-900 dark:text-slate-100 leading-tight text-center break-words">
                        {preset.title}
                      </span>
                      <span className="block w-full text-[10px] sm:text-[11px] text-stone-500 dark:text-slate-400 line-clamp-2 leading-tight mt-1 text-center">
                        {preset.description}
                      </span>
                    </div>

                    {isCurrent && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}

                    <div className="mt-2 w-full">
                      {isCurrent ? (
                        <span className="inline-flex items-center justify-center gap-1 w-full py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Equipado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-full py-1 rounded-lg border border-amber-800/30 dark:border-amber-400/30 text-amber-900 dark:text-amber-200 group-hover:bg-amber-500/20 text-[11px] font-bold transition">
                          Equipar
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'frames' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-600/25 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-amber-950 dark:text-amber-200 block">
                    Escalafones de la Orden del Nexus
                  </span>
                  <span className="text-stone-600 dark:text-slate-300 text-[11px]">
                    Tu Nivel actual es <strong>Nv. {userLevel}</strong>. Puedes equipar libremente cualquiera de los marcos que ya hayas conquistado.
                  </span>
                </div>
                <div className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-600/30 shrink-0">
                  {unlockedRanks.length} / 10 Desbloqueados
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ORDER_RANKS.map((rank) => {
                  const isUnlocked = userLevel >= rank.minLevel;
                  const isCurrent = selectedFrameId === rank.id;

                  return (
                    <div
                      key={rank.id}
                      className={`relative p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-amber-600 bg-amber-500/15 shadow-md ring-2 ring-amber-500/35'
                          : isUnlocked
                          ? 'border-amber-900/20 dark:border-[#222B3C] bg-[#fffcf5] dark:bg-[#111724] hover:border-amber-500/50'
                          : 'border-stone-300/40 dark:border-slate-800/40 bg-stone-100/40 dark:bg-slate-900/30 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar de muestra con ese marco específico */}
                        <div className="shrink-0">
                          <UserAvatar
                            avatarUrl={selected}
                            displayName={displayName}
                            username={username}
                            size="md"
                            frameRank={rank}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-amber-800 dark:text-amber-400">
                              Rango {rank.roman}
                            </span>
                            <span className="text-[10px] font-mono text-stone-500 dark:text-slate-400">
                              · Nv. {rank.minLevel}–{rank.maxLevel}
                            </span>
                          </div>
                          <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 truncate leading-tight">
                            {rank.visualFrame}
                          </h4>
                          <span className="text-[11px] text-stone-500 dark:text-slate-400 truncate block">
                            {rank.name}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Equipado</span>
                          </span>
                        ) : isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleSelectFrame(rank)}
                            className="px-3 py-1.5 rounded-xl border border-amber-800/30 dark:border-amber-400/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 text-xs font-bold transition cursor-pointer"
                          >
                            Equipar
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-200 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-[10px] font-mono">
                            <Lock className="w-3 h-3" />
                            <span>Nv. {rank.minLevel}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4 p-2">
              <div>
                <label className="block text-xs font-semibold text-stone-800 dark:text-slate-200 mb-1.5">
                  Subir archivo de imagen desde tu dispositivo
                </label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-900/25 dark:border-[#2A3448] rounded-2xl cursor-pointer hover:border-amber-500 transition bg-[#fffcf5] dark:bg-[#101623]">
                  <Upload className="w-6 h-6 text-amber-700 dark:text-amber-400 mb-1.5" />
                  <span className="text-xs font-semibold text-stone-800 dark:text-slate-200">
                    Haz clic para seleccionar foto
                  </span>
                  <span className="text-[11px] text-stone-500 mt-0.5">
                    Formatos JPG, PNG, WEBP (Máx. 2MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="relative flex items-center py-1">
                <div className="grow border-t border-amber-900/15 dark:border-[#222B3D]" />
                <span className="shrink mx-3 text-[10px] uppercase font-mono tracking-wider text-stone-500">
                  o introduce una URL directa
                </span>
                <div className="grow border-t border-amber-900/15 dark:border-[#222B3D]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 dark:text-slate-200 mb-1.5">
                  Enlace público de la imagen (HTTPS)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://ejemplo.com/mi-avatar.jpg"
                    className="flex-1 px-3 py-2 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121824] text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    Equipar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie con acciones */}
        <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-amber-900/15 dark:border-[#242E42]">
          <button
            type="button"
            onClick={handleClearAvatar}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Usar monograma clásico por defecto</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-amber-900/25 dark:border-[#283246] text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
