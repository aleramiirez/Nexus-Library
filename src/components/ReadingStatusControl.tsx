import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { ReadingStatus } from '../constants/catalogs';
import { READING_STATUS_META } from '../constants/readingStatusMeta';
import '../reading-status-control.css';

const ORDERED_STATUSES: ReadingStatus[] = [
  '❌ No Leído',
  '⏳ Leyendo',
  '⏸️ Pausado',
  '✅ Leído'
];

export interface ReadingStatusControlProps {
  value: ReadingStatus;
  onChange: (next: ReadingStatus) => void;
  disabled?: boolean;
  hints?: Partial<Record<ReadingStatus, string>>;
  className?: string;
}

interface MenuCoords {
  top: number;
  left: number;
  width: number;
  isBottomPlaced: boolean;
  isMobile: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes a nivel de módulo (nunca dentro del render)
// ─────────────────────────────────────────────────────────────────────────────

interface ReadingStatusButtonProps {
  buttonRef: React.RefObject<HTMLButtonElement>;
  value: ReadingStatus;
  isOpen: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const ReadingStatusButton: React.FC<ReadingStatusButtonProps> = ({
  buttonRef,
  value,
  isOpen,
  disabled,
  className = '',
  onClick,
  onKeyDown
}) => {
  const meta = READING_STATUS_META[value] || READING_STATUS_META['❌ No Leído'];
  const Icon = meta.icon;

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      data-status={value}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-label={`Estado de lectura: ${meta.label}. Cambiar`}
      className={`reading-status-badge ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{meta.label}</span>
      <ChevronDown
        className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
        aria-hidden="true"
      />
    </button>
  );
};

interface ReadingStatusMenuItemProps {
  status: ReadingStatus;
  isSelected: boolean;
  isFocused: boolean;
  hint?: string;
  itemRef: (el: HTMLButtonElement | null) => void;
  onSelect: () => void;
  onMouseEnter: () => void;
}

const ReadingStatusMenuItem: React.FC<ReadingStatusMenuItemProps> = ({
  status,
  isSelected,
  isFocused,
  hint,
  itemRef,
  onSelect,
  onMouseEnter
}) => {
  const meta = READING_STATUS_META[status];
  const Icon = meta.icon;

  return (
    <button
      ref={itemRef}
      type="button"
      role="menuitemradio"
      aria-checked={isSelected}
      tabIndex={isFocused ? 0 : -1}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={`reading-status-menu-item ${isFocused ? 'is-focused' : ''} ${
        isSelected ? 'is-active' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
        <div className="flex flex-col text-left min-w-0">
          <span className="text-xs sm:text-sm font-semibold truncate leading-tight">
            {meta.label}
          </span>
          {hint && (
            <span className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5 leading-none">
              {hint}
            </span>
          )}
        </div>
      </div>
      {isSelected && (
        <Check className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 ml-2" aria-hidden="true" />
      )}
    </button>
  );
};

interface ReadingStatusMenuProps {
  coords: MenuCoords;
  currentValue: ReadingStatus;
  focusedIndex: number;
  hints?: Partial<Record<ReadingStatus, string>>;
  menuId: string;
  onSelect: (status: ReadingStatus) => void;
  onClose: () => void;
  onHoverIndex: (index: number) => void;
  itemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
}

const ReadingStatusMenu: React.FC<ReadingStatusMenuProps> = ({
  coords,
  currentValue,
  focusedIndex,
  hints,
  menuId,
  onSelect,
  onClose,
  onHoverIndex,
  itemRefs
}) => {
  const style: React.CSSProperties = coords.isMobile
    ? {}
    : {
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        minWidth: `${Math.max(240, coords.width)}px`
      };

  return createPortal(
    <>
      <div
        className="reading-status-menu-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        id={menuId}
        data-reading-status-menu="true"
        role="menu"
        aria-label="Seleccionar estado de lectura"
        style={style}
        className={`reading-status-menu-popover ${
          coords.isMobile ? 'is-mobile-sheet' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {coords.isMobile && (
          <div className="w-10 h-1 rounded-full bg-amber-900/20 dark:bg-slate-700 mx-auto my-1.5" />
        )}
        <div className="flex flex-col gap-0.5">
          {ORDERED_STATUSES.map((status, idx) => (
            <ReadingStatusMenuItem
              key={status}
              status={status}
              isSelected={status === currentValue}
              isFocused={idx === focusedIndex}
              hint={hints?.[status]}
              itemRef={(el) => {
                itemRefs.current[idx] = el;
              }}
              onSelect={() => onSelect(status)}
              onMouseEnter={() => onHoverIndex(idx)}
            />
          ))}
        </div>
      </div>
    </>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────────────────────────

export const ReadingStatusControl: React.FC<ReadingStatusControlProps> = ({
  value,
  onChange,
  disabled = false,
  hints,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords>({
    top: 0,
    left: 0,
    width: 0,
    isBottomPlaced: true,
    isMobile: false
  });

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const currentIndex = ORDERED_STATUSES.indexOf(value);
  const initialIndex = currentIndex >= 0 ? currentIndex : 0;
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);

  const calculateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;

    const popoverH = 210; // Altura aproximada del menú
    const spaceBelow = window.innerHeight - rect.bottom;
    const isBottomPlaced = spaceBelow >= popoverH || spaceBelow >= rect.top;

    let top = isBottomPlaced ? rect.bottom + 6 : rect.top - popoverH - 6;
    let left = rect.left;

    // Evitar desbordamiento horizontal
    const maxLeft = window.innerWidth - 270;
    if (left > maxLeft) left = Math.max(12, maxLeft);
    if (left < 12) left = 12;

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(rect.width),
      isBottomPlaced,
      isMobile
    });
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    calculateCoords();
    const curIdx = ORDERED_STATUSES.indexOf(value);
    setFocusedIndex(curIdx >= 0 ? curIdx : 0);
    setIsOpen(true);
  }, [disabled, calculateCoords, value]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, []);

  const handleSelect = useCallback(
    (status: ReadingStatus) => {
      setIsOpen(false);
      buttonRef.current?.focus();
      if (status !== value) {
        onChange(status);
      }
    },
    [value, onChange]
  );

  // Manejo de teclado para el botón de activación
  const handleButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
    }
  };

  // Manejo de teclado cuando el menú está abierto
  useEffect(() => {
    if (!isOpen) return;

    // Enfocar elemento activo al abrir
    const timer = setTimeout(() => {
      itemRefs.current[focusedIndex]?.focus();
    }, 16);

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        return;
      }

      if (e.key === 'Tab') {
        closeMenu();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = (prev + 1) % ORDERED_STATUSES.length;
          itemRefs.current[next]?.focus();
          return next;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = (prev - 1 + ORDERED_STATUSES.length) % ORDERED_STATUSES.length;
          itemRefs.current[next]?.focus();
          return next;
        });
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
        itemRefs.current[0]?.focus();
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        const lastIdx = ORDERED_STATUSES.length - 1;
        setFocusedIndex(lastIdx);
        itemRefs.current[lastIdx]?.focus();
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const currentTarget = ORDERED_STATUSES[focusedIndex];
        if (currentTarget) {
          handleSelect(currentTarget);
        }
      }
    };

    const handleResizeOrScroll = () => {
      if (window.innerWidth < 640) return;
      calculateCoords();
    };

    window.addEventListener('keydown', handleWindowKeyDown, true);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleWindowKeyDown, true);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, focusedIndex, closeMenu, handleSelect, calculateCoords]);

  return (
    <>
      <ReadingStatusButton
        buttonRef={buttonRef}
        value={value}
        isOpen={isOpen}
        disabled={disabled}
        className={className}
        onClick={isOpen ? closeMenu : openMenu}
        onKeyDown={handleButtonKeyDown}
      />

      {isOpen && (
        <ReadingStatusMenu
          coords={coords}
          currentValue={value}
          focusedIndex={focusedIndex}
          hints={hints}
          menuId={menuId}
          onSelect={handleSelect}
          onClose={closeMenu}
          onHoverIndex={setFocusedIndex}
          itemRefs={itemRefs}
        />
      )}
    </>
  );
};
