-- ==============================================================================
-- Migración: Sistema de Notificaciones Web Push y Suscripciones
-- Fecha: 2026-10-28
-- ==============================================================================

-- 1. Crear tabla de suscripciones Push para dispositivos de usuarios
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso para usuarios autenticados (sus propios dispositivos)
CREATE POLICY "Users can view their own push subscriptions"
    ON public.push_subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
    ON public.push_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
    ON public.push_subscriptions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
    ON public.push_subscriptions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Servicio / Rol Service_Role tiene control total para envío de notificaciones y limpieza
CREATE POLICY "Service role can manage all push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Trigger automático para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trigger_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_push_subscriptions_updated_at();

-- 6. Habilitar publicación Realtime para las tablas de interacción
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'friendships'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'book_recommendations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.book_recommendations;
    END IF;
END $$;

-- 7. Asegurar que Postgres replique todas las columnas para que los filtros funcionen
ALTER TABLE public.friendships REPLICA IDENTITY FULL;
ALTER TABLE public.book_recommendations REPLICA IDENTITY FULL;

-- Comentarios explicativos
COMMENT ON TABLE public.push_subscriptions IS 'Almacena suscripciones Web Push por dispositivo para el envío de notificaciones con la web cerrada.';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'URL única del servicio push proporcionada por el navegador.';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS 'Clave pública de cifrado ECDH en Base64.';
COMMENT ON COLUMN public.push_subscriptions.auth IS 'Secreto de autenticación en Base64.';
