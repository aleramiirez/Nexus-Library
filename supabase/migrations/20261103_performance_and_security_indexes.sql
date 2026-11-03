-- ==============================================================================
-- Migración: Optimización de Rendimiento, Índices Compuestos y Seguridad RLS
-- Fecha: 2026-11-03
-- ==============================================================================

-- 1. Optimizar políticas RLS de push_subscriptions con (select auth.uid())
-- Evita llamadas repetidas por cada fila examinada por el planificador de PostgreSQL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
    ) THEN
        DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
        CREATE POLICY "Users can view their own push subscriptions"
            ON public.push_subscriptions
            FOR SELECT
            TO authenticated
            USING ((select auth.uid()) = user_id);

        DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
        CREATE POLICY "Users can insert their own push subscriptions"
            ON public.push_subscriptions
            FOR INSERT
            TO authenticated
            WITH CHECK ((select auth.uid()) = user_id);

        DROP POLICY IF EXISTS "Users can update their own push subscriptions" ON public.push_subscriptions;
        CREATE POLICY "Users can update their own push subscriptions"
            ON public.push_subscriptions
            FOR UPDATE
            TO authenticated
            USING ((select auth.uid()) = user_id)
            WITH CHECK ((select auth.uid()) = user_id);

        DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;
        CREATE POLICY "Users can delete their own push subscriptions"
            ON public.push_subscriptions
            FOR DELETE
            TO authenticated
            USING ((select auth.uid()) = user_id);
    END IF;
END $$;

-- 2. Índices compuestos en 'friendships' para acelerar consultas OR y filtros por estado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friendships'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_friendships_req_status 
            ON public.friendships(requester_id, status);

        CREATE INDEX IF NOT EXISTS idx_friendships_add_status 
            ON public.friendships(addressee_id, status);
    END IF;
END $$;

-- 3. Índices compuestos en 'book_recommendations' para la bandeja de entrada
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'book_recommendations'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_book_recommendations_receiver_status_date 
            ON public.book_recommendations(receiver_id, status, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_book_recommendations_sender_date 
            ON public.book_recommendations(sender_id, created_at DESC);
    END IF;
END $$;

-- 4. Índices en 'books' para orden cronológico y campos frecuentes en el documento JSONB
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'books'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_books_user_updated 
            ON public.books(user_id, updated_at DESC);

        CREATE INDEX IF NOT EXISTS idx_books_progreso 
            ON public.books (((data->>'progreso')));

        CREATE INDEX IF NOT EXISTS idx_books_saga 
            ON public.books (((data->>'sagaId')));
    END IF;
END $$;

-- 5. Índice en 'sagas' para consultas por usuario
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sagas'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_sagas_user_id 
            ON public.sagas(user_id);
    END IF;
END $$;
