import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BookOpen, RefreshCw, Trash2, ChevronDown } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Nexus ErrorBoundary] Error no controlado en la aplicación:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReset = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.warn('Error limpiando caché:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f7f0df] dark:bg-[#080C15] text-stone-900 dark:text-slate-100 font-sans">
          <div className="max-w-md w-full bg-[#fbf6ea] dark:bg-[#111726] border-2 border-amber-900/25 dark:border-amber-500/25 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
            {/* Resplandor áureo sutil */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-amber-600/10 blur-2xl pointer-events-none" />

            {/* Icono central de libro */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-600/30 flex items-center justify-center shadow-inner text-amber-800 dark:text-amber-400">
              <BookOpen className="w-8 h-8 stroke-[1.75]" />
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                Nexus Library
              </p>
              <h2 className="font-serif text-2xl font-black text-stone-900 dark:text-amber-100 tracking-tight">
                Un pergamino ilegible ha detenido el flujo
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Se ha producido un conflicto inesperado al procesar la vista. <strong>Tus libros, citas y lecturas guardadas en este dispositivo están totalmente a salvo</strong> en la base de datos local.
              </p>
            </div>

            {/* Botones de recuperación */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-md transition active:scale-98 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                Reabrir Santuario
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 hover:bg-stone-200/50 dark:hover:bg-slate-800/50 text-stone-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-stone-500" />
                Limpiar Caché PWA y Recargar
              </button>
            </div>

            {/* Detalles técnicos plegables para soporte */}
            {this.state.error && (
              <details className="text-left text-[11px] border border-amber-900/15 dark:border-slate-800 rounded-lg p-2.5 bg-white/40 dark:bg-black/30">
                <summary className="cursor-pointer font-mono font-medium text-stone-500 dark:text-slate-400 select-none flex items-center justify-between">
                  <span>Detalles del error</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </summary>
                <div className="mt-2 font-mono text-[10px] text-red-700 dark:text-red-400 overflow-x-auto p-1 max-h-32">
                  <p className="font-bold">{this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-1 text-[9px] text-stone-500 dark:text-slate-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
