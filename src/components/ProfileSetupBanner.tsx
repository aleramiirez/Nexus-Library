import React, { useState } from 'react';
import { UserCheck, ArrowRight, X, Sparkles } from 'lucide-react';
import { UserProfile } from '../types/models';
import '../dashboard-panels.css';

interface ProfileSetupBannerProps {
  userProfile: UserProfile;
  userId: string;
  onGoToSettings: () => void;
}

export const ProfileSetupBanner: React.FC<ProfileSetupBannerProps> = ({
  userProfile,
  userId,
  onGoToSettings
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return (
        sessionStorage.getItem(`nexus_profile_banner_dismissed_${userId}`) === 'true' ||
        localStorage.getItem(`nexus_profile_setup_done_${userId}`) === 'true'
      );
    } catch {
      return false;
    }
  });

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(`nexus_profile_banner_dismissed_${userId}`, 'true');
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div className="catalog-card-panel relative p-4 sm:p-5 mb-5 animate-fade-in">
      <div className="catalog-brass-tab">Expediente de Lector · Identificación Provisional</div>

      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
        title="Ocultar aviso"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 truncate">
                Hola, {userProfile.displayName || 'Lector'}
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/30 font-semibold">
                @{userProfile.username}
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Tu carnet tiene un identificador provisional. Personaliza tu nombre, alias y biografía en Ajustes para conectar con amigos y compartir lecturas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={onGoToSettings}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-sm transition active:scale-95"
          >
            <span>Personalizar en Ajustes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
