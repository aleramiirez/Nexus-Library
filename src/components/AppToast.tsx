import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { ToastData } from '../hooks/useAppNotifications';

interface AppToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export const AppToast: React.FC<AppToastProps> = ({ toast, onDismiss }) => {
  if (!toast || typeof document === 'undefined') return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  const borderClass = isSuccess
    ? 'border-emerald-500/40'
    : isError
    ? 'border-rose-500/40'
    : 'border-amber-500/40';

  const iconBadgeClass = isSuccess
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : isError
    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

  return createPortal(
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 inset-x-4 sm:inset-x-auto sm:bottom-6 sm:right-6 z-[9999] max-w-md flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border ${borderClass} bg-[#141A26]/95 text-stone-100 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
    >
      <div
        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${iconBadgeClass}`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : isError ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>

      <div className="flex-1 min-w-0 self-center text-xs sm:text-[13px]">
        {toast.title && (
          <p className="font-bold font-serif text-sm text-stone-100 mb-0.5">
            {toast.title}
          </p>
        )}
        <p className="text-stone-200 leading-relaxed font-normal">{toast.message}</p>

        {toast.action && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="px-3 py-1 rounded-lg text-xs font-sans font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-95 transition cursor-pointer"
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition shrink-0 cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
};
