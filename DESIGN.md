---
name: Nexus Library
description: Santuario bibliotecario Dark Academia para lectores y coleccionistas
colors:
  primary: "#d97706"
  primary-dark: "#b45309"
  primary-gold: "#e5c158"
  accent-amber: "#f59e0b"
  accent-burgundy: "#6e1e2a"
  accent-crimson: "#991b1b"
  wood-oak: "#8a481c"
  wood-shelf-dark: "#5c2e0b"
  wood-shelf-light: "#dbb67f"
  parchment-base: "#fbf6ea"
  parchment-surface: "#f7eedc"
  parchment-deep: "#efe4cb"
  parchment-border: "#e2cd9f"
  ink-text: "#1c1917"
  ink-muted: "#57534e"
  night-bg: "#0d1017"
  night-surface: "#151c2b"
  night-card: "#1b2333"
  night-border: "#283246"
  night-text: "#f8fafc"
  night-muted: "#94a3b8"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.025em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
rounded:
  xs: "4px"
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#020617"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-brass:
    backgroundColor: "{colors.primary-gold}"
    textColor: "#1c1917"
    rounded: "{rounded.sm}"
    padding: "4px 16px"
---

## Overview

Nexus Library adopta una estética **Dark Academia y Clásica Europea**, concebida para evocar bibliotecas del siglo XIX, archivos consulares, manuscritos iluminados y gabinetes de coleccionista. 

- **Modo Base:** **Operate**. Los listados, tablas de búsqueda, paneles de retos y formularios priorizan la ergonomía, densidad de información y rapidez de uso sin distracciones.
- **Zonas Experience:** Zonas donde el usuario interactúa directamente con el objeto físico literario:
  - **Estantería de Lectura (`BookShelf`):** Mueble de madera de roble tallado con nicho empotrado, sombras de balda y lomos de libros con texturas táctiles.
  - **Ficha Ceremonial (`BookDetailModal`):** Despliegue de libro abierto a dos páginas con pliegue central (`.book-gutter`), marcapáginas de tela cosida, y sello de lacre.
  - **Atlas Literario (`LiteraryAtlasMap`):** Cartografía sepia histórica con estética consular y sellos de tinta de países conquistados.
  - **El Gran Códice (`NexusOrderCodexModal`):** Jerarquía de 10 escalafones con marcos táctiles (madera, bronce, plata, oro, lacre carmesí, zafiros, corona imperial).

## Colors

El sistema cromático se basa en la dualidad día/noche del mundo académico:

### Modo Claro (Pergamino & Cuero)
- **Fondo de lectura:** `#fbf6ea` (papiro cálido natural con haz de luz sutil).
- **Tarjetas y paneles:** `#f7eedc` con bordes cálidos en `#e2cd9f` o `rgba(180, 83, 9, 0.2)`.
- **Canal de lectura / barra lateral:** `#efe4cb` con efecto de página izquierda de libro encuadernado.
- **Tipografía principal:** `#1c1917` (tinta china profunda) y `#57534e` (tinta sepia atenuada).

### Modo Oscuro (Biblioteca Nocturna & Terciopelo)
- **Fondo nocturno:** `#0d1017` (azul noche obsidiana con partículas de luz estelar).
- **Superficie de paneles:** `#151c2b` y `#1b2333` con ribetes sutiles en `#283246`.
- **Tipografía principal:** `#f8fafc` (blanco pergamino) y `#94a3b8` (gris bruma).

### Acentos Heraldicos y Materiales Nobles
- **Ámbar Principal (`#d97706` / `#b45309`):** Botones de acción, enlaces activos, badges de estado.
- **Latón Dorado (`#d5ab48` a `#ab822b`):** Pestañas grabadas atornilladas (`.catalog-brass-tab`), placas de títulos, barras de XP.
- **Lacre Carmesí (`#991b1b` / `#7f1d1d`):** Sellos de libros terminados, marcas de honor.
- **Madera de Roble (`#8a481c` a `#5c2e0b`):** Baldas de estantería, molduras de tarjetas y marcos de Nivel II.
- **Esmeralda & Zafiro (`#059669` / `#0284c7`):** Indicadores de estados de lectura y gemas de la Orden.

## Typography

- **Títulos y Literatura (`font-serif`):** `Cormorant Garamond`, Georgia, serif. Utilizada para títulos de libros, nombres de autores, citas literarias, títulos de capítulos y cabeceras ceremoniales.
- **Interfaz y Datos (`font-sans`):** `Plus Jakarta Sans`, system-ui, sans-serif. Utilizada para botones, etiquetas de formulario, metadatos, tablas y navegación.
- **Cifras y Códigos (`font-mono`):** `ui-monospace`, JetBrains Mono. Utilizada para niveles (`Nv. 8`), contadores de páginas, XP, años y códigos consulares.

## Layout

- **Estructura Escritorio:** Pantalla dividida en libro abierto. Barra lateral izquierda fija con aspecto de índice de libro (`BookSidebar`), pliegue central de sombra (`.book-gutter`) y página derecha de contenido.
- **Estructura Móvil:** Cabecera fija con logotipo y acceso rápido a buzón, cajón lateral deslizable para el índice y barra de navegación inferior con accesos directos.
- **Modales Flotantes:** Centrados en pantalla sobre fondo de cristal esmerilado oscuro (`bg-black/80 backdrop-blur-md`), encabezados por la pestaña de latón dorada remachada.

## Elevation & Depth

