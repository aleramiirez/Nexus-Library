# NEXUS LIBRARY — Biblioteca Digital Personal

Aplicación web visual con estética editorial Dark Academia para gestionar libros, lecturas, estanterías, sagas y estadísticas personales con búsqueda bibliográfica, portadas automáticas y persistencia sincronizada entre **Supabase** e **IndexedDB (Dexie)**.

## 1. Configuración de variables de entorno

Copia el archivo `.env.example` a `.env` en la raíz del proyecto y completa tus credenciales públicas de Supabase:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_public_key_here
```

## 2. Instalación y ejecución en entorno de desarrollo

```bash
npm install
npm run dev
```

## 3. Compilación de producción

```bash
npm run build
npm run preview
```

## 4. Persistencia con Supabase y Migración desde IndexedDB

- **Esquema en Supabase**:
  - `public.books`: `(id UUID, user_id UUID, data JSONB, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)` con clave primaria compuesta `(id, user_id)` y RLS activo (`auth.uid() = user_id`). Todos los atributos del modelo `Book` se persisten íntegramente en la columna `data` (`JSONB`).
  - `public.sagas`: `(id UUID, user_id UUID, nombre TEXT, descripcion TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)` con clave primaria compuesta `(id, user_id)`, nombre único por usuario y RLS activo (`auth.uid() = user_id`).
- **Identidad de usuario y autenticación**:
  - Al abrir la aplicación se presenta la pantalla de inicio de sesión y registro con correo y contraseña (`AuthScreen`).
  - Al autenticarse, `syncAndMigrateWithSupabase()` migra las sagas y libros locales de IndexedDB/Dexie hacia Supabase evitando duplicados (por ID, ISBN o título+autor), verifica la escritura en el servidor y mantiene la copia local en IndexedDB sincronizada.

## 5. Licencia y Derechos de Autor

Copyright © 2026 **Alejandro Ramírez**. Todos los derechos reservados.

Este software es propiedad intelectual exclusiva de Alejandro Ramírez. El código fuente se comparte en este repositorio únicamente con fines de muestra técnica, consulta educativa y portfolio personal.

Queda estrictamente prohibida la copia, modificación, distribución, republicación, despliegue público o explotación comercial de este software (total o parcial) sin la autorización previa, expresa y por escrito del autor. Para más detalles, consulta el archivo [LICENSE](LICENSE).

