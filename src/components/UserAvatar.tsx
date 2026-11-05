import React, { useState, useEffect } from 'react';
import { getAvatarPreset } from '../constants/avatarPresets';
import {
  getRankForLevel,
  OrderRank,
  OrderRankId,
  ORDER_RANKS,
  ORDER_FRAME_STORAGE_KEY
} from '../services/levelingService';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square';
  className?: string;
  showBorder?: boolean;
  level?: number;
  rank?: OrderRank;
  frameRank?: OrderRank;
  frameRankId?: OrderRankId;
  showLevelBadge?: boolean;
  isCurrentUser?: boolean;
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
  shape = 'square',
  className = '',
  showBorder = true,
  level,
  rank: rankProp,
  frameRank: frameRankProp,
  frameRankId: frameRankIdProp,
  isCurrentUser = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [storedFrameId, setStoredFrameId] = useState<OrderRankId | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return (localStorage.getItem(ORDER_FRAME_STORAGE_KEY) as OrderRankId) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleFrameChanged = (e: Event) => {
      const customEvent = e as CustomEvent<OrderRankId>;
      if (customEvent.detail) {
        setStoredFrameId(customEvent.detail);
      } else if (typeof window !== 'undefined') {
        try {
          setStoredFrameId((localStorage.getItem(ORDER_FRAME_STORAGE_KEY) as OrderRankId) || null);
        } catch {
          // ignorar
        }
      }
    };
    window.addEventListener('nexus_order_frame_changed', handleFrameChanged);
    return () => window.removeEventListener('nexus_order_frame_changed', handleFrameChanged);
  }, []);

  const isCircle = shape === 'circle';
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const radiusClass = isCircle ? 'rounded-full' : (RADIUS_MAP[size] || RADIUS_MAP.md);
  const iconSizeClass = ICON_SIZE_MAP[size] || ICON_SIZE_MAP.md;

  const safeName =
    typeof displayName === 'string' && displayName.trim()
      ? displayName.trim()
      : typeof username === 'string' && username.trim()
      ? username.trim()
      : 'L';
  const initial = safeName.charAt(0).toUpperCase() || 'L';
  const preset = getAvatarPreset(avatarUrl);
  const validLevel = typeof level === 'number' && !isNaN(level) ? level : undefined;
  const activeRank = rankProp || (validLevel !== undefined ? getRankForLevel(validLevel) : undefined);

  // Marco activo a mostrar:
  // 1. Para el usuario actual (isCurrentUser), el marco equipado en sus preferencias locales
  //    (storedFrameId) tiene máxima prioridad para que cualquier cambio se refleje reactivamente de inmediato.
  // 2. Marco explícito de objeto (prop frameRank, usado en previsualizaciones de rangos individuales en tarjetas)
  // 3. Marco explícito por ID (prop frameRankId, e.g. en perfiles comunitarios o modales)
  // 4. Fallback al marco derivado del escalafón/nivel de este lector (activeRank)
  // 5. Fallback base al Rango I (Aprendiz de Pergamino)
  const isStoredFrameUnlocked =
    Boolean(isCurrentUser &&
    storedFrameId &&
    (!validLevel || validLevel >= (ORDER_RANKS.find((r) => r.id === storedFrameId)?.minLevel ?? 1)));

  const resolvedFrameRank: OrderRank =
    (isCurrentUser && isStoredFrameUnlocked && storedFrameId
      ? ORDER_RANKS.find((r) => r.id === storedFrameId)
      : undefined) ||
    frameRankProp ||
    (frameRankIdProp ? ORDER_RANKS.find((r) => r.id === frameRankIdProp) : undefined) ||
    activeRank ||
    ORDER_RANKS[0];

  const isLarge = size === 'lg' || size === 'xl' || size === '2xl';

  const titleText = resolvedFrameRank
    ? `${resolvedFrameRank.name} (${resolvedFrameRank.visualFrame} · Rango ${resolvedFrameRank.roman}${validLevel !== undefined ? ` · Nivel ${validLevel}` : ''})`
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
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
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

  // ─── Renderizado con Marco Distinguido de la Orden ───
  if (resolvedFrameRank) {
    const frameRankClass = `frame-rank-${resolvedFrameRank.id.toLowerCase()}`;
    const circleClass = isCircle ? 'shape-circle rounded-full' : '';
    return (
      <div
        className={`nexus-avatar-frame size-${size} ${frameRankClass} ${circleClass} ${className}`}
        title={titleText}
      >
        {/* Contenedor interior de la foto/sello */}
        <div className={`nexus-avatar-inner select-none ${isCircle ? 'rounded-full' : ''}`}>
          {renderInner()}
        </div>

        {/* Adornos y relieves de la heráldica según el Escalafón */}
        {!isCircle && isLarge && resolvedFrameRank.id === 'II' && (
          /* Remaches de latón tallados en madera para Ratón de Biblioteca */
          <>
            <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-400 border border-amber-900 shadow-xs pointer-events-none" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 border border-amber-900 shadow-xs pointer-events-none" />
            <span className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-400 border border-amber-900 shadow-xs pointer-events-none" />
            <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 border border-amber-900 shadow-xs pointer-events-none" />
          </>
        )}

        {!isCircle && isLarge && resolvedFrameRank.id === 'VII' && (
          /* Sello de lacre carmesí cancilleresco en esquina */
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-red-600 to-red-950 border border-amber-400 text-[8px] text-amber-200 flex items-center justify-center shadow-md font-serif font-black pointer-events-none">
            §
          </span>
        )}

        {!isCircle && isLarge && resolvedFrameRank.id === 'VIII' && (
          /* Gemas de zafiro en las 4 esquinas para Gran Cronista */
          <>
            <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-cyan-300 border border-sky-800 shadow-[0_0_6px_#38bdf8] pointer-events-none" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-300 border border-sky-800 shadow-[0_0_6px_#38bdf8] pointer-events-none" />
            <span className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-cyan-300 border border-sky-800 shadow-[0_0_6px_#38bdf8] pointer-events-none" />
            <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-300 border border-sky-800 shadow-[0_0_6px_#38bdf8] pointer-events-none" />
          </>
        )}

        {!isCircle && isLarge && resolvedFrameRank.id === 'X' && (
          /* Estrella cósmica imperial superior para Guardián del Nexus */
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-300 via-rose-300 to-amber-200 text-[8px] font-black text-slate-950 border border-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.9)] pointer-events-none leading-none">
            ★
          </span>
        )}
      </div>
    );
  }

  // ─── Renderizado Clásico sin Marco de Escalafón ───
  const borderClass = showBorder
    ? (preset ? `border ${preset.borderColor}` : 'border border-amber-600/40')
    : '';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden select-none shadow-md ${sizeClass} ${radiusClass} ${borderClass} ${className}`}
      title={titleText}
    >
      {renderInner()}
    </div>
  );
};
