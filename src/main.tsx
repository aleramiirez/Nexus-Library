import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerServiceWorker } from './services/serviceWorkerRegistration';
import { ErrorBoundary } from './components/ErrorBoundary';

// Si Vite no puede cargar un chunk tras un nuevo despliegue en producción, recarga la página
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Error de precarga de fragmento tras despliegue, recargando aplicación...', event);
    window.location.reload();
  });
}

// Registrar Service Worker para soporte PWA e instalación
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
