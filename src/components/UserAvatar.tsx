import React, { useState } from 'react';
import { getAvatarPreset } from '../constants/avatarPresets';
import { getRankForLevel, OrderRank } from '../services/levelingService';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorder?: boolean;
  level?: number;
  rank?: OrderRank;
  showLevelBadge?: boolean;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl'
};

const RADIUS_MAP = {
  xs: 'rounded-md',
  sm: 'rounded-xl',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl'
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
  showBorder = true,
  level,
  rank: rankProp
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const radiusClass = RADIUS_MAP[size] || RADIUS_MAP.md;
  const iconSizeClass = ICON_SIZE_MAP[size] || ICON_SIZE_MAP.md;

  const safeName = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : typeof username === 'string' && username.trim() ? username.trim() : 'L';
  const initial = safeName.charAt(0).toUpperCase() || 'L';
  const preset = getAvatarPreset(avatarUrl);
  const validLevel = typeof level === 'number' && !isNaN(level) ? level : undefined;
  const activeRank = rankProp || (validLevel !== undefined ? getRankForLevel(validLevel) : undefined);

  // Marco distinguido de la Orden o ribete clásico
  const borderClass = activeRank
    ? activeRank.avatarRingClass
    : showBorder
    ? (preset ? `border ${preset.borderColor}` : 'border border-amber-600/40')
    : '';

  const titleText = activeRank
    ? `${activeRank.name} (Rango ${activeRank.roman}${validLevel !== undefined ? ` · Nivel ${validLevel}` : ''})`
    : displayName || username || 'Lector';

  const renderInner = () => {
    // 1. Caso Sello Clásico (Preset)
    if (preset) {
      const Icon = preset.icon;
      return (
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${preset.gradient} relative select-none`}
        >
          <div className="absolute inset-0 bg-radial from-white/10 to-transparent pointer-events-none" />
          <Icon className={`${iconSizeClass} ${preset.iconColor} drop-shadow`} />
        </div>
      );
    }

    // 2. Caso Imagen personalizada (URL o DataURL)
    if (avatarUrl && !imageError && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image/'))) {
      return (
        <img
          src={avatarUrl}
          alt={displayName || username || 'Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      );
    }

    // 3. Fallback Monograma Clásico con gradiente de cuero y relieve
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#7a3e14] via-[#542908] to-[#2c1303] text-amber-200 font-serif font-bold relative select-none"
      >
        <div className="absolute inset-0 bg-radial from-amber-400/10 to-transparent pointer-events-none" />
        <span className="drop-shadow leading-none">{initial}</span>
      </div>
    );
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden select-none shadow-md ${sizeClass} ${radiusClass} ${borderClass} ${className}`}
      title={titleText}
    >
      {renderInner()}
    </div>
  );
};
