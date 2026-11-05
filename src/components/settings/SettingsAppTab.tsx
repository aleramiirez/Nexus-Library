import React from 'react';
import {
  Smartphone,
  CheckCircle2,
  Globe,
  Sparkles,
  WifiOff,
  Flame,
  Download,
  BellRing,
  AlertTriangle,
  Info,
  BellOff,
  Bell,
  Share,
  Loader2,
  PlusSquare,
  Laptop
} from 'lucide-react';
import { PwaInstallState } from '../../services/pwaInstallService';
import { PushSubscriptionStatus } from '../../services/pushNotificationService';
import { DashboardCard, DashboardCardHeader } from '../DashboardCard';
import '../../dashboard-panels.css';

interface SettingsAppTabProps {
  pwaState: PwaInstallState;
  isInstallingPwa: boolean;
  onInstallPwa: () => void;
  pushStatus: PushSubscriptionStatus | null;
  isPushLoading: boolean;
  onTogglePushNotifications: () => void;
}

export const SettingsAppTab: React.FC<SettingsAppTabProps> = ({
  pwaState,
  isInstallingPwa,
  onInstallPwa,
  pushStatus,
  isPushLoading,
  onTogglePushNotifications
}) => {
  return (
    <div className="space-y-6">
      <DashboardCard variant="base" className="space-y-6">
        <DashboardCardHeader
          icon={<Smartphone className="w-5 h-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />}
          title="Instalación y Aplicación"
          subtitle="Usa Nexus Library en tu teléfono, tableta u ordenador como una app nativa independiente."
        >
          {pwaState.isInstalled ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Modo App Activo
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 text-xs font-semibold self-start sm:self-auto shadow-xs">
              <Globe className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              Navegador Web
            </div>
          )}
        </DashboardCardHeader>

        {/* Ventajas PWA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/90 p-4 space-y-1.5 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-white">
              Pantalla Completa
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
              Sin barras del navegador ni distracciones. Tu biblioteca luce exactamente como una app nativa.
            </p>
          </div>

          <div className="rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/90 p-4 space-y-1.5 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <WifiOff className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-white">
              Lectura Sin Conexión
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
              Tus libros, notas y estanterías están guardados en tu dispositivo para consultarlos sin internet.
            </p>
          </div>

          <div className="rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/90 p-4 space-y-1.5 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-white">
              Acceso en 1 Toque
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
              Directamente desde tu pantalla de inicio o dock, con arranque instantáneo y memoria eficiente.
            </p>
          </div>
        </div>

        {/* Acción principal de instalación */}
        {pwaState.isInstalled ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h3 className="font-serif text-base font-bold text-emerald-950 dark:text-emerald-200">
              Nexus Library ya está instalada en tu dispositivo
            </h3>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 max-w-md mx-auto">
              Puedes abrirla en cualquier momento desde el icono de tu pantalla de inicio, escritorio o lista de aplicaciones.
            </p>
          </div>
        ) : pwaState.canPrompt ? (
          <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10 p-5 sm:p-6 text-center space-y-3">
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
              ¿Listo para instalar Nexus Library?
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-400 max-w-md mx-auto">
              Tu navegador permite instalar la aplicación con un solo clic, sin descargas pesadas ni tiendas de terceros.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onInstallPwa}
                disabled={isInstallingPwa}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold px-6 py-3.5 text-sm shadow-lg shadow-amber-900/15 dark:shadow-amber-500/15 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isInstallingPwa ? 'Instalando...' : 'Instalar Nexus Library Ahora'}</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Tarjeta de Notificaciones Push en este dispositivo */}
        <div className="rounded-2xl border border-amber-900/15 dark:border-[#222B3C] bg-white/70 dark:bg-[#111623] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#20293B] pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  Notificaciones Push en este dispositivo
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                  Recibe alertas instantáneas en tu móvil u ordenador cuando un amigo te envíe una solicitud de amistad o te recomiende un libro, incluso con la aplicación cerrada.
                </p>
              </div>
            </div>

            {/* Badge de estado actual */}
            {pushStatus?.isSubscribed ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-semibold shrink-0 self-start sm:self-auto">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Activas
              </div>
            ) : pushStatus?.permission === 'denied' ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 px-3.5 py-1.5 text-xs font-semibold shrink-0 self-start sm:self-auto">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Bloqueadas
              </div>
            ) : !pushStatus?.supported ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 text-xs font-semibold shrink-0 self-start sm:self-auto">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                No Soportadas
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-stone-500/15 border border-stone-500/30 text-stone-700 dark:text-stone-300 px-3.5 py-1.5 text-xs font-semibold shrink-0 self-start sm:self-auto">
                <BellOff className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                Inactivas
              </div>
            )}
          </div>

          {/* Aviso específico para iPhone / iPad si corresponde */}
          {pushStatus?.isIos && !pushStatus.isIosStandalone && (
            <div className="rounded-xl border border-amber-600/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Aviso para iPhone e iPad (iOS / iPadOS):</p>
                <p className="leading-relaxed opacity-90">
                  Apple requiere que añadas primero la web a tu Pantalla de Inicio (toca el botón Compartir <Share className="w-3.5 h-3.5 inline mx-0.5" /> y selecciona <strong>"Añadir a pantalla de inicio"</strong>) para poder recibir notificaciones Push con la aplicación cerrada.
                </p>
              </div>
            </div>
          )}

          {pushStatus?.permission === 'denied' && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-3 text-xs text-rose-950 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Permiso de notificaciones bloqueado</p>
                <p className="leading-relaxed opacity-90">
                  Has bloqueado los permisos de notificación en este navegador. Para activarlas, abre la configuración de permisos del sitio en tu navegador y selecciona "Permitir notificaciones".
                </p>
              </div>
            </div>
          )}

          {/* Botón de acción */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-stone-500 dark:text-slate-400">
              {pushStatus?.isSubscribed
                ? 'Este navegador está suscrito y listo para recibir alertas cuando te envíen solicitudes o recomendaciones.'
                : 'Puedes activar o desactivar las notificaciones de forma independiente en cada uno de tus dispositivos.'}
            </p>

            <button
              type="button"
              onClick={onTogglePushNotifications}
              disabled={isPushLoading || !pushStatus?.supported}
              className={
                'inline-flex items-center justify-center gap-2 rounded-xl font-bold px-4 py-2.5 text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 ' +
                (pushStatus?.isSubscribed
                  ? 'border border-amber-900/20 dark:border-[#2A344A] bg-stone-200/60 dark:bg-[#1A2232] text-stone-800 dark:text-slate-200 hover:bg-rose-500/15 hover:text-rose-700 dark:hover:text-rose-300'
                  : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 shadow-md shadow-amber-900/15')
              }
            >
              {isPushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : pushStatus?.isSubscribed ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              <span>
                {isPushLoading
                  ? 'Actualizando...'
                  : pushStatus?.isSubscribed
                  ? 'Desactivar en este dispositivo'
                  : 'Activar Notificaciones Push'}
              </span>
            </button>
          </div>
        </div>

        {/* Guía paso a paso por plataforma */}
        <div className="space-y-4 pt-2">
          <h3 className="font-serif text-base font-bold text-stone-900 dark:text-slate-100 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 dark:text-amber-400" /> Cómo instalarla según tu dispositivo
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* iOS Safari */}
            <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-stone-900 dark:text-white">
                <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>iPhone / iPad (Safari)</span>
              </div>
              <ol className="space-y-2 text-xs text-stone-600 dark:text-slate-400 list-decimal list-inside leading-relaxed">
                <li>
                  Abre este enlace en <span className="font-semibold text-stone-800 dark:text-slate-200">Safari</span>.
                </li>
                <li>
                  Pulsa el botón <span className="font-semibold inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><Share className="w-3.5 h-3.5 inline" /> Compartir</span> en la barra inferior.
                </li>
                <li>
                  Selecciona <span className="font-semibold text-stone-800 dark:text-slate-200 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline text-amber-700 dark:text-amber-400" /> «Añadir a pantalla de inicio»</span>.
                </li>
              </ol>
            </div>

            {/* Android Chrome */}
            <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-stone-900 dark:text-white">
                <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Android (Chrome / Edge)</span>
              </div>
              <ol className="space-y-2 text-xs text-stone-600 dark:text-slate-400 list-decimal list-inside leading-relaxed">
                <li>
                  Pulsa el menú de opciones <span className="font-bold text-stone-800 dark:text-slate-200">⋮</span> (arriba a la derecha).
                </li>
                <li>
                  Elige <span className="font-semibold text-stone-800 dark:text-slate-200">«Instalar aplicación»</span> o <span className="font-semibold text-stone-800 dark:text-slate-200">«Añadir a pantalla de inicio»</span>.
                </li>
                <li>
                  Confirma la instalación y aparecerá en tu cajón de apps.
                </li>
              </ol>
            </div>

            {/* Desktop */}
            <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#fffcf5] dark:bg-[#0D1017] p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-stone-900 dark:text-white">
                <Laptop className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Ordenador (PC / Mac)</span>
              </div>
              <ol className="space-y-2 text-xs text-stone-600 dark:text-slate-400 list-decimal list-inside leading-relaxed">
                <li>
                  En Chrome, Edge o Brave, mira al final de la barra de URL.
                </li>
                <li>
                  Haz clic en el icono de instalación <span className="font-bold text-amber-700 dark:text-amber-400">⊕</span> o en Menú &gt; Instalar Nexus Library.
                </li>
                <li>
                  La app se abrirá en su propia ventana sin pestañas.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};
