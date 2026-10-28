import React from 'react';
import '../book-sidebar.css';
import {
  LayoutDashboard,
  Library,
  Compass,
  Layers,
  BarChart3,
  Trophy,
  Settings,
  Bookmark,
  BookMarked,
  BookmarkCheck,
  Clock,
  PauseCircle,
  User as UserIcon,
  X,
  Mail,
  Download,
  Smartphone,
  type LucideIcon
} from 'lucide-react';
import { BookmarkMarker } from './BookmarkMarker';
import { pwaInstallService } from '../services/pwaInstallService';

export type NavigationSection =
  | 'dashboard'
  | 'library'
  | 'discover'
  | 'shelf-unread'
  | 'shelf-reading'
  | 'shelf-paused'
  | 'shelf-read'
  | 'collections'
  | 'sagas'
  | 'stats'
  | 'settings';

interface BookSidebarProps {
  activeSection: NavigationSection;
  onNavigate: (section: NavigationSection) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onOpenImport?: () => void;
  onLeaveGuestMode: () => void;
  metrics: { total: number; reading: number; unread: number; paused: number; read: number };
  collectionsCount?: number;
  sagasCount: number;
  hasUser: boolean;
  userEmail?: string | null;
  userDisplayName?: string | null;
  username?: string | null;
  userInitial: string;
  isSyncing: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  inboxUnreadCount?: number;
  onOpenInbox?: () => void;
  onOpenInstallModal?: () => void;
}

interface NavItemProps {
  id: NavigationSection;
  label: string;
  icon: LucideIcon;
  iconClass?: string;
  count?: number;
  active: boolean;
  onSelect: (id: NavigationSection) => void;
}

const NavItem: React.FC<NavItemProps> = ({
  id,
  label,
  icon: Icon,
  iconClass = '',
  count,
  active,
  onSelect
}) => (
  <button
    type="button"
    onClick={() => onSelect(id)}
    aria-current={active ? 'page' : undefined}
    className={
      'book-item relative w-full flex items-center gap-2.5 pl-4 pr-3 py-1.5 rounded-md transition ' +
      (active
        ? 'book-item-active text-amber-800 dark:text-amber-300 font-semibold'
        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-100 hover:bg-amber-500/5')
    }
  >
    {active && <BookmarkMarker />}
    <Icon className={'w-4 h-4 shrink-0 ' + iconClass} />
    <span className="font-serif text-[14.5px] font-semibold tracking-wide whitespace-nowrap">
      {label}
    </span>
    {count !== undefined && (
      <>
        <span
          aria-hidden="true"
          className="flex-1 min-w-[10px] mx-1 border-b border-dotted border-current opacity-30 translate-y-[3px]"
        />
        <span className="font-serif text-[14.5px] font-semibold tabular-nums">{count}</span>
      </>
    )}
  </button>
);

const Chapter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 px-3 pt-3.5 pb-1">
    <span className="font-serif italic text-[12.5px] text-amber-700 dark:text-amber-500/90 whitespace-nowrap">
      {children}
    </span>
    <span className="h-px flex-1 bg-gradient-to-r from-amber-600/40 to-transparent" />
  </div>
);

/**
 * Menú lateral con aspecto de página izquierda de un libro abierto:
 * canto de páginas, pliegue central, índice con puntos guía y marcapáginas.
 * En escritorio es fijo; en móvil se despliega como cajón lateral (drawer).
 */
