# Diagramas de Arquitectura de Nexus Library

En este directorio se encuentran los diagramas visuales e interactivos que documentan la arquitectura técnica, las capas y los flujos de datos de Nexus Library.

## Diagramas interactivos

1. **Atlas de arquitectura (`atlas-arquitectura.html`)**
   - Vista estratificada en 6 capas: Interfaz (I), Servicios (II), Dispositivo Local (III), Nube Supabase (IV), Mundo Exterior (V) y Taller/Build (VI).
   - Incluye recorridos interactivos guiados (*Añadir un libro*, *Recomendar un libro*, *Entrar y sincronizar*), trazado animado de dependencias SVG, panel de inspección y alternador de tema claro/oscuro.
   - [Abrir vista interactiva en navegador (HTMLPreview)](https://htmlpreview.github.io/?https://github.com/aleramiirez/Nexus-Library/blob/main/docs/architecture/atlas-arquitectura.html)

2. **Diagrama de arquitectura (`diagrama-arquitectura.html`)**
   - Mapa de cajas y conexiones entre componentes clave (React, Service Worker, Dexie, cliente Supabase, Edge Functions, PostgreSQL + RLS, APIs externas).
   - Muestra el flujo de datos animado con indicadores visuales de llamadas y eventos, junto con recorridos paso a paso.
   - [Abrir vista interactiva en navegador (HTMLPreview)](https://htmlpreview.github.io/?https://github.com/aleramiirez/Nexus-Library/blob/main/docs/architecture/diagrama-arquitectura.html)

---

### Cómo visualizarlos en GitHub

Dado que GitHub no ejecuta código JavaScript dentro de la vista de código por motivos de seguridad:
- **Opción rápida:** Pulsa en los enlaces de **HTMLPreview** indicados arriba para interactuar con ellos directamente sin instalar nada.
- **Opción GitHub Pages:** Si activas GitHub Pages en la configuración del repositorio (`Settings > Pages`) seleccionando la carpeta `/docs` de la rama `main`, ambos diagramas estarán disponibles directamente bajo tu dominio `github.io`.
- **En local:** Puedes abrir cualquiera de los archivos `.html` directamente con doble clic en cualquier navegador web.
