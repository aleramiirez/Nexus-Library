// Service Worker para Nexus Library (PWA + Push Notifications)
const CACHE_NAME = 'nexus-library-v1.0.2';

// Recursos críticos estáticos que deben estar disponibles offline
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/logo.png',
  '/hero-library.jpg',
  '/banner-library.png',
  '/banner-library-light.png'
];

// 1. Ciclo de vida: Instalación y activación inmediata
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Fallo al precachear recursos:', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 2. Gestión de Notificaciones Push Web
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Nexus Library',
    body: 'Tienes una nueva novedad en tu biblioteca.',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/',
    tab: 'recommendations',
    tag: 'nexus-library-inbox'
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch {
      const text = event.data.text();
      if (text) {
        payload.body = text;
      }
    }
  }

  const title = payload.title || 'Nexus Library';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    tag: payload.tag || 'nexus-inbox',
    data: {
      url: payload.url || '/',
      tab: payload.tab || 'recommendations'
    },
    vibrate: [180, 80, 180]
  };

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Comprobar si alguna ventana de la app está actualmente visible y enfocada
        const focusedClient = clientList.find(
          (client) => client.focused && client.visibilityState === 'visible'
        );

        if (focusedClient) {
          // Si hay una ventana enfocada, enviamos mensaje postMessage para mostrar el banner In-App sin duplicar
          focusedClient.postMessage({
            type: 'PUSH_RECEIVED_FOREGROUND',
            payload
          });
          return Promise.resolve();
        }

        // Si la app está cerrada o en segundo plano, lanzamos la notificación nativa del sistema
        return self.registration.showNotification(title, options);
      })
      .catch((err) => {
        console.warn('[SW] Error al procesar notificación push:', err);
      })
  );
});

// 3. Manejo de clicks en notificaciones nativas
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetTab = event.notification.data?.tab || 'recommendations';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya existe una pestaña abierta de la aplicación, le damos foco y le enviamos la instrucción
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'OPEN_INBOX',
              tab: targetTab
            });
            return client;
          }
        }

        // Si la app estaba totalmente cerrada, abrimos la ventana con el parámetro de apertura
        if (self.clients.openWindow) {
          const destination = `/?openInbox=${encodeURIComponent(targetTab)}`;
          return self.clients.openWindow(destination);
        }
      })
  );
});

// 4. Estrategias de caché y red para PWA
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorar peticiones de extensiones y esquemas no http/https
  if (!url.protocol.startsWith('http')) return;

  // Supabase, APIs externas y webhooks siempre van directo a la red
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('openlibrary.org')
  ) {
    return;
  }

  // Peticiones de navegación (HTML SPA): Network First con fallback a /index.html en caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response('Nexus Library está disponible offline.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Assets estáticos locales (JS, CSS, imágenes, fuentes): Stale-While-Revalidate
  if (
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
