import React, { useState } from 'react';
import { getAvatarPreset } from '../constants/avatarPresets';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorder?: boolean;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 text-[10px] rounded-md',
  sm: 'w-7 h-7 text-xs rounded-lg',
  md: 'w-9 h-9 text-sm rounded-xl',
  lg: 'w-12 h-12 text-base rounded-2xl',
  xl: 'w-16 h-16 text-xl rounded-2xl',
  '2xl': 'w-24 h-24 text-3xl rounded-3xl'
};

const ICON_SIZE_MAP = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-12 h-12'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  displayName,
  username,
  size = 'md',
  className = '',
  showBorder = true
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const iconSizeClass = ICON_SIZE_MAP[size] || ICON_SIZE_MAP.md;

  const initial = (displayName || username || 'L').trim().charAt(0).toUpperCase();
  const preset = getAvatarPreset(avatarUrl);

  // 1. Caso Sello Clásico (Preset)
  if (preset) {
    const Icon = preset.icon;
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 bg-gradient-to-br ${
          preset.gradient
        } ${showBorder ? `border ${preset.borderColor}` : ''} shadow-md overflow-hidden select-none ${sizeClass} ${className}`}
        title={preset.title}
      >
        <div className="absolute inset-0 bg-radial from-white/10 to-transparent pointer-events-none" />
        <Icon className={`${iconSizeClass} ${preset.iconColor} drop-shadow`} />
      </div>
    );
  }

  // 2. Caso Imagen personalizada (URL o DataURL)
  if (avatarUrl && !imageError && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image/'))) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden bg-stone-900 ${
          showBorder ? 'border border-amber-500/40' : ''
        } shadow-md ${sizeClass} ${className}`}
      >
        <img
          src={avatarUrl}
          alt={displayName || username || 'Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 3. Fallback Monograma Clásico con gradiente de cuero y relieve
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 bg-gradient-to-br from-[#7a3e14] via-[#542908] to-[#2c1303] text-amber-200 font-serif font-bold ${
        showBorder ? 'border border-amber-600/40' : ''
      } shadow-md select-none ${sizeClass} ${className}`}
      title={displayName || username || 'Lector'}
    >
      <div className="absolute inset-0 bg-radial from-amber-400/10 to-transparent pointer-events-none" />
      <span className="drop-shadow leading-none">{initial}</span>
    </div>
  );
};
