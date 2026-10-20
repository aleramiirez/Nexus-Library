import React from 'react';
import '../book-sidebar.css';
import {
  LayoutDashboard,
  Library,
  Layers,
  BarChart3,
  Plus,
  Sun,
  Moon,
  BookMarked,
  BookmarkCheck,
  Clock,
  PauseCircle,
  LogIn,
  HardDrive,
  type LucideIcon
} from 'lucide-react';

export type NavigationSection =
  | 'dashboard'
  | 'library'
  | 'shelf-unread'
  | 'shelf-reading'
  | 'shelf-paused'
  | 'shelf-read'
  | 'sagas'
  | 'stats';

interface BookSidebarProps {
  activeSection: NavigationSection;
  onNavigate: (section: NavigationSection) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onAddBook: () => void;
  onOpenAuth: () => void;
  onOpenImport: () => void;
  onLeaveGuestMode: () => void;
  metrics: { total: number; reading: number; unread: number; paused: number; read: number };
  sagasCount: number;
  hasUser: boolean;
  userEmail?: string | null;
  userInitial: string;
  isSyncing: boolean;
}

interface NavItemProps {
  id: NavigationSection;
  label: string;
  icon: LucideIcon;
  iconClass?: string;
  count?: number;
}

/**
 * Menú lateral con aspecto de página izquierda de un libro abierto:
 * canto de páginas, pliegue central, índice con puntos guía y marcapáginas.
 * Los estilos "book-*" están en book-sidebar.css.
 */
export const BookSidebar: React.FC<BookSidebarProps> = ({
  activeSection,
  onNavigate,
  darkMode,
  onToggleTheme,
  onAddBook,
  onOpenAuth,
  onOpenImport,
  onLeaveGuestMode,
  metrics,
  sagasCount,
  hasUser,
  userEmail,
  userInitial,
  isSyncing
}) => {
  const NavItem: React.FC<NavItemProps> = ({ id, label, icon: Icon, iconClass = '', count }) => {
    const active = activeSection === id;
    return (
      <button
        type="button"
        onClick={() => onNavigate(id)}
        aria-current={active ? 'page' : undefined}
        className={
          'book-item relative w-full flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-md transition ' +
          (active
            ? 'book-item-active text-amber-700 dark:text-amber-300'
            : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-100 hover:bg-amber-500/5')
        }
      >
        {active && <span className="book-ribbon" aria-hidden="true" />}
        <Icon className={'w-4 h-4 shrink-0 ' + iconClass} />
        <span className="font-serif text-[15px] font-semibold tracking-wide whitespace-nowrap">
          {label}
        </span>
        {count !== undefined && (
          <>
            <span
              aria-hidden="true"
              className="flex-1 min-w-[10px] mx-1 border-b border-dotted border-current opacity-30 translate-y-[3px]"
            />
            <span className="font-serif text-[15px] font-semibold tabular-nums">{count}</span>
          </>
        )}
      </button>
    );
  };

  const Chapter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-2 px-3 pt-5 pb-1.5">
      <span className="font-serif italic text-[13px] text-amber-700 dark:text-amber-500/90 whitespace-nowrap">
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-amber-600/40 to-transparent" />
    </div>
  );

  return (
    <>
      <aside className="book-page hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        {/* Canto de las páginas (borde exterior) y pliegue central (borde interior) */}
        <div className="book-edges" aria-hidden="true" />
        <div className="book-fold" aria-hidden="true" />

        <div className="relative flex flex-col h-full pl-2">
          {/* Cabecera */}
          <div className="px-6 pt-5 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.jpg"
                alt="Nexus Library Logo"
                className="w-10 h-10 rounded-xl object-cover shadow-md border border-amber-500/30"
              />
              <div>
                <span className="font-serif font-bold leading-none block tracking-[0.1em] text-stone-900 dark:text-slate-100">
                  <span className="text-3xl text-amber-600 dark:text-amber-400">N</span>
                  <span className="text-lg">EXUS</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400 font-semibold">
                  Library
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              title="Cambiar tema claro/oscuro"
              className="p-2 rounded-lg border border-stone-300 dark:border-[#283246] text-stone-500 dark:text-slate-400 hover:text-amber-500 transition"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Adorno */}
          <div className="mx-6 flex items-center gap-2 text-amber-600/70" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-600/50" />
            <span className="text-[9px]">◆</span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-600/50" />
          </div>

          <div className="p-4 pb-2">
            <button
              type="button"
              onClick={onAddBook}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 px-4 text-xs shadow-lg transition"
            >
              <Plus className="w-4 h-4" /> Añadir libro
            </button>
          </div>

          {/* Índice */}
          <nav className="flex-1 px-3 overflow-y-auto" aria-label="Índice">
            <p className="px-3 pt-2 font-serif italic text-[11px] tracking-[0.3em] uppercase text-stone-400 dark:text-slate-500">
              Índice
            </p>

            <NavItem id="dashboard" label="Inicio" icon={LayoutDashboard} />
            <NavItem id="library" label="Mi Biblioteca" icon={Library} count={metrics.total} />

            <Chapter>Estanterías de lectura</Chapter>
            <NavItem
              id="shelf-reading"
              label="Leyendo"
              icon={Clock}
              iconClass="text-amber-500"
              count={metrics.reading}
            />
            <NavItem
              id="shelf-unread"
              label="Por leer"
              icon={BookMarked}
              iconClass="text-slate-400"
              count={metrics.unread}
            />
            <NavItem
              id="shelf-paused"
              label="Pausados"
              icon={PauseCircle}
              iconClass="text-rose-400"
              count={metrics.paused}
            />
            <NavItem
              id="shelf-read"
              label="Leídos"
              icon={BookmarkCheck}
              iconClass="text-emerald-500"
              count={metrics.read}
            />

            <Chapter>Colección y Análisis</Chapter>
            <NavItem id="sagas" label="Sagas" icon={Layers} count={sagasCount} />
            <NavItem id="stats" label="Estadísticas" icon={BarChart3} />
          </nav>

          {/* Pie de página */}
          <div className="p-4 pr-6 border-t border-amber-600/20 space-y-2.5">
            {hasUser ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full flex items-center gap-2.5 rounded-xl border border-stone-300 dark:border-[#283246] bg-white/40 dark:bg-[#151C2B] hover:border-amber-500/40 p-2.5 text-left transition"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-sm flex items-center justify-center shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-stone-800 dark:text-slate-100">
                    {userEmail || 'Lector Invitado'}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {isSyncing ? 'Sincronizando...' : 'Nube sincronizada'}
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLeaveGuestMode}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 py-2 px-3 text-xs font-semibold transition"
              >
                <LogIn className="w-3.5 h-3.5" /> Iniciar Sesión / Cuenta
              </button>
            )}

            <button
              type="button"
              onClick={onOpenImport}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-[#283246] bg-white/40 dark:bg-[#161D2B] hover:border-amber-500/40 text-stone-600 dark:text-slate-300 py-2 px-3 text-xs font-semibold transition"
            >
              <HardDrive className="w-3.5 h-3.5" /> Copias de Seguridad
            </button>
          </div>
        </div>
      </aside>

      {/* Sombra del pliegue sobre la página derecha (el contenido) */}
      <div className="book-gutter hidden lg:block" aria-hidden="true" />
    </>
  );
};
