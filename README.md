# NEXUS LIBRARY — Biblioteca Digital Personal

> **Un santuario bibliotecario local-first con estética editorial *Dark Academia* para lectores voraces y coleccionistas.**

Nexus Library permite catalogar libros, organizar sagas, medir desafíos anuales, registrar citas y reflexiones, y explorar un atlas literario interactivo. Su arquitectura combina **persistencia soberana inmediata en el dispositivo (IndexedDB con Dexie)** con **sincronización bidireccional en la nube (Supabase)**, funcionamiento **PWA offline** y notificaciones **Web Push** mediante Edge Functions.

---

## 🏛️ Arquitectura del Proyecto y Diagramas Interactivos

La arquitectura del sistema está documentada de forma visual e interactiva en la carpeta [`docs/architecture/`](docs/architecture/README.md), con dos diagramas autónomos ejecutables directamente en el navegador con soporte para tema claro/oscuro y recorridos guiados:

| Diagrama | Descripción | Enlace GitHub Pages (Recomendado) | Enlace Alternativo (HTMLPreview) |
| :--- | :--- | :--- | :--- |
| **Portal de Documentación** | Índice principal con acceso a ambos esquemas | [Ver Portal](https://aleramiirez.github.io/Nexus-Library/) | — |
| **Atlas de Arquitectura** | Vista estratificada en 6 capas con dependencias y recorridos | [Abrir Atlas](https://aleramiirez.github.io/Nexus-Library/architecture/atlas-arquitectura.html) | [HTMLPreview](https://htmlpreview.github.io/?https://github.com/aleramiirez/Nexus-Library/blob/main/docs/architecture/atlas-arquitectura.html) |
| **Diagrama de Arquitectura** | Flujo de datos animado, conexiones cliente-nube y Web Push | [Abrir Diagrama](https://aleramiirez.github.io/Nexus-Library/architecture/diagrama-arquitectura.html) | [HTMLPreview](https://htmlpreview.github.io/?https://github.com/aleramiirez/Nexus-Library/blob/main/docs/architecture/diagrama-arquitectura.html) |

---

## 🚀 Características Principales

- **Arquitectura Local-First:** La base de datos local Dexie en IndexedDB es la fuente de verdad inmediata; la interfaz responde de forma instantánea sin bloquearse por la red.
- **Estética Ceremonial Dark Academia:** Estantería de roble tallado con lomos 3D, ficha de libro abierto de dos páginas con animación FLIP, sellos de lacre carmesí con relieve y cartografía consular en el Atlas Literario.
- **Sincronización Inteligente con Supabase:** Migración bidireccional automática con prevención de duplicados (por ID, ISBN o título + autor).
- **Progresión y Rangos de la Orden Nexus:** Sistema de experiencia (XP) calculado de forma determinista y justa sobre lecturas reales, páginas, sagas y países sellados.
- **PWA & Notificaciones Web Push:** Funciona sin conexión mediante Cache Storage (`sw.js`) y recibe recomendaciones y avisos de amistad en segundo plano vía Supabase Edge Functions y claves VAPID.
- **Accesibilidad y Calidad:** Cumplimiento con las pautas de accesibilidad **WCAG 2.2 Nivel AA** (confinamiento de foco, etiquetas semánticas y ratio de contraste > 4.5:1 en temas claro y oscuro).

---

## ⚙️ 1. Configuración de Variables de Entorno

Copia el archivo `.env.example` a `.env` en la raíz del proyecto y completa tus credenciales públicas de Supabase:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_public_key_here
```

---

## 🛠️ 2. Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm install` | Instala todas las dependencias del proyecto |
| `npm run dev` | Inicia el servidor de desarrollo local con Vite (HMR) |
| `npm run build` | Compila TypeScript (`tsc`) y genera el bundle optimizado en `dist/` |
| `npm run preview` | Sirve localmente la versión de producción compilada en `dist/` |
| `npm test` | Ejecuta la suite de pruebas End-to-End con Playwright |
| `npm run lint` | Ejecuta ESLint 9 (`react-hooks` y `jsx-a11y`) |
| `npm run format` | Aplica formato homogéneo a todo el código con Prettier |

---

## 🗄️ 3. Persistencia con Supabase y Migraciones Versionadas

Las migraciones de la base de datos se encuentran versionadas en [`supabase/migrations/`](supabase/migrations/):

- **Esquema Principal:**
  - `public.books`: `(id UUID, user_id UUID, data JSONB, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)` con clave primaria compuesta `(id, user_id)` y Row-Level Security (`auth.uid() = user_id`). Todos los atributos del libro se persisten íntegramente en la columna `data` (`JSONB`) con índices GIN optimizados.
  - `public.sagas`: `(id UUID, user_id UUID, nombre TEXT, descripcion TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)` con clave primaria compuesta `(id, user_id)` y RLS activo.
  - `public.friendships`, `public.book_recommendations`, `public.push_subscriptions`: Tablas comunitarias e infraestructura push protegidas por políticas RLS.
- **Migraciones incluidas:**
  - `20261103000000_performance_and_security_indexes.sql`: Índices compuestos sobre claves foráneas y búsquedas frecuentes.
  - `20261103000001_audit_indexes_and_rls.sql`: Auditoría de índices de rendimiento y comprobaciones de integridad.

---

## 🧪 4. Red de Seguridad y Pruebas E2E

El proyecto cuenta con una red de seguridad automatizada:
1. **ESLint 9 & Prettier:** Reglas estrictas para Hooks de React y accesibilidad `jsx-a11y`.
2. **Playwright E2E Suite (`tests/`):**
   - `auth-flow.spec.ts`: Flujo de bienvenida, validación de formularios y acceso en Modo Invitado soberano.
   - `add-book.spec.ts`: Creación de obras en el modal ceremonial y visualización en la estantería.
   - `supabase-sync.spec.ts`: Persistencia local reactiva en IndexedDB / Dexie.
   - `visual-regression.spec.ts`: Capturas visuales de zonas *Experience* (Estantería de roble y Ficha de libro abierto).

---

## 🎨 5. Identidad Visual y Sistema de Diseño

Para consultar los tokens de diseño, tipografías (*Cormorant Garamond* y *Plus Jakarta Sans*), componentes ornamentales y directrices de producto:
- **[PRODUCT.md](PRODUCT.md):** Visión del producto, contexto operativo (*Operate* vs *Experience*), compromisos de marca y principios.
- **[DESIGN.md](DESIGN.md):** Tokens de diseño, paleta pergamino/ámbar y noche/dorado, métricas tipográficas y componentes artesanos.

---

## ⚖️ 6. Licencia y Derechos de Autor

Copyright © 2026 **Alejandro Ramírez**. Todos los derechos reservados.

Este software es propiedad intelectual exclusiva de Alejandro Ramírez. El código fuente se comparte en este repositorio únicamente con fines de muestra técnica, consulta educativa y portfolio personal.

Queda estrictamente prohibida la copia, modificación, distribución, republicación, despliegue público o explotación comercial de este software (total o parcial) sin la autorización previa, expresa y por escrito del autor. Para más detalles, consulta el archivo [LICENSE](LICENSE).
