# Arquitectura Técnica y Diagramas de Nexus Library

Este directorio contiene la documentación visual e interactiva que describe la arquitectura integral de Nexus Library: diseño en capas, persistencia reactiva local-first, sincronización en la nube con Supabase, Web Push con Edge Functions y calidad de software.

---

## 🌐 Enlaces de Acceso a los Diagramas

Ambos diagramas son aplicaciones interactivas autónomas en HTML5, CSS custom properties y SVG interactivo (con soporte para tema claro/oscuro, recorridos paso a paso e inspección de dependencias):

| Diagrama | Descripción | Enlace GitHub Pages (Oficial) | Enlace Alternativo (HTMLPreview) |
| :--- | :--- | :--- | :--- |
| **Portal de Documentación** | Índice principal con acceso a ambos esquemas | [Ver Portal](https://aleramiirez.github.io/Nexus-Library/) | — |
| **Atlas de Arquitectura** | Vista estratificada en 6 capas con trazado de dependencias | [Abrir Atlas](https://aleramiirez.github.io/Nexus-Library/architecture/atlas-arquitectura.html) | [HTMLPreview](https://htmlpreview.github.io/?https://github.com/aleramiirez/Nexus-Library/blob/main/docs/architecture/atlas-arquitectura.html) |
| **Diagrama de Flujo y Conexiones** | Mapa de componentes, llamadas animadas paquete a paquete | [Abrir Diagrama](https://aleramiirez.github.io/Nexus-Library/architecture/diagrama-arquitectura.html) | [HTMLPreview](https://htmlpreview.github.io/?https://github.com/aleramiirez/Nexus-Library/blob/main/docs/architecture/diagrama-arquitectura.html) |

> **Nota para ejecución local:** También puedes clonar el repositorio y hacer doble clic en `docs/architecture/atlas-arquitectura.html` o `docs/architecture/diagrama-arquitectura.html` para abrirlos directamente en cualquier navegador moderno sin dependencias ni servidor.

---

## 🏛️ Las 6 Capas de la Arquitectura

### I. Interfaz de Usuario (React 18 + TypeScript + Tailwind 3)
- **Orquestación:** `src/App.tsx` coordina vistas y sesión, delegando el estado en hooks especializados (`useLibraryModals`, `useLibraryFilters`, `useAppNotifications`).
- **Zonas Experience:** 
  - `BookShelf`: estantería de madera de roble con lomos tridimensionales.
  - `BookDetailModal`: ficha ceremonial desplegada en libro abierto de dos páginas con animación FLIP.
  - `LiteraryAtlasMap`: cartografía SVG interactiva con sellos de lacre por países visitados.
  - `NexusOrderCodexModal`: escalafón honorífico de 10 rangos con marcos ornamentales desbloqueables.
- **División en Chunks (Lazy Loading):** Los modales y pantallas pesadas se cargan de forma diferida con `React.lazy` y `Suspense`, manteniendo el bundle inicial en ~389 kB.

### II. Capa de Servicios (`src/services/`)
- Módulos desacoplados y libres de estado visual:
  - `bookMetadataService` & `coverService`: Búsqueda bibliográfica y normalización de portadas.
  - `friendshipService`, `communityService`, `recommendationInboxService`: Red social soberana entre lectores.
  - `levelingService` & `readingChallengeService`: Cálculo determinista de XP y progreso de retos.
  - `epubParserService` & `importExportService`: Procesamiento y migración de formatos EPUB y JSON.
  - `literaryGeographyService`: Resolución geográfica de obras y autores para el atlas.
  - `pushNotificationService` & `pwaInstallService`: Registro PWA y suscripciones Web Push.

### III. Almacenamiento Local Soberano (Local-First)
- **Dexie.js (IndexedDB):** La fuente de verdad inmediata en el dispositivo. Tablas locales `books` y `sagas`. Las vistas consumen datos en tiempo real mediante `useLiveQuery`.
- **Service Worker (`public/sw.js`):** Cache Storage (PWA offline) y receptor de notificaciones push en segundo plano.

### IV. Nube Supabase (BaaS)
- **PostgreSQL 15:** Tablas `books` (datos íntegros en columna `JSONB`), `sagas`, `profiles`, `friendships`, `book_recommendations` y `push_subscriptions`.
- **Row-Level Security (RLS):** Aislamiento estricto por usuario (`auth.uid() = user_id`) en libros, sagas y recomendaciones.
- **Migraciones Versionadas:** Localizadas en `supabase/migrations/` bajo control de versiones Git.
- **Supabase Realtime & Storage:** Canales WebSocket para eventos en vivo y almacenamiento de portadas y avatares.
- **Edge Functions (`supabase/functions/send-push`):** Microservicio Deno que despacha notificaciones Web Push firmadas con VAPID.

### V. Mundo Exterior (APIs de Terceros)
- **Open Library API:** Metadatos bibliográficos y portadas (`covers.openlibrary.org`).
- **Wikipedia ES & FlagCDN:** Sinopsis contextuales y banderas nacionales para el atlas.
- **Googleapis & Proxies:** Soporte complementario de traducción y resolución CORS.

### VI. Taller, Calidad y Despliegue
- **Compilador:** Vite 5 + TypeScript estricto.
- **Linter & Formato:** ESLint 9 (`react-hooks`, `jsx-a11y`) y Prettier.
- **Tests E2E:** Suite completa en Playwright (`tests/`) con pruebas de autenticación, alta de libros, persistencia Dexie y regresión visual.
- **Hosting:** Vercel (cliente estático HTTPS) + GitHub Pages (documentación y diagramas).
