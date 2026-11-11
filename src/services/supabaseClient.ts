import { createClient, Session, User } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  ((globalThis as any).process?.env?.VITE_SUPABASE_URL as string | undefined) ||
  '';
const supabasePublishableKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  ((globalThis as any).process?.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  '';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.'
  );
}

const safeSupabaseUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeSupabaseKey = supabasePublishableKey || 'placeholder-anon-key';

export const supabase = createClient(safeSupabaseUrl, safeSupabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'nexus_library_supabase_auth'
  }
});

export interface SupabaseAuthSettings {
  anonymousEnabled: boolean;
  emailEnabled: boolean;
  mailerAutoconfirm: boolean;
}

export async function fetchSupabaseAuthSettings(): Promise<SupabaseAuthSettings> {
  if (!supabaseUrl || !supabasePublishableKey) {
    return { anonymousEnabled: false, emailEnabled: true, mailerAutoconfirm: false };
  }
  try {
    const url = supabaseUrl.replace(/\/$/, '') + '/auth/v1/settings';
    const res = await fetch(url, {
      headers: {
        apikey: supabasePublishableKey
      }
    });
    if (!res.ok) {
      return { anonymousEnabled: false, emailEnabled: true, mailerAutoconfirm: false };
    }
    const data = await res.json();
    return {
      anonymousEnabled: Boolean(data?.external?.anonymous_users),
      emailEnabled: data?.external?.email !== false,
      mailerAutoconfirm: Boolean(data?.mailer_autoconfirm)
    };
  } catch {
    return { anonymousEnabled: false, emailEnabled: true, mailerAutoconfirm: false };
  }
}

export async function getActiveUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;
  return data.session.user;
}

export async function getActiveSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

/**
 * Retorna la URL base de redirección de autenticación (Vercel en producción o localhost en local)
 */
export function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

/**
 * Inicia sesión o registro social mediante Google OAuth en Supabase Auth
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    const redirectTo = getAuthRedirectUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account'
        }
      }
    });
    if (error) throw error;
    return { error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { error };
  }
}

/**
 * Inicia sesión o registro social mediante GitHub OAuth en Supabase Auth
 */
export async function signInWithGitHub(): Promise<{ error: Error | null }> {
  try {
    const redirectTo = getAuthRedirectUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo
      }
    });
    if (error) throw error;
    return { error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { error };
  }
}

/**
 * Inicia sesión o registro social mediante Discord OAuth en Supabase Auth
 */
export async function signInWithDiscord(): Promise<{ error: Error | null }> {
  try {
    const redirectTo = getAuthRedirectUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo
      }
    });
    if (error) throw error;
    return { error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { error };
  }
}
