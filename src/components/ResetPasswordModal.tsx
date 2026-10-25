import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, X, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (password.length < 6) {
      setFeedback({
        type: 'error',
        text: 'La nueva contraseña debe tener al menos 6 caracteres.'
      });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        type: 'error',
        text: 'Las contraseñas no coinciden. Por favor, revísalas.'
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) throw error;

      setFeedback({
        type: 'success',
        text: '¡Tu contraseña ha sido actualizada con éxito! Ya puedes acceder con tu nueva clave.'
      });

      // Limpiar el hash de recuperación de la URL para evitar recargas en modo recovery
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      }, 1500);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar la contraseña. El enlace puede haber caducado.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-dialog-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-amber-900/15 dark:border-[#242E42] px-6 py-4 bg-[#f0e5cc]/80 dark:bg-[#101520]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 id="reset-password-dialog-title" className="font-serif text-lg font-bold text-stone-900 dark:text-slate-100">
                Restablecer Contraseña
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400">
                Nexus Library
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido del formulario */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
            Has accedido mediante el enlace de recuperación. Elige una nueva contraseña segura para tu cuenta.
          </p>

          {feedback && (
            <div
              className={
                'rounded-xl border p-3.5 text-xs flex items-start gap-2.5 ' +
                (feedback.type === 'success'
                  ? 'border-emerald-600/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-300'
                  : 'border-rose-600/40 bg-rose-500/15 text-rose-900 dark:text-rose-300')
              }
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              )}
              <span className="leading-relaxed">{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-amber-900/25 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0B0E14]/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 p-1"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full rounded-xl border border-amber-900/25 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0B0E14]/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-amber-900/15 dark:border-[#242E42]">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-xl border border-stone-300 dark:border-slate-700 px-4 py-2.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span>Guardar nueva contraseña</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};