const BookSidebarComponent: React.FC<BookSidebarProps> = ({
  activeSection,
  onNavigate,
  darkMode,
  onToggleTheme,
  onOpenAuth,
  onLeaveGuestMode,
  metrics,
  collectionsCount = 0,
  sagasCount,
  hasUser,
  userEmail,
  userDisplayName,
  username,
  userInitial,
  isSyncing,
  mobileOpen = false,
  onCloseMobile,
  inboxUnreadCount = 0,
  onOpenInbox,
  onOpenInstallModal
}) => {
  const [isStandalone, setIsStandalone] = React.useState<boolean>(
    () => pwaInstallService.getState().isStandalone
  );

  React.useEffect(() => {
    const unsub = pwaInstallService.subscribe((state) => setIsStandalone(state.isStandalone));
    return unsub;
  }, []);

  const handleSelectSection = (id: NavigationSection) => {
    onNavigate(id);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Fondo oscurecido al abrir el libro en móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={
          'book-page fixed inset-y-0 left-0 z-50 lg:z-30 w-72 sm:w-64 flex flex-col transition-transform duration-300 ease-out ' +
          (mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0')
        }
      >
        {/* Canto de las páginas (borde exterior) y pliegue central (borde interior) */}
        <div className="book-edges" aria-hidden="true" />
        <div className="book-fold" aria-hidden="true" />

        <div className="relative flex flex-col h-full pl-2">
          {/* Cabecera */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/logo.svg"
                alt="Nexus Library Logo"
                className="w-10 h-10 shrink-0 drop-shadow-sm"
              />
              <div className="min-w-0">
                <span className="font-serif font-bold leading-none block tracking-[0.1em] text-stone-900 dark:text-slate-100">
                  <span className="text-3xl text-amber-600 dark:text-amber-400">N</span>
                  <span className="text-lg">EXUS</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400 font-semibold">
                  Library
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isStandalone && onOpenInstallModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenInstallModal();
                    onCloseMobile?.();
                  }}
                  title="Instalar App en tu dispositivo"
                  aria-label="Instalar App"
                  className="p-2 rounded-lg border border-stone-300 dark:border-[#283246] text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10 transition group"
                >
                  <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onOpenInbox?.();
                  onCloseMobile?.();
                }}
                title={
                  inboxUnreadCount > 0
                    ? `Buzón Literario (${inboxUnreadCount} novedad${inboxUnreadCount > 1 ? 'es' : ''})`
                    : 'Buzón Literario'
                }
                aria-label="Abrir Buzón Literario"
                className="relative p-2 rounded-lg border border-stone-300 dark:border-[#283246] text-stone-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/40 transition group"
              >
                <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {inboxUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] leading-none flex items-center justify-center shadow-sm animate-pulse ring-2 ring-[#f7f0df] dark:ring-[#080C15]">
                    {inboxUnreadCount > 9 ? '9+' : inboxUnreadCount}
                  </span>
                )}
              </button>
              {onCloseMobile && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Cerrar menú"
                  className="lg:hidden p-2 rounded-lg border border-stone-300 dark:border-[#283246] text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Adorno */}
          <div className="mx-6 mb-1.5 flex items-center gap-2 text-amber-600/70" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-600/50" />
            <span className="text-[9px]">◆</span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-600/50" />
          </div>

          {/* Índice */}
          <nav className="flex-1 pl-3 pr-3 overflow-y-auto overflow-x-hidden no-scrollbar" aria-label="Índice">
            <p className="px-3 pt-1.5 pb-1 font-serif italic text-[11px] tracking-[0.3em] uppercase text-stone-400 dark:text-slate-500">
              Índice
            </p>

            <NavItem
              id="dashboard"
              label="Inicio"
              icon={LayoutDashboard}
              active={activeSection === 'dashboard'}
              onSelect={handleSelectSection}
            />
            <NavItem
              id="library"
              label="Mi Biblioteca"
              icon={Library}
              count={metrics.total}
              active={activeSection === 'library'}
              onSelect={handleSelectSection}
            />
            <NavItem
              id="discover"
              label="Descubrir Libros"
              icon={Compass}
              active={activeSection === 'discover'}
              onSelect={handleSelectSection}
            />

            <Chapter>Estanterías de lectura</Chapter>
            <NavItem
              id="shelf-reading"
              label="Leyendo"
              icon={Clock}
              iconClass="text-amber-500"
              count={metrics.reading}
              active={activeSection === 'shelf-reading'}
              onSelect={handleSelectSection}
            />
            <NavItem
              id="shelf-unread"
              label="Por leer"
              icon={BookMarked}
              iconClass="text-slate-400"
              count={metrics.unread}
              active={activeSection === 'shelf-unread'}
              onSelect={handleSelectSection}
            />
            <NavItem
              id="shelf-paused"
              label="Pausados"
              icon={PauseCircle}
              iconClass="text-rose-400"
              count={metrics.paused}
              active={activeSection === 'shelf-paused'}
              onSelect={handleSelectSection}
            />
            <NavItem
              id="shelf-read"
              label="Leídos"
              icon={BookmarkCheck}
              iconClass="text-emerald-500"
              count={metrics.read}
              active={activeSection === 'shelf-read'}
              onSelect={handleSelectSection}
            />

            <Chapter>Colección y Análisis</Chapter>
            <NavItem
              id="collections"
              label="Colecciones"
              icon={Bookmark}
              count={collectionsCount}
              active={activeSection === 'collections'}
              onSelect={handleSelectSection}
            />
            <NavItem
              id="sagas"
              label="Sagas"
              icon={Layers}
              count={sagasCount}
              active={activeSection === 'sagas'}
              onSelect={handleSelectSection}
            />
            <NavItem
              id="stats"
              label="Reto & Estadísticas"
              icon={Trophy}
              active={activeSection === 'stats'}
              onSelect={handleSelectSection}
            />
          </nav>

          {/* Pie de página unificado: Perfil y Ajustes */}
          <div className="p-2.5 pr-4 border-t border-amber-600/20">
            <button
              type="button"
              onClick={() => handleSelectSection('settings')}
              aria-label="Ajustes de la biblioteca y cuenta"
              className={
                'w-full flex items-center gap-2.5 rounded-xl border p-2 text-left transition group ' +
                (activeSection === 'settings'
                  ? 'border-amber-600/70 bg-amber-500/20 shadow-sm'
                  : 'border-stone-300 dark:border-[#283246] bg-white/40 dark:bg-[#151C2B] hover:border-amber-500/50 hover:bg-amber-500/5')
              }
            >
              {hasUser ? (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                  {userDisplayName ? userDisplayName.charAt(0).toUpperCase() : userInitial}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-stone-800 dark:text-slate-100">
                  {hasUser
                    ? (userDisplayName || userEmail || 'Mi Cuenta')
                    : (userDisplayName || 'Lector Invitado')}
                </p>
                <div className="flex items-center gap-1.5 text-[10px]">
                  {hasUser ? (
                    isSyncing ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-amber-700 dark:text-amber-400 font-medium">Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium truncate">
                          {username ? `@${username}` : 'Nube al día'}
                        </span>
                      </>
                    )
                  ) : (
                    <span className="text-stone-500 dark:text-slate-400">Toca para crear cuenta</span>
                  )}
                </div>
              </div>

              <div
                className={
                  'p-1.5 rounded-lg transition shrink-0 ' +
                  (activeSection === 'settings'
                    ? 'text-amber-800 dark:text-amber-300 bg-amber-500/20'
                    : 'text-stone-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400')
                }
                title="Ajustes de la Biblioteca"
              >
                <Settings className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Sombra del pliegue sobre la página derecha (el contenido) */}
      <div className="book-gutter hidden lg:block" aria-hidden="true" />
    </>
  );
};

export const BookSidebar = React.memo(BookSidebarComponent);