La tridimensionalidad no se simula con sombras planas de software genérico, sino con sombras de iluminación cenital y biseles físicos:
- **Placa de Latón (`.catalog-brass-tab`):** Bisel metálico superior de luz blanca (`inset 0 1px 0 rgba(255,255,255,0.65)`), sombra inferior de grabado (`inset 0 -1px 0 rgba(100,70,10,0.4)`) y remaches oscuros en ambos extremos.
- **Balda de Roble (`.dashboard-shelf-niche`):** Profundidad de repisa tallada con bisel superior de luz miel y sombra de fondo oscuro (`box-shadow: 0 14px 20px -6px rgba(40,20,5,0.4)`).
- **Lomos de Libros:** Efecto de encuadernación con nervios horizontales, brillo en el lomo y sombreado en la unión con la balda.
- **Libro Abierto (`.book-gutter`):** Degradado de pliegue central que proyecta una sombra cóncava natural entre las páginas izquierda y derecha.

## Shapes

- **Esquinas redondeadas:** Predominan radios suaves de `12px` (`rounded-xl`) y `16px` (`rounded-2xl`) que recuerdan a las esquinas redondeadas de libros encuadernados en cuero y carnets consulares.
- **Marcos de Avatar de la Orden:** Formas cuadradas suavizadas (squircles) con ribetes multicapa de 3px a 7px de grosor según el escalafón.

## Components

- **`.catalog-card-panel`:** Contenedor de pergamino con borde suave, apto para pestañas de latón en la cabecera. Siempre debe permitir `overflow-visible` si aloja la pestaña `.catalog-brass-tab` para no cortarla. Se mantiene en modales y pantallas completas (Atlas, Códice, Pasaporte, Ajustes, Colecciones).
- **`DashboardCard` (Sistema Unificado de Tarjetas del Panel de Inicio):** Contenedor común de papel apilado (`.dashboard-card`) que unifica la experiencia visual del Dashboard principal con tokens compartidos y variaciones deliberadas:
  - **Tokens de Card (`src/dashboard-panels.css`):**
    - Fondo con grano de papel táctil (`--dashboard-card-bg-base`, `--dashboard-card-bg-image`).
    - Borde exterior doble con marco interior fino (`--dashboard-card-border`, `--dashboard-card-inner-border` a 6px).
    - Radios proporcionales: exterior `18px`, marco interior `12px`.
    - Relleno unificado: escritorio `22px 24px`, móvil estricto de `16px` (`p-4`).
    - Sombra multicapa apilada (`--dashboard-card-shadow`) y sombra de volumen protagonista (`--dashboard-card-shadow-hero`).
  - **4 Variantes:**
    1. **`hero` («Leyendo actualmente»):** Sombra protagonista ampliada, cinta marcapáginas carmesí colgante (`.dashboard-ribbon`), título escalado en Cormorant Garamond (`1.25rem` móvil / `1.375rem` escritorio) y despeje lateral (`padding-right: 2.5rem` móvil / `3rem` escritorio) para garantizar >100px de margen respecto a la cinta en pantallas móviles de 390px.
    2. **`list` («Mis sagas»):** Pautado de archivo encuadernado (líneas sutiles a 34px), pestaña grabada de latón exterior (`.catalog-brass-tab`) a `top: -12px` y contenedor interior con elevación `z-[2]`.
    3. **`shelf` («Favoritos»):** Contenedor de papel apilado que aloja en su interior la hornacina de roble tallado (`.dashboard-shelf-niche`) con lamas y baldas de madera.
    4. **`base` («Hábito y Racha de Lectura»):** Fondo de papel táctil neutro con módulos internos traslúcidos biselados (`.nx-streak-rc`, `.nx-streak-sx`), cordón ceremonial de racha, anillos iluminados para el día actual y sellos de lacre con contraste AA reforzado en modo claro y oscuro.
  - **Cabecera Unificada (`DashboardCardHeader`):**
    - Icono de línea SVG de 20px en ámbar noble (`text-amber-700` / dark `text-amber-400`). Favoritos porta `Star` de línea; Racha porta `Flame` de línea; Leyendo porta `Clock` de línea.
    - Título editorial en Cormorant Garamond.
    - Enlace de acción común (`.dashboard-card-action`): tipografía seminegrita de 12px, tono ámbar noble, chevron integrado «›» (`ChevronRight`), sin subrayado inicial y subrayado selectivo en `:hover` / `:focus-visible`.
- **`.catalog-brass-tab`:** Pestaña superior grabada de latón, colocada a `top: -12px` con texto en Cormorant Garamond negrita.
- **`UserAvatar`:** Avatar con o sin marco heráldico de la Orden. Al equipar un marco, incorpora capas de textura (madera tallada, remaches, orla de plata, gema, estrella astral).
- **`BookShelf`:** Mueble de lectura que organiza los libros en baldas de madera física según su estado (`Leyendo`, `Pendientes`, `Leídos`).
- **`BookmarkMarker`:** Cinta marcapáginas de seda con pico cortado en ángulo que señala la sección activa.

## Do's and Don'ts

### Do's
- Mantener la calidez del papel, la madera y los metales nobles en todas las vistas nuevas.
- Diseñar pensando primero en la legibilidad del texto literario antes de agregar decoraciones superfluas.
- Conservar los remaches, texturas de lomo y pliegues como sellos distintivos de la aplicación.
- Permitir al usuario personalizar su avatar y títulos honoríficos respetando su progreso alcanzado.

### Don'ts
- **NO** aplanar la interfaz ni eliminar sombras o biseles para convertirla en un diseño minimalista estéril.
- **NO** utilizar tipografías sans-serif genéricas en los nombres de libros, autores o rangos ceremoniales.
- **NO** aplicar `overflow-hidden` al panel raíz `.catalog-card-panel` si lleva una pestaña `.catalog-brass-tab`.
- **NO** inventar sistemas de colores fosforitos, neones o estéticas ajenas al santuario Dark Academia.
