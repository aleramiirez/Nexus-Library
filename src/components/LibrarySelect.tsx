import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import '../library-select.css';

export interface LibrarySelectOption<T extends string | number = string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  badge?: string;
}

export interface LibrarySelectGroup<T extends string | number = string> {
  groupLabel: string;
  options: LibrarySelectOption<T>[];
}

export interface LibrarySelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options?: LibrarySelectOption<T>[];
  groups?: LibrarySelectGroup<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  id?: string;
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  isBottomPlaced: boolean;
  isMobile: boolean;
}

export function LibrarySelect<T extends string | number = string>({
  value,
  onChange,
  options,
  groups,
  placeholder,
  disabled = false,
  className = '',
  ariaLabel,
  id
}: LibrarySelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 280,
    isBottomPlaced: true,
    isMobile: false
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listboxId = useId();

  // Aplanar todas las opciones para navegación de teclado
  const flattenedOptions: LibrarySelectOption<T>[] = React.useMemo(() => {
    if (groups && groups.length > 0) {
      return groups.flatMap((g) => g.options);
    }
    return options || [];
  }, [options, groups]);

  const currentIndex = flattenedOptions.findIndex((opt) => opt.value === value);
  const [focusedIndex, setFocusedIndex] = useState(currentIndex >= 0 ? currentIndex : 0);

  // Obtener etiqueta y elemento seleccionado
  const selectedOption = flattenedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder || String(value || '');
  const SelectedIcon = selectedOption?.icon;

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;

    const estimatedPopoverH = 260;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const isBottomPlaced = spaceBelow >= estimatedPopoverH || spaceBelow >= spaceAbove;

    const availableHeight = isBottomPlaced ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(160, Math.min(320, availableHeight));

    const popoverWidth = Math.max(rect.width, 210);
    let left = rect.left;
    const maxLeft = window.innerWidth - popoverWidth - 12;
    if (left > maxLeft) left = Math.max(12, maxLeft);
    if (left < 12) left = 12;

    if (isBottomPlaced) {
      setCoords({
        top: Math.round(rect.bottom + 6),
        left: Math.round(left),
        width: Math.round(rect.width),
        maxHeight,
        isBottomPlaced: true,
        isMobile
      });
    } else {
      setCoords({
        bottom: Math.round(window.innerHeight - rect.top + 6),
        left: Math.round(left),
        width: Math.round(rect.width),
        maxHeight,
        isBottomPlaced: false,
        isMobile
      });
    }
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    calculateCoords();
    const curIdx = flattenedOptions.findIndex((opt) => opt.value === value);
    setFocusedIndex(curIdx >= 0 ? curIdx : 0);
    setIsOpen(true);
  }, [disabled, calculateCoords, flattenedOptions, value]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const handleSelect = useCallback(
    (nextVal: T) => {
      setIsOpen(false);
      triggerRef.current?.focus();
      if (nextVal !== value) {
        onChange(nextVal);
      }
    },
    [value, onChange]
  );

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      itemRefs.current[focusedIndex]?.focus();
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }, 24);

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
          const next = (prev + 1) % flattenedOptions.length;
          itemRefs.current[next]?.focus();
          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = (prev - 1 + flattenedOptions.length) % flattenedOptions.length;
          itemRefs.current[next]?.focus();
          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
        itemRefs.current[0]?.focus();
        itemRefs.current[0]?.scrollIntoView({ block: 'nearest' });
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        const lastIdx = flattenedOptions.length - 1;
        setFocusedIndex(lastIdx);
        itemRefs.current[lastIdx]?.focus();
        itemRefs.current[lastIdx]?.scrollIntoView({ block: 'nearest' });
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = flattenedOptions[focusedIndex];
        if (opt) {
          handleSelect(opt.value);
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
  }, [isOpen, focusedIndex, closeMenu, handleSelect, calculateCoords, flattenedOptions]);

  const popoverStyle: React.CSSProperties = coords.isMobile
    ? {}
    : {
        ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
        ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
        left: `${coords.left}px`,
        width: `${Math.max(coords.width, 210)}px`
      };

  let globalIndexTracker = 0;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={isOpen ? closeMenu : openMenu}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || displayLabel}
        className={`${className ? className : 'library-select-trigger'} ${isOpen ? 'is-open' : ''}`}
      >
        <span className="flex items-center gap-2 truncate">
          {SelectedIcon && <SelectedIcon className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" />}
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div
              className={`library-select-backdrop ${coords.isMobile ? 'is-mobile-backdrop' : ''}`}
              onClick={closeMenu}
              aria-hidden="true"
            />
            <div
              id={listboxId}
              role="listbox"
              style={popoverStyle}
              className={`library-select-popover ${coords.isMobile ? 'is-mobile-sheet' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {coords.isMobile && (
                <div className="w-10 h-1 rounded-full bg-amber-900/20 dark:bg-slate-700 mx-auto my-1.5" />
              )}
              <div
                tabIndex={-1}
                style={{ maxHeight: `${coords.maxHeight}px` }}
                className="overflow-y-auto overscroll-contain flex flex-col gap-0.5 pr-0.5 focus:outline-none"
              >
                {groups && groups.length > 0 ? (
                  groups.map((group, gIdx) => (
                    <div key={gIdx} className="mb-1 last:mb-0">
                      <div className="library-select-group-header">{group.groupLabel}</div>
                      {group.options.map((opt) => {
                        const optIdx = globalIndexTracker++;
                        const isSelected = opt.value === value;
                        const isFocused = optIdx === focusedIndex;
                        const ItemIcon = opt.icon;

                        return (
                          <button
                            key={String(opt.value)}
                            ref={(el) => {
                              itemRefs.current[optIdx] = el;
                            }}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            tabIndex={isFocused ? 0 : -1}
                            onClick={() => handleSelect(opt.value)}
                            onMouseEnter={() => setFocusedIndex(optIdx)}
                            className={`library-select-item ${isFocused ? 'is-focused' : ''} ${
                              isSelected ? 'is-active' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {ItemIcon && (
                                <ItemIcon className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                              )}
                              <div className="flex flex-col text-left min-w-0">
                                <span className="truncate">{opt.label}</span>
                                {opt.hint && (
                                  <span className="text-[10px] text-stone-500 dark:text-slate-400">
                                    {opt.hint}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400 ml-1.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  flattenedOptions.map((opt, optIdx) => {
                    const isSelected = opt.value === value;
                    const isFocused = optIdx === focusedIndex;
                    const ItemIcon = opt.icon;

                    return (
                      <button
                        key={String(opt.value)}
                        ref={(el) => {
                          itemRefs.current[optIdx] = el;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={isFocused ? 0 : -1}
                        onClick={() => handleSelect(opt.value)}
                        onMouseEnter={() => setFocusedIndex(optIdx)}
                        className={`library-select-item ${isFocused ? 'is-focused' : ''} ${
                          isSelected ? 'is-active' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {ItemIcon && (
                            <ItemIcon className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                          )}
                          <div className="flex flex-col text-left min-w-0">
                            <span className="truncate">{opt.label}</span>
                            {opt.hint && (
                              <span className="text-[10px] text-stone-500 dark:text-slate-400">
                                {opt.hint}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400 ml-1.5" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
