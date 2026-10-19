import { createClient, Session, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
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
