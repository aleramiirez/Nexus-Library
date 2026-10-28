/**
 * Registro y gestión del Service Worker de Nexus Library
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Comprobar actualizaciones periódicamente
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.info('Nexus Library: Nueva versión disponible.');
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
