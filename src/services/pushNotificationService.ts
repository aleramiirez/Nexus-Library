import { supabase } from './supabaseClient';

export interface PushSubscriptionStatus {
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isIos: boolean;
  isIosStandalone: boolean;
  subscription?: PushSubscription | null;
  error?: string;
}

/**
 * Convierte una clave VAPID pública en base64 a Uint8Array requerida por pushManager.subscribe
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detecta si el dispositivo es iOS / iPadOS
 */
export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detecta si la web se ejecuta como PWA instalada en pantalla de inicio
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((window.navigator as any).standalone)
  );
}

/**
 * Registra o asegura el Service Worker en el navegador
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (err) {
    console.warn('[PushService] Fallo al registrar /sw.js:', err);
    return null;
  }
}

/**
 * Consulta el estado actual de soporte y suscripción Push en este dispositivo
 */
export async function getPushSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      permission: 'default',
      isSubscribed: false,
      isIos: false,
      isIosStandalone: false
    };
  }

  const isIos = isIosDevice();
  const isIosStandalone = isStandaloneMode();

  const supported =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  if (!supported) {
    return {
      supported: false,
      permission: 'default',
      isSubscribed: false,
      isIos,
      isIosStandalone
    };
  }

  const permission = Notification.permission;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return {
      supported: true,
      permission,
      isSubscribed: Boolean(subscription),
      isIos,
      isIosStandalone,
      subscription
    };
  } catch (err) {
    return {
      supported: true,
      permission,
      isSubscribed: false,
      isIos,
      isIosStandalone,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Suscribe al usuario actual a las notificaciones Push y guarda las credenciales en Supabase
 */
export async function subscribeUserToPush(
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'Debes iniciar sesión para activar las notificaciones Push.' };
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Tu navegador actual no tiene soporte para Notificaciones Push.' };
  }

  const isIos = isIosDevice();
  const isStandalone = isStandaloneMode();
  if (isIos && !isStandalone) {
    return {
      success: false,
      error:
        'En iPhone e iPad, Apple exige que añadas primero la web a tu Pantalla de Inicio (botón Compartir > "Añadir a pantalla de inicio") para activar las notificaciones Push.'
    };
  }

  // 1. Solicitar permiso al usuario
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      success: false,
      error: 'Permiso denegado. Para recibir notificaciones, habilita los permisos de notificación en los ajustes de tu navegador.'
    };
  }

  // 2. Obtener clave pública VAPID
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey || vapidPublicKey.trim() === '' || vapidPublicKey === 'your_vapid_public_key_here') {
    return {
      success: false,
      error:
        'No se ha configurado la clave pública VAPID (VITE_VAPID_PUBLIC_KEY) en las variables de entorno. Las notificaciones In-App y en segundo plano seguirán funcionando vía Supabase Realtime.'
    };
  }

  try {
    await registerServiceWorker();
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey.trim());
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource
      });
    }

    // Extraer claves criptográficas p256dh y auth
    const rawKey = subscription.getKey('p256dh');
    const rawAuth = subscription.getKey('auth');

    if (!rawKey || !rawAuth) {
      return { success: false, error: 'No se pudieron extraer las claves de cifrado de la suscripción Push.' };
    }

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
    const auth = btoa(String.fromCharCode(...new Uint8Array(rawAuth)));

    // Guardar / actualizar en la tabla `push_subscriptions` de Supabase
    const { error: dbError } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent || 'unknown',
        updated_at: new Date().toISOString()
      },
      { onConflict: 'endpoint' }
    );

    if (dbError) {
      console.warn('[PushService] Error al guardar suscripción en Supabase:', dbError.message);
      return {
        success: false,
        error: `Error al registrar en la base de datos: ${dbError.message}`
      };
    }

    return {
      success: true,
      message: '¡Notificaciones Push activadas con éxito en este dispositivo!'
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('[PushService] Error al suscribir a Push:', errorMsg);
    return {
      success: false,
      error: errorMsg.includes('permission')
        ? 'Permiso denegado por el navegador.'
        : `No se pudo activar la suscripción Push: ${errorMsg}`
    };
  }
}

/**
 * Desactiva la suscripción Push en el navegador y la borra de Supabase
 */
export async function unsubscribeUserFromPush(
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { success: false, error: 'Service Worker no disponible.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Eliminar de Supabase
      if (userId) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', userId);
      }

      // Cancelar en el navegador
      await subscription.unsubscribe();
    }

    return {
      success: true,
      message: 'Notificaciones Push desactivadas en este dispositivo.'
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Error al cancelar suscripción: ${errorMsg}`
    };
  }
}

/**
 * Dispara una notificación nativa del navegador cuando la pestaña está en segundo plano
 * (fallback automático si la Edge Function no está desplegada aún)
 */
export function triggerBackgroundFallbackNotification(params: {
  title: string;
  body: string;
  tag?: string;
  data?: { tab?: 'recommendations' | 'friend_requests'; url?: string };
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Solo se dispara si la pestaña está oculta/en segundo plano para evitar redundancia
  if (!document.hidden) return;

  try {
    const notif = new Notification(params.title, {
      body: params.body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: params.tag || 'nexus-fallback-inbox',
      data: params.data
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
      if (params.data?.tab) {
        window.dispatchEvent(
          new CustomEvent('nexus:open-inbox', { detail: { tab: params.data.tab } })
        );
      }
    };
  } catch {
    // Algunos navegadores móviles bloquean new Notification fuera de un Service Worker
  }
}
