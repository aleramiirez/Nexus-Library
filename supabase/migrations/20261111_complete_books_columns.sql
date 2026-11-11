-- ==============================================================================
-- Migración: Columnas completas del modelo Book en la tabla public.books
-- Fecha: 2026-11-11
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'books'
    ) THEN
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS pagina_actual integer;
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS pais text DEFAULT '';
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS resena text DEFAULT '';
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS citas jsonb DEFAULT '[]'::jsonb;
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS formato text DEFAULT '';
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS propiedad text DEFAULT '';
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS precio numeric;
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS veces_leido integer DEFAULT 1;
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS historial_lecturas jsonb DEFAULT '[]'::jsonb;
        ALTER TABLE public.books ADD COLUMN IF NOT EXISTS idioma text DEFAULT '';
    END IF;
END $$;
