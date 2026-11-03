# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- **Frontend:** React 18.3, Vite 5, TypeScript estricto, Tailwind CSS 3.
- **Persistencia y Estado:** Dexie.js (IndexedDB local-first reactivo con `dexie-react-hooks`), sincronización bidireccional con Supabase (Auth, Postgres, Row-Level Security, Storage).
- **PWA & Notificaciones:** Service Worker PWA (`public/sw.js`), Web Push Notifications mediante Supabase Edge Functions (`send-book-push`).
- **Audio & Táctil:** Web Audio API sintético (`soundService.ts`) para campana de latón, golpe de sello de lacre y crujido de papiro.
- **Iconografía:** Lucide React.
- **Tipografías:** Cormorant Garamond (titulares/literario), Plus Jakarta Sans (interfaz/legibilidad), Monoespaciada (cifras/códigos).

## Users

- **Perfil principal:** Lectores voraces, coleccionistas bibliófilos y amantes de la literatura que buscan catalogar sus lecturas con dignidad artesanal.
- **Situación:** En casa leyendo en papel o ereader, explorando librerías, o repasando retos anuales y citas favoritas.
- **Trabajo a realizar:** Registrar lecturas, anotar citas memorables, seguir el progreso de sagas, medir desafíos anuales y compartir su carnet de lector oficial sin depender de redes sociales masivas ni anuncios.

## Product Purpose

- Ofrecer un **santuario literario local-first** que protege la privacidad del lector y eleva el acto de la lectura a través de una experiencia cálida, táctil y ceremonial (*Dark Academia*).
- El éxito significa que el lector siente que abre un verdadero mueble de roble o tomo encuadernado en piel, disfrutando de cada libro registrado.

## Positioning

Frente a aplicaciones corporativas o utilitarias planas (Goodreads, StoryGraph, Notion), Nexus Library ofrece una identidad física inmersiva: estanterías de madera tallada con lomos 3D, libros abiertos con canto de páginas, sellos de lacre carmesí con relieve, pasaporte literario consular y una jerarquía honorífica («La Orden de los Guardianes del Nexus»).

## Operating Context

- **Modo Base de la App:** **Operate**. Los paneles de control, tablas de búsqueda, filtros de sagas y formularios priorizan la velocidad de escaneo, claridad de estados y exactitud técnica.
- **Zonas Experience:**
  - **Estantería de Lectura (`BookShelf`):** Mueble de roble miel empotrado con hornacina, lomos táctiles y marcapáginas.
  - **Ficha Ceremonial de Libro (`BookDetailModal`):** Despliegue en libro abierto de dos páginas con pliegue central, costura, marcapáginas colgante y sello de lacre.
  - **Atlas Literario (`LiteraryAtlasMap`):** Cartografía consular estilo siglo XIX con sellos de tinta de países conquistados.
  - **El Gran Códice de la Orden (`NexusOrderCodexModal`):** Escalafones del I al X con marcos ornamentales reales (madera, bronce, plata, oro, lacre, zafiro, corona imperial).
- **Uso Offline:** Funciona al 100% sin conexión a internet; sincroniza en segundo plano cuando la red regresa.

## Capabilities and Constraints

- **Local-First Estricto:** La base de datos Dexie es la fuente de verdad inmediata; la UI nunca se bloquea esperando a la red.
- **Modo Invitado Soberano:** Se puede utilizar plenamente sin crear cuenta. La migración a la nube ocurre sin pérdida de datos al iniciar sesión.
- **Cálculo Determinista de Sabiduría (XP):** La experiencia se calcula dinámicamente según el estado real de los libros leídos, páginas, sagas completadas y países sellados. Si un libro se desmarca o elimina, los puntos se deducen de forma transparente y reactiva.
- **Protección de la Estética:** La riqueza visual no es negociable; no se debe aplanar ni convertir en un panel SaaS minimalista genérico.

## Brand Commitments

- **Paleta Sagrada:** Papel pergamino envejecido, tinta sepia, ámbar dorado, madera de roble, lacre carmesí y azul noche imperial.
- **Metáforas Físicas:** Pestañas de latón atornilladas (`.catalog-brass-tab`), sombras de pliegue de libro (`.book-gutter`), lomos de cuero con nervios y marcos de la Orden.
- **Voz:** Distinguida, sobria, erudita y acogedora. Trata al usuario como «Lector» o «Guardián del Nexus».

## Evidence on Hand

- Componentes estilizados en CSS artesanal (`dashboard-panels.css`, `book-detail.css`, `book-shelf.css`, `literary-atlas.css`).
- Sistema heráldico funcional con 10 escalafones y marcos visuales coleccionables.
- Pasaporte consular y carnet de lector exportable en canvas de alta resolución.

## Product Principles

1. **El libro es un artefacto noble:** Cada obra tiene presencia tridimensional, páginas, lomo y valoración solemne.
2. **Soberanía y Resiliencia Local:** La biblioteca nunca deja de abrirse porque se caiga un servidor externo.
3. **Progresión Orgánica:** Cada página y nota cuenta; el progreso se gana leyendo y se refleja con justicia.
4. **Respeto a la Estética:** La interfaz es parte del placer de leer; el diseño ornamental se cuida y se pule, nunca se mutila.

## Accessibility & Inclusion

- Meta: Conformidad WCAG 2.2 Nivel AA.
- Soporte para alto contraste tanto en modo diurno (pergamino legible con texto `#1c1917`) como nocturno (azul noche `#0d1017` con texto `#f8fafc`).
- Compatibilidad completa con navegación por teclado y lectores de pantalla en formularios y modales.
