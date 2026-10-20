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
  X
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import {
  fetchSupabaseAuthSettings,
   supabase,
  SupabaseAuthSettings
} from '../services/supabaseClient';
import { clearLocalCacheOnSignOut, SyncMigrationResult } from '../db/database';

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
  const [mode, setMode] = useState<'login' | 'signup' | 'link'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || password.length < 6) {
      setFeedback({
        type: 'error',
        text: 'Introduce un correo válido y una contraseña de al menos 6 caracteres.'
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
            text: 'Sesión iniciada correctamente. Sincronizando y verificando datos con Supabase...'
          });
          setPassword('');
        }
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password
        });
        if (error) throw error;
        if (data.session) {
          setFeedback({
            type: 'success',
            text: 'Cuenta creada y sesión activa. Tus libros locales se están migrando a Supabase.'
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
        const { error } = await supabase.auth.updateUser({
          email: cleanEmail,
          password
        });
        if (error) throw error;
        setFeedback({
          type: 'success',
          text: 'Solicitud de vinculación enviada. Tus libros y sagas permanecerán asociados a tu identificador de usuario actual.'
        });
        setPassword('');
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'No se pudo completar la autenticación con Supabase.'
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
        text: 'Sesión anónima iniciada en Supabase. Puedes vincularla a un correo permanente cuando quieras.'
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Las sesiones anónimas no están habilitadas en este proyecto de Supabase.'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-6 py-4 bg-[#f0e5cc] dark:bg-[#101520]">
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

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {feedback && (
            <div
              className={
                'rounded-xl border p-3.5 text-xs flex items-start gap-2.5 ' +
                (feedback.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : feedback.type === 'error'
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200')
              }
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

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
                <form
                  onSubmit={handleEmailAuth}
                  className="rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-4 space-y-3"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Vincular sesión anónima a cuenta permanente
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400">
                    Convierte tu usuario anónimo actual en una cuenta con correo y contraseña sin
                    perder ninguno de los libros o sagas ya asociados a tu <code>user_id</code>.
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
                    Vincular cuenta permanente
                  </button>
                </form>
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
                Inicia sesión o crea una cuenta para activar la persistencia en la nube con{' '}
                <strong>Supabase</strong>. Al autenticarte, los libros y sagas que tengas en
                IndexedDB local se migrarán automáticamente a tu cuenta sin duplicados y sin borrar
                tu copia local.
              </p>

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

              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="lector@ejemplo.com"
                    className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3.5 py-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3.5 py-2.5 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 px-4 text-xs shadow-lg transition disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'login' ? 'Entrar y sincronizar biblioteca' : 'Crear cuenta en Supabase'}
                </button>
              </form>

              {authSettings?.anonymousEnabled ? (
                <div className="pt-3 border-t border-amber-900/20 dark:border-[#242E42]">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleAnonymousSignIn}
                    className="w-full rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 dark:hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 py-2 px-3 text-xs font-semibold transition"
                  >
                    Continuar con sesión anónima en la nube
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4] dark:bg-[#101520] p-3 text-[11px] text-stone-600 dark:text-slate-400 leading-relaxed">
                  <strong>Nota sobre autenticación:</strong> Las sesiones anónimas están
                  deshabilitadas actualmente en la configuración de este proyecto Supabase (
                  <code>anonymous_users: false</code>). Inicia sesión con correo y contraseña para
                  guardar tus libros bajo políticas RLS (<code>auth.uid() = user_id</code>).
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
