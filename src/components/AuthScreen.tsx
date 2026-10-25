import React, { useEffect, useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Cloud,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Library,
  KeyRound
} from 'lucide-react';
import {
  fetchSupabaseAuthSettings,
  supabase,
  SupabaseAuthSettings,
  getAuthRedirectUrl
} from '../services/supabaseClient';
import { AnimatedBackground } from './AnimatedBackground';

interface AuthScreenProps {
  onContinueOffline: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onContinueOffline }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authSettings, setAuthSettings] = useState<SupabaseAuthSettings | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchSupabaseAuthSettings().then(setAuthSettings);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFeedback({ type: 'error', text: 'Por favor, introduce tu correo electrónico.' });
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
          text: 'Te hemos enviado un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o la carpeta de spam.'
        });
      } catch (err: unknown) {
        let msg = 'No se pudo enviar el correo de recuperación. Inténtalo de nuevo.';
        if (err instanceof Error) {
          const raw = err.message.toLowerCase();
          if (raw.includes('rate limit')) {
            msg = 'Has solicitado varios correos en poco tiempo. Por seguridad, espera unos minutos o revisa si ya recibiste un correo anterior en tu bandeja de entrada o spam.';
          } else if (raw.includes('user not found')) {
            msg = 'No se ha encontrado ninguna cuenta asociada a este correo electrónico.';
          } else {
            msg = err.message;
          }
        }
        setFeedback({
          type: 'error',
          text: msg
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
    if (mode === 'signup' && password !== confirmPassword) {
      setFeedback({
        type: 'error',
        text: 'Las contraseñas no coinciden.'
      });
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error('El correo o la contraseña no son correctos.');
          }
          if (error.message.toLowerCase().includes('email not confirmed')) {
            throw new Error(
              'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o desactiva la confirmación de email en tu panel.'
            );
          }
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl()
          }
        });
        if (error) throw error;

        if (!data.session) {
          setFeedback({
            type: 'info',
            text: ' ¡Cuenta creada! Te hemos enviado un enlace de confirmación a tu correo. Confírmalo e inicia sesión aquí.'
          });
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'No se pudo completar el acceso. Inténtalo de nuevo.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    if (authSettings?.anonymousEnabled) {
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.signInAnonymously();
        if (!error) return;
      } catch {
        // fallback to local mode
      } finally {
        setIsLoading(false);
      }
    }
    onContinueOffline();
  };

  return (
    <div className="min-h-screen flex bg-[#f7f0df] dark:bg-[#080C15] text-stone-900 dark:text-slate-100 selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-amber-200 relative overflow-hidden">
      {/* Ilustración de fondo ambiental */}
      <img
        src="/hero-library.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover object-center opacity-20 dark:opacity-25 scale-105"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#f7f0df]/95 via-[#f7f0df]/85 to-[#efe4cb]/92 dark:from-[#080C15]/95 dark:via-[#080C15]/80 dark:to-[#080C15]/90" />

      {/* Constelaciones y motas de polvo animadas */}
      <AnimatedBackground />

      {/* Luces ambientales de fondo */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-amber-600/15 dark:bg-amber-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-[#8b2433]/15 dark:bg-[#6E1E2A]/20 blur-[140px]" />

      <div className="w-full max-w-6xl mx-auto my-auto p-4 sm:p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
        {/* Columna Izquierda: Presentación Editorial */}
        <div className="lg:col-span-7 space-y-6 pr-0 lg:pr-6">
          <div className="inline-flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Nexus Library Logo"
              className="w-12 h-12 shrink-0 drop-shadow-md"
            />
            <div>
              <span className="font-serif font-bold tracking-wider block leading-none text-stone-900 dark:text-white">
                <span className="text-3xl text-amber-700 dark:text-amber-400">N</span>
                <span className="text-xl">EXUS</span>
              </span>
              <span className="text-[11px] uppercase tracking-[0.28em] text-amber-700 dark:text-amber-400 font-semibold">
                Personal Library
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/30 dark:border-amber-500/30 bg-amber-600/10 dark:bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Sparkles className="w-3.5 h-3.5" /> Tu refugio literario digital
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 dark:text-white leading-[1.08]">
              Toda tu colección de libros,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8b2433] via-amber-700 to-amber-600 dark:from-amber-300 dark:via-amber-400 dark:to-amber-600 italic">
                siempre contigo.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-stone-700 dark:text-slate-300/90 max-w-xl leading-relaxed">
              Cataloga tus lecturas con portadas automáticas, organiza tus sagas por volumen y
              explora tus estanterías visuales desde cualquier dispositivo.
            </p>
          </div>

          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="rounded-2xl border border-amber-900/20 dark:border-[#232C3F] bg-[#fbf6ea]/85 dark:bg-[#121723]/80 backdrop-blur p-4 space-y-1.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-600/15 dark:bg-amber-500/15 border border-amber-600/30 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Library className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-base text-stone-900 dark:text-white">
                Estanterías Visuales
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Portadas oficiales automáticas y vistas en cuadrícula, lista o estantería de madera.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-900/20 dark:border-[#232C3F] bg-[#fbf6ea]/85 dark:bg-[#121723]/80 backdrop-blur p-4 space-y-1.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-600/15 dark:bg-amber-500/15 border border-amber-600/30 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-base text-stone-900 dark:text-white">
                Control de Sagas
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Sigue tu progreso volumen a volumen en todas tus colecciones y series favoritas.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-900/20 dark:border-[#232C3F] bg-[#fbf6ea]/85 dark:bg-[#121723]/80 backdrop-blur p-4 space-y-1.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-600/15 dark:bg-amber-500/15 border border-amber-600/30 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Cloud className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-base text-stone-900 dark:text-white">
                Sincronización Nube
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Tus lecturas, notas y valoraciones guardadas de forma segura en tu cuenta personal.
              </p>
            </div>
          </div>

          <blockquote className="hidden sm:block border-l-2 border-amber-700/50 dark:border-amber-500/40 pl-4 py-1">
            <p className="font-serif italic text-base text-stone-700 dark:text-slate-300">
              «Una biblioteca no es un lujo, sino una de las necesidades de la vida.»
            </p>
            <footer className="text-xs text-amber-800 dark:text-amber-400/80 mt-1 font-semibold">
              — Henry Ward Beecher
            </footer>
          </blockquote>
        </div>

        {/* Columna Derecha: Tarjeta de Acceso estilo Libro / Pergamino */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-amber-900/25 dark:border-[#28334A] bg-gradient-to-b from-[#fbf6ea] to-[#f0e5cc] dark:from-[#161D2B] dark:to-[#101520] p-5 sm:p-8 shadow-2xl shadow-amber-950/15 dark:shadow-black/80 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-600 dark:via-amber-400 to-transparent opacity-80" />

            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white">
                {mode === 'login'
                  ? 'Bienvenido de nuevo'
                  : mode === 'signup'
                  ? 'Crea tu biblioteca'
                  : 'Recuperar contraseña'}
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Accede con tu cuenta para sincronizar tu colección'
                  : mode === 'signup'
                  ? 'Regístrate gratis para guardar tus libros en la nube'
                  : 'Introduce tu email y te enviaremos un enlace seguro'}
              </p>
            </div>

            {/* Selector Iniciar Sesión / Crear Cuenta / Volver */}
            {mode === 'forgot' ? (
              <div className="flex items-center justify-between mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setFeedback(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-600 p-1.5 rounded-lg border border-amber-900/15 dark:border-[#283246] hover:bg-amber-500/10 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al inicio de sesión</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 rounded-xl bg-[#e6d8bc] dark:bg-[#0B0E14] p-1 border border-amber-900/20 dark:border-[#222B3C] mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setFeedback(null);
                  }}
                  className={
                    'py-2.5 rounded-lg text-xs font-bold transition-all ' +
                    (mode === 'login'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                  }
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setFeedback(null);
                  }}
                  className={
                    'py-2.5 rounded-lg text-xs font-bold transition-all ' +
                    (mode === 'signup'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                  }
                >
                  Crear Cuenta
                </button>
              </div>
            )}

            {feedback && (
              <div
                className={
                  'mb-5 rounded-xl border p-3.5 text-xs flex items-start gap-2.5 ' +
                  (feedback.type === 'success'
                    ? 'border-emerald-600/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-300'
                    : feedback.type === 'error'
                    ? 'border-rose-600/40 bg-rose-500/15 text-rose-900 dark:text-rose-300'
                    : 'border-amber-600/40 bg-amber-500/15 text-amber-900 dark:text-amber-200')
                }
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full rounded-xl border border-amber-900/25 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0B0E14]/90 pl-10 pr-4 py-3 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                      Contraseña
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setFeedback(null);
                        }}
                        className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-amber-900/25 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0B0E14]/90 pl-10 pr-10 py-3 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
                    Repetir contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-amber-900/25 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0B0E14]/90 pl-10 pr-4 py-3 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 text-sm shadow-lg shadow-amber-900/15 dark:shadow-amber-500/10 transition disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? 'Entrar a mi Biblioteca'
                        : mode === 'signup'
                        ? 'Crear mi Biblioteca'
                        : 'Enviar enlace de recuperación'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-amber-900/20 dark:border-[#222B3C]" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-[#f4ebd6] dark:bg-[#121824] px-3 text-stone-500 dark:text-slate-500">
                  o si lo prefieres
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleGuestAccess}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-900/25 dark:border-[#2A354B] bg-[#fffcf5]/70 dark:bg-[#0B0E14]/60 hover:bg-amber-500/15 dark:hover:bg-[#1A2233] hover:border-amber-600/50 dark:hover:border-amber-500/40 text-stone-700 dark:text-slate-300 py-2.5 px-4 text-xs font-semibold transition"
            >
              Explorar en modo local en este navegador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
