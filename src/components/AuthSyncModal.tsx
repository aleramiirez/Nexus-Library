import React, { useEffect, useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  LogIn,
  UserPlus,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Link2,
  X,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import {
  fetchSupabaseAuthSettings,
  supabase,
  SupabaseAuthSettings,
  getAuthRedirectUrl,
  signInWithGoogle,
  signInWithGitHub
} from '../services/supabaseClient';
import { clearLocalCacheOnSignOut, SyncMigrationResult } from '../db/database';
import { formatAuthErrorMessage, isValidEmail } from '../utils/errorUtils';
import { AppToast } from './AppToast';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const GitHubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface AuthSyncModalProps {
  isOpen: boolean;
  user: User | null;
  syncResult: SyncMigrationResult | null;
  isSyncing: boolean;
  onTriggerSync: () => Promise<void>;
  onClose: () => void;
}

export const AuthSyncModal: React.FC<AuthSyncModalProps> = ({
  isOpen,
  user,
  syncResult,
  isSyncing,
  onTriggerSync,
  onClose
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'link' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [authSettings, setAuthSettings] = useState<SupabaseAuthSettings | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    fetchSupabaseAuthSettings().then(setAuthSettings);
    if (user?.is_anonymous) {
      setMode('link');
    } else {
      setMode('login');
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleGoogleSignIn = async () => {
    setFeedback(null);
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: unknown) {
      setIsGoogleLoading(false);
      setFeedback({
        type: 'error',
        text: formatAuthErrorMessage(
          err,
          'No se pudo conectar con Google en este momento. Inténtalo de nuevo o accede con tu correo.'
        )
      });
    }
  };

  const handleGitHubSignIn = async () => {
    setFeedback(null);
    setIsGitHubLoading(true);
    try {
      const { error } = await signInWithGitHub();
      if (error) throw error;
    } catch (err: unknown) {
      setIsGitHubLoading(false);
      setFeedback({
        type: 'error',
        text: formatAuthErrorMessage(
          err,
          'No se pudo conectar con GitHub en este momento. Inténtalo de nuevo o accede con tu correo.'
        )
      });
    }
  };

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setFeedback({
        type: 'error',
        text: 'Por favor, introduce tu correo electrónico.'
      });
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setFeedback({
        type: 'error',
        text: 'Por favor, introduce una dirección de correo válida (ejemplo: usuario@correo.com).'
      });
      return;
    }

    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: getAuthRedirectUrl()
        });
        if (error) throw error;
        setFeedback({
          type: 'success',
          text: 'Te hemos enviado un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.'
        });
      } catch (err: unknown) {
        setFeedback({
          type: 'error',
          text: formatAuthErrorMessage(
            err,
            'No se pudo enviar el correo de recuperación. Comprueba que el correo exista e inténtalo de nuevo.'
          )
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setFeedback({
        type: 'error',
        text: 'La contraseña debe tener al menos 6 caracteres.'
      });
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (error) throw error;
        if (data.user) {
          setFeedback({
            type: 'success',
            text: '¡Sesión iniciada correctamente! Sincronizando tu biblioteca...'
          });
          setPassword('');
        }
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl()
          }
        });
        if (error) throw error;
        if (data.session) {
          setFeedback({
            type: 'success',
            text: '¡Cuenta creada con éxito! Tus libros se están sincronizando con tu cuenta.'
          });
          setPassword('');
        } else {
          setFeedback({
            type: 'info',
            text: 'Registro completado. Revisa tu correo electrónico para confirmar tu cuenta y después inicia sesión aquí.'
          });
          setMode('login');
        }
      } else if (mode === 'link') {
        const { error } = await supabase.auth.updateUser(
          {
            email: cleanEmail,
            password
          },
          {
            emailRedirectTo: getAuthRedirectUrl()
          }
        );
        if (error) throw error;
        setFeedback({
          type: 'success',
          text: 'Tus libros y sagas se han vinculado correctamente a tu cuenta permanente.'
        });
        setPassword('');
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: formatAuthErrorMessage(err, 'No se pudo completar el acceso. Comprueba tus datos e inténtalo de nuevo.')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setFeedback(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      setFeedback({
        type: 'success',
        text: 'Sesión temporal iniciada. Podrás añadir tu correo en cualquier momento desde Ajustes.'
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: formatAuthErrorMessage(
          err,
          'El acceso sin correo no está disponible en este momento.'
        )
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      await clearLocalCacheOnSignOut();
      await supabase.auth.signOut();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border-t sm:border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden sm:my-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-4 py-3 sm:px-6 sm:py-4 bg-[#f0e5cc] dark:bg-[#101520]">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="font-serif text-xl font-bold">Mi Cuenta</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[calc(92dvh-56px)] sm:max-h-[82vh] overflow-y-auto overscroll-contain">
          <AppToast
            toast={
              feedback
                ? { id: 1, type: feedback.type, message: feedback.text }
                : null
            }
            onDismiss={() => setFeedback(null)}
          />

          {user ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-lg flex items-center justify-center shrink-0">
                  {(user.email || 'L').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5" /> Sesión activa
                  </span>
                  <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">
                    {user.email || 'Lector Invitado'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#f4ead4] dark:bg-[#101520] p-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    Colección en la nube
                  </h3>
                  {syncResult?.synced ? (
                    <p className="text-xs text-stone-700 dark:text-slate-300 mt-1">
                      <strong>{syncResult.totalRemoteBooks}</strong>{' '}
                      {syncResult.totalRemoteBooks === 1 ? 'libro' : 'libros'} y{' '}
                      <strong>{syncResult.totalRemoteSagas}</strong>{' '}
                      {syncResult.totalRemoteSagas === 1 ? 'saga' : 'sagas'} guardados.
                    </p>
                  ) : syncResult?.error ? (
                    <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">{syncResult.error}</p>
                  ) : (
                    <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">Sincronizado con tu cuenta.</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={onTriggerSync}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-3.5 py-2 text-xs transition shrink-0"
                >
                  <RefreshCw className={'w-3.5 h-3.5 ' + (isSyncing ? 'animate-spin' : '')} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
              </div>

              {user.is_anonymous && (
                <div className="space-y-3">
                  <form
                    onSubmit={handleEmailAuth}
                    className="rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-4 space-y-3"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      Guardar colección en una cuenta permanente
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-400">
                      Añade tu correo y contraseña para respaldar tus libros y acceder a ellos desde cualquier dispositivo.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs text-stone-900 dark:text-white"
                      />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña (mín. 6 caracteres)"
                        className="rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs text-stone-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs"
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Guardar cuenta
                    </button>
                  </form>

                  <div className="relative flex items-center justify-center my-1 pt-1">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-amber-900/15 dark:border-[#242E42]" />
                    </div>
                    <span className="relative bg-[#fbf6ea] dark:bg-[#141A26] px-2.5 font-serif italic text-[11px] text-stone-500 dark:text-slate-400">
                      o vincula con
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={isLoading || isGoogleLoading || isGitHubLoading}
                      onClick={handleGoogleSignIn}
                      aria-label="Vincular con Google"
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] hover:bg-amber-500/10 hover:border-amber-600/50 text-stone-800 dark:text-slate-100 font-semibold py-2 px-3 text-xs transition shadow-xs disabled:opacity-50"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      ) : (
                        <GoogleIcon className="w-4 h-4 shrink-0" />
                      )}
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLoading || isGoogleLoading || isGitHubLoading}
                      onClick={handleGitHubSignIn}
                      aria-label="Vincular con GitHub"
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] hover:bg-amber-500/10 hover:border-amber-600/50 text-stone-800 dark:text-slate-100 font-semibold py-2 px-3 text-xs transition shadow-xs disabled:opacity-50"
                    >
                      {isGitHubLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      ) : (
                        <GitHubIcon className="w-4 h-4 shrink-0 text-stone-900 dark:text-white" />
                      )}
                      <span>GitHub</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-amber-900/20 dark:border-[#242E42]">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-4 py-2 text-xs font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Inicia sesión o crea tu cuenta para guardar tu biblioteca en la nube. Tus libros y sagas se sincronizarán de forma segura para que puedas acceder a ellos desde cualquier lugar.
              </p>

              {mode === 'forgot' ? (
                <div className="flex items-center justify-between pb-1">
                  <span className="font-serif text-sm font-bold text-stone-900 dark:text-slate-100">
                    Recuperar Contraseña
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setFeedback(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                  </button>
                </div>
              ) : (
                <div className="flex rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#f0e5cc] dark:bg-[#101520] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setFeedback(null);
                    }}
                    className={
                      'flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ' +
                      (mode === 'login'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                    }
                  >
                    <LogIn className="w-3.5 h-3.5" /> Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setFeedback(null);
                    }}
                    className={
                      'flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ' +
                      (mode === 'signup'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                    }
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Crear Cuenta
                  </button>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="lector@ejemplo.com"
                    className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3.5 py-2.5 text-xs text-stone-900 dark:text-white"
                  />
                </div>
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold">Contraseña</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setMode('forgot');
                            setFeedback(null);
                          }}
                          className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3.5 py-2.5 text-xs text-stone-900 dark:text-white"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 px-4 text-xs shadow-lg transition disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'login'
                    ? 'Entrar a mi biblioteca'
                    : mode === 'signup'
                    ? 'Crear mi cuenta'
                    : 'Enviar enlace de recuperación'}
                </button>
              </form>

              {mode !== 'forgot' && (
                <div className="space-y-3 pt-1">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-amber-900/15 dark:border-[#242E42]" />
                    </div>
                    <span className="relative bg-[#fbf6ea] dark:bg-[#141A26] px-2.5 font-serif italic text-[11px] text-stone-500 dark:text-slate-400">
                      o continúa con
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={isLoading || isGoogleLoading || isGitHubLoading}
                      onClick={handleGoogleSignIn}
                      aria-label="Continuar con Google"
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] hover:bg-amber-500/10 hover:border-amber-600/50 text-stone-800 dark:text-slate-100 font-semibold py-2 px-3 text-xs transition shadow-xs disabled:opacity-50"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                      ) : (
                        <GoogleIcon className="w-4 h-4 shrink-0" />
                      )}
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLoading || isGoogleLoading || isGitHubLoading}
                      onClick={handleGitHubSignIn}
                      aria-label="Continuar con GitHub"
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] hover:bg-amber-500/10 hover:border-amber-600/50 text-stone-800 dark:text-slate-100 font-semibold py-2 px-3 text-xs transition shadow-xs disabled:opacity-50"
                    >
                      {isGitHubLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                      ) : (
                        <GitHubIcon className="w-4 h-4 shrink-0 text-stone-900 dark:text-white" />
                      )}
                      <span>GitHub</span>
                    </button>
                  </div>
                </div>
              )}

              {authSettings?.anonymousEnabled ? (
                <div className="pt-3 border-t border-amber-900/20 dark:border-[#242E42]">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleAnonymousSignIn}
                    className="w-full rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 dark:hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 py-2 px-3 text-xs font-semibold transition"
                  >
                    Continuar como invitado
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ead4]/60 dark:bg-[#101520] p-3.5 text-xs text-stone-600 dark:text-slate-400 leading-relaxed flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <p>
                    Tus lecturas y notas se guardan de forma privada en tu cuenta para que nunca pierdas tu colección.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
