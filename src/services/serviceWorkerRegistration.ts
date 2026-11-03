/**
 * Registro y gestión del Service Worker de Nexus Library
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    let refreshing = false;

    // Recargar automáticamente cuando el nuevo Service Worker toma el control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Forzar chequeo de actualización inmediata
          registration.update().catch(() => {});

          // Comprobar actualizaciones periódicamente
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.info('Nexus Library: Nueva versión disponible, activando...');
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                } else {
                  console.info('Nexus Library: Contenido listo para uso offline.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('Error al registrar Service Worker:', error);
        });
    });
  }
}
