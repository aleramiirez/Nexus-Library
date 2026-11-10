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
  Library
} from 'lucide-react';
import {
  fetchSupabaseAuthSettings,
  supabase,
  SupabaseAuthSettings,
  getAuthRedirectUrl,
  signInWithGoogle,
  signInWithGitHub,
  signInWithDiscord
} from '../services/supabaseClient';
import { AnimatedBackground } from './AnimatedBackground';
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

const DiscordIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isDiscordLoading, setIsDiscordLoading] = useState(false);
  const [authSettings, setAuthSettings] = useState<SupabaseAuthSettings | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchSupabaseAuthSettings().then(setAuthSettings);
  }, []);

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
          'No se pudo conectar con Google en este momento. Inténtalo de nuevo o entra con tu correo.'
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
          'No se pudo conectar con GitHub en este momento. Inténtalo de nuevo o entra con tu correo.'
        )
      });
    }
  };

  const handleDiscordSignIn = async () => {
    setFeedback(null);
    setIsDiscordLoading(true);
    try {
      const { error } = await signInWithDiscord();
      if (error) throw error;
    } catch (err: unknown) {
      setIsDiscordLoading(false);
      setFeedback({
        type: 'error',
        text: formatAuthErrorMessage(
          err,
          'No se pudo conectar con Discord en este momento. Inténtalo de nuevo o entra con tu correo.'
        )
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFeedback({ type: 'error', text: 'Por favor, introduce tu correo electrónico.' });
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setFeedback({
        type: 'error',
        text: 'Por favor, introduce una dirección de correo electrónico válida (ejemplo: usuario@correo.com).'
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
          text: 'Te hemos enviado un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o la carpeta de spam.'
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
        if (error) throw error;
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
            text: '¡Cuenta creada! Te hemos enviado un enlace de confirmación a tu correo. Confírmalo e inicia sesión aquí.'
          });
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: formatAuthErrorMessage(err, 'No se pudo completar el acceso. Inténtalo de nuevo.')
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
                Library
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
        <div className="lg:col-span-5 space-y-4">
          {/* Tarjeta destacada de Acceso Inmediato (Fuera del recuadro de login) */}
          <div className="rounded-2xl border border-amber-700/25 dark:border-amber-500/25 bg-[#fbf6ea]/85 dark:bg-[#121723]/80 backdrop-blur-md p-4 text-left shadow-lg shadow-amber-950/5 dark:shadow-black/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 pr-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>¿Quieres probar la app al instante?</span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Entra directo en tu navegador sin registro. Podrás crear tu cuenta luego para guardar en la nube.
                </p>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGuestAccess}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-bold px-3.5 py-2 text-xs shadow-md shadow-amber-900/15 transition"
              >
                <span>Probar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-900/25 dark:border-[#28334A] bg-gradient-to-b from-[#fbf6ea] to-[#f0e5cc] dark:from-[#161D2B] dark:to-[#101520] p-6 sm:p-8 shadow-2xl shadow-amber-950/15 dark:shadow-black/80 relative overflow-hidden">
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
                  ? 'Regístrate gratis para respaldar tus libros en la nube'
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

            <AppToast
              toast={
                feedback
                  ? { id: 1, type: feedback.type, message: feedback.text }
                  : null
              }
              onDismiss={() => setFeedback(null)}
            />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email" type="email"
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
                    <label htmlFor="auth-password" className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                      Contraseña
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        tabIndex={-1}
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
                      id="auth-password" type={showPassword ? 'text' : 'password'}
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
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
                    Repetir contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-confirm-password" type={showPassword ? 'text' : 'password'}
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

            {mode !== 'forgot' && (
              <div className="mt-6 space-y-3.5">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-amber-900/15 dark:border-[#222B3C]" />
                  </div>
                  <span className="relative bg-[#fbf6ea] dark:bg-[#121824] px-3 font-serif italic text-xs text-stone-500 dark:text-slate-400">
                    o continúa con
                  </span>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={isLoading || isGoogleLoading || isGitHubLoading || isDiscordLoading}
                    onClick={handleGoogleSignIn}
                    aria-label="Continuar con Google"
                    title="Continuar con Google"
                    className="w-11 h-11 rounded-full border border-amber-900/25 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0B0E14] hover:bg-amber-500/10 dark:hover:bg-[#151D2A] hover:border-amber-600/50 dark:hover:border-amber-400/50 flex items-center justify-center shadow-xs hover:shadow-md active:scale-95 transition disabled:opacity-50"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                    ) : (
                      <GoogleIcon className="w-4 h-4 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isLoading || isGoogleLoading || isGitHubLoading || isDiscordLoading}
                    onClick={handleGitHubSignIn}
                    aria-label="Continuar con GitHub"
                    title="Continuar con GitHub"
                    className="w-11 h-11 rounded-full border border-amber-900/25 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0B0E14] hover:bg-amber-500/10 dark:hover:bg-[#151D2A] hover:border-amber-600/50 dark:hover:border-amber-400/50 flex items-center justify-center shadow-xs hover:shadow-md active:scale-95 transition disabled:opacity-50"
                  >
                    {isGitHubLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                    ) : (
                      <GitHubIcon className="w-4 h-4 shrink-0 text-stone-900 dark:text-white" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isLoading || isGoogleLoading || isGitHubLoading || isDiscordLoading}
                    onClick={handleDiscordSignIn}
                    aria-label="Continuar con Discord"
                    title="Continuar con Discord"
                    className="w-11 h-11 rounded-full border border-amber-900/25 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0B0E14] hover:bg-amber-500/10 dark:hover:bg-[#151D2A] hover:border-amber-600/50 dark:hover:border-amber-400/50 flex items-center justify-center shadow-xs hover:shadow-md active:scale-95 transition disabled:opacity-50"
                  >
                    {isDiscordLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                    ) : (
                      <DiscordIcon className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
