import React from 'react';

export interface BookFlipValues {
  fromX: string;
  fromY: string;
  fromScale: string;
}

export function getBookFlipValues(bookId?: string | null): BookFlipValues {
  const fallback: BookFlipValues = {
    fromX: '0px',
    fromY: '24px',
    fromScale: '0.28'
  };

  if (typeof window === 'undefined' || typeof document === 'undefined' || !bookId) {
    return fallback;
  }

  // En móvil o usuarios con preferencia de movimiento reducido usamos animación nativa sin cálculo FLIP
  if (
    window.innerWidth < 768 ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  ) {
    return fallback;
  }

  let sourceEl: Element | null = null;
  try {
    const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(bookId) : bookId.replace(/"/g, '\\"');
    const container = document.querySelector(`[data-book-id="${escapedId}"]`);
    sourceEl = container ? (container.querySelector('.book-cover') || container) : null;
  } catch {
    sourceEl = null;
  }

  if (!sourceEl) return fallback;

  const rect = sourceEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return fallback;

  // Si la tarjeta o libro de origen está fuera de los límites visibles de la pantalla,
  // usar la animación fallback centrada para evitar que la animación salga disparada hacia fuera del viewport
  const isOutOfViewport =
    rect.bottom < -60 ||
    rect.top > window.innerHeight + 60 ||
    rect.right < -60 ||
    rect.left > window.innerWidth + 60;

  if (isOutOfViewport) return fallback;

  const stageWidth = Math.min(window.innerWidth - 48, 1024);
  const closedBookWidth = stageWidth * 0.5;

  const fromX = rect.left + rect.width / 2 - window.innerWidth / 2;
  const fromY = rect.top + rect.height / 2 - window.innerHeight / 2;
  const fromScale = Math.max(0.18, Math.min(0.75, rect.width / closedBookWidth));

  return {
    fromX: `${Math.round(fromX)}px`,
    fromY: `${Math.round(fromY)}px`,
    fromScale: fromScale.toFixed(3)
  };
}

/**
 * Calcula las variables CSS (--from-x, --from-y, --from-scale) desde la coordenada exacta
 * del libro en la estantería o tarjeta hasta el centro del viewport.
 */
export function computeBookFlipVars(bookId?: string | null): React.CSSProperties {
  const { fromX, fromY, fromScale } = getBookFlipValues(bookId);
  return {
    '--from-x': fromX,
    '--from-y': fromY,
    '--from-scale': fromScale
  } as React.CSSProperties;
}

/**
 * Escribe directamente las coordenadas FLIP en el nodo DOM sin provocar un re-render de React.
 */
export function applyBookFlipVarsToElement(
  el: HTMLElement | null,
  bookId?: string | null
): void {
  if (!el) return;
  const { fromX, fromY, fromScale } = getBookFlipValues(bookId);
  el.style.setProperty('--from-x', fromX);
  el.style.setProperty('--from-y', fromY);
  el.style.setProperty('--from-scale', fromScale);
}
