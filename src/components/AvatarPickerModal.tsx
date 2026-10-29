import React, { useState } from 'react';
import { X, Check, Sparkles, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { AVATAR_PRESETS } from '../constants/avatarPresets';
import { UserAvatar } from './UserAvatar';
import '../dashboard-panels.css';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  onSaveAvatar: (avatarUrl: string | null) => Promise<void>;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  displayName,
  username,
  onSaveAvatar,
  onShowToast
}) => {
  const [selected, setSelected] = useState<string | null>(currentAvatarUrl || null);
  const [customUrl, setCustomUrl] = useState<string>(
    currentAvatarUrl && !currentAvatarUrl.startsWith('preset:') ? currentAvatarUrl : ''
  );
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelected(presetId);
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
  };

  const handleClearAvatar = () => {
    setSelected(null);
    setCustomUrl('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveAvatar(selected);
      onShowToast?.('¡Sello de avatar actualizado en tu carnet!', 'success');
      onClose();
    } catch {
      onShowToast?.('Error al guardar el avatar.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pt-8 sm:pt-10 bg-black/80 backdrop-blur-sm animate-fade-in"
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
            />
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 leading-tight">
                Elige tu Sello Bibliotecario
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                Selecciona uno de los sellos Dark Academia para tu carnet o sube tu propia foto.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de origen */}
        <div className="flex items-center gap-2 pt-3 border-b border-amber-900/10 dark:border-[#20293C]">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
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
            onClick={() => setActiveTab('custom')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
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
          {activeTab === 'presets' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
              {AVATAR_PRESETS.map((preset) => {
                const isCurrent = selected === preset.id;
                const Icon = preset.icon;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`relative w-full p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-between text-center transition group border overflow-hidden min-h-[148px] ${
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
                  </button>
                );
              })}
            </div>
          ) : (
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

              <div className="border-t border-amber-900/10 dark:border-[#20293C] pt-3">
                <label className="block text-xs font-semibold text-stone-800 dark:text-slate-200 mb-1.5">
                  O introduce una URL de imagen directa
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://ejemplo.com/mi-avatar.jpg"
                    className="flex-1 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3.5 py-2 text-xs text-stone-900 dark:text-slate-100 placeholder:text-stone-400 shadow-inner focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-xs transition"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie con acciones */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 border-t border-amber-900/15 dark:border-[#242E42]">
          <button
            type="button"
            onClick={handleClearAvatar}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-slate-200 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Usar monograma clásico por defecto</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-amber-900/25 dark:border-[#283246] text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Aplicar a mi Carnet'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
