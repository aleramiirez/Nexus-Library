import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Crown, Sparkles } from 'lucide-react';
import { ReaderLevelInfo } from '../services/levelingService';
import { NexusOrderRankPanel } from './NexusOrderRankPanel';

export interface NexusOrderCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelInfo: ReaderLevelInfo;
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  onShowToast?: (message: string) => void;
}

export const NexusOrderCodexModal: React.FC<NexusOrderCodexModalProps> = ({
  isOpen,
  onClose,
  levelInfo,
  avatarUrl,
  displayName,
  username,
  onShowToast
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5 pt-8 sm:pt-10 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="catalog-card-panel relative w-full max-w-4xl max-h-[92vh] flex flex-col p-0 shadow-2xl mt-2 sm:mt-4 overflow-hidden border-2 border-amber-900/30 dark:border-amber-500/30">
        {/* Pestaña de latón superior */}
        <div className="catalog-brass-tab z-20 whitespace-nowrap">
          El Gran Códice de la Orden · Escalafones y Sabiduría
        </div>

        {/* Cabecera ceremonial */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 pt-5 pb-3.5 border-b border-amber-900/15 dark:border-[#242f42] bg-[#f7eedc]/90 dark:bg-[#141b27]/90 rounded-t-[14px]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <Crown className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber-800 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  JERARQUÍA DEL SANTUARIO
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold border ${levelInfo.rank.badgeStyle}`}>
                  Nv. {levelInfo.level} · {levelInfo.rank.name}
                </span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 truncate leading-tight">
                El Gran Códice de los Guardianes del Nexus
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar Códice"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Códice con scroll suave */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#fbf6ea] dark:bg-[#0d121c]">
          <NexusOrderRankPanel
            levelInfo={levelInfo}
            avatarUrl={avatarUrl}
            displayName={displayName}
            username={username}
            onShowToast={onShowToast}
            variant="embedded"
          />
        </div>

        {/* Pie ceremonial */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-t border-amber-900/15 dark:border-[#242f42] bg-[#f7eedc]/95 dark:bg-[#141b27]/95">
          <div className="text-xs font-mono text-stone-600 dark:text-slate-400">
            Total acumulado: <strong className="text-amber-900 dark:text-amber-300 font-bold">{levelInfo.totalXp.toLocaleString()} XP</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
          >
            Cerrar Códice
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
