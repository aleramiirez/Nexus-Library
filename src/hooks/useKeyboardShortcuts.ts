import { useEffect } from 'react';
import { NavigationSection } from '../components/BookSidebar';

export interface UseKeyboardShortcutsOptions {
  activeSection: NavigationSection;
  onNavigate: (section: NavigationSection) => void;
  isAnyModalOpen: boolean;
  onCloseModalsByEscape: () => void;
  onOpenCreateBook: () => void;
  onOpenOracle: () => void;
  onStartReadingSession: () => void;
  setDiscoverInitialTab?: (tab: 'books' | 'atlas') => void;
  onCloseBookDetail?: () => void;
}

/**
 * Hook global de atajos de teclado para navegación y acciones rápidas en Nexus Library:
 * - '/' o 'Ctrl+K' / 'Cmd+K': Búsqueda rápida contextual
 * - 'Escape': Desenfocar campos de texto o cerrar modales abiertos
 * - 'n' / 'N': Añadir nuevo libro
 * - 'o' / 'O': Abrir el Oráculo Literario
 * - 's' / 'S': Iniciar sesión de lectura del libro en curso
 * - '1' a '7': Navegación directa entre secciones principales
 */
export function useKeyboardShortcuts({
  activeSection,
  onNavigate,
  isAnyModalOpen,
  onCloseModalsByEscape,
  onOpenCreateBook,
  onOpenOracle,
  onStartReadingSession,
  setDiscoverInitialTab,
  onCloseBookDetail
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;

      // 1. Detectar si el usuario está escribiendo en un campo editable
      const isInputActive = Boolean(
        (target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)) ||
          (activeEl &&
            (activeEl.tagName === 'INPUT' ||
              activeEl.tagName === 'TEXTAREA' ||
              activeEl.tagName === 'SELECT' ||
              activeEl.isContentEditable))
      );

      // Si el usuario está dentro de un campo de texto:
      if (isInputActive) {
        if (event.key === 'Escape') {
          // Desenfoca para salir cómodamente del input
          (activeEl || target)?.blur();
          return;
        }

        // Permitir atajo universal Ctrl+K / Cmd+K incluso desde un input
        const isCtrlK =
          (event.ctrlKey || event.metaKey) &&
          (event.key === 'k' || event.key === 'K');
        if (!isCtrlK) {
          // Ignorar todos los demás atajos de una sola tecla
          return;
        }
      }

      // 3. Atajo de Búsqueda Rápida (/ o Ctrl+K / Cmd+K)
      const isCtrlK =
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'k' || event.key === 'K');
      const isSlash =
        event.key === '/' &&
        !isInputActive &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey;

      if (isCtrlK || isSlash) {
        event.preventDefault();

        if (activeSection === 'discover') {
          const el = document.getElementById('discover-search-input') as HTMLInputElement | null;
          if (el) {
            el.focus();
            el.select();
            return;
          }
        } else if (activeSection === 'community') {
          const el = (document.getElementById('community-shelf-search-input') ||
            document.getElementById('community-search-input')) as HTMLInputElement | null;
          if (el) {
            el.focus();
            el.select();
            return;
          }
        }

        // En cualquier otro caso: ir a Biblioteca, cerrar detalle si estaba abierto,
        // asegurar pestaña 'books' y enfocar input de búsqueda de LibraryView
        if (activeSection !== 'library') {
          onNavigate('library');
        }
        onCloseBookDetail?.();

        // Asegurar que la sub-pestaña de LibraryView sea 'books'
        window.dispatchEvent(new CustomEvent('nexus-set-library-tab-books'));
        try {
          sessionStorage.setItem('nexus_library_tab', 'books');
          const url = new URL(window.location.href);
          url.searchParams.delete('tab');
          window.history.replaceState({}, '', url.toString());
        } catch {
          // ignorar
        }

        const focusSearch = () => {
          const el = document.getElementById('library-search-input') as HTMLInputElement | null;
          if (el) {
            el.focus();
            el.select();
            return true;
          }
          return false;
        };

        if (!focusSearch()) {
          setTimeout(focusSearch, 50);
          setTimeout(focusSearch, 150);
        }
        return;
      }

      // 2. Si hay un modal abierto, no disparar atajos de acción ni navegación
      if (isAnyModalOpen) {
        if (event.key === 'Escape') {
          onCloseModalsByEscape();
        }
        return;
      }

      // Escape cuando no hay modales abiertos
      if (event.key === 'Escape') {
        onCloseModalsByEscape();
        return;
      }

      // Ignorar si hay teclas modificadoras pulsadas para no colisionar con atajos del sistema
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // 4. Atajos de Acción Rápida (cuando no se está en un input ni hay modales)
      const keyLower = event.key.toLowerCase();
      if (keyLower === 'n') {
        event.preventDefault();
        onOpenCreateBook();
        return;
      }
      if (keyLower === 'o') {
        event.preventDefault();
        onOpenOracle();
        return;
      }
      if (keyLower === 's') {
        event.preventDefault();
        onStartReadingSession();
        return;
      }

      // 5. Atajos de Navegación por Secciones (1 a 7)
      switch (event.key) {
        case '1':
          event.preventDefault();
          onNavigate('dashboard');
          break;
        case '2':
          event.preventDefault();
          onNavigate('library');
          break;
        case '3':
          event.preventDefault();
          onNavigate('sagas');
          break;
        case '4':
          event.preventDefault();
          setDiscoverInitialTab?.('books');
          try {
            sessionStorage.setItem('nexus_discover_tab', 'books');
            const url = new URL(window.location.href);
            url.searchParams.delete('tab');
            window.history.replaceState({}, '', url.toString());
          } catch {}
          onNavigate('discover');
          break;
        case '5':
          event.preventDefault();
          onNavigate('stats');
          break;
        case '6':
          event.preventDefault();
          setDiscoverInitialTab?.('atlas');
          try {
            sessionStorage.setItem('nexus_discover_tab', 'atlas');
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'atlas');
            window.history.replaceState({}, '', url.toString());
          } catch {}
          onNavigate('discover');
          break;
        case '7':
          event.preventDefault();
          onNavigate('community');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSection,
    onNavigate,
    isAnyModalOpen,
    onCloseModalsByEscape,
    onOpenCreateBook,
    onOpenOracle,
    onStartReadingSession,
    setDiscoverInitialTab,
    onCloseBookDetail
  ]);
}
