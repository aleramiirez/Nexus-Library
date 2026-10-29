import { supabase } from './supabaseClient';
import { UserProfile, ProfileVisibility } from '../types/models';

export interface RawProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  is_public?: boolean | null;
  visibility?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ProfileRow = RawProfileRow;

export function extractVisibility(row: {
  is_public?: boolean | null;
  visibility?: string | null;
  bio?: string | null;
}): {
  visibility: ProfileVisibility;
  cleanBio: string;
} {
  if (row.visibility === 'public' || row.visibility === 'friends' || row.visibility === 'private') {
    const cleanBio = row.bio ? row.bio.replace(/<!--vis:(public|friends|private)-->/g, '').trim() : '';
    return { visibility: row.visibility, cleanBio };
  }

  if (row.bio) {
    const match = row.bio.match(/<!--vis:(public|friends|private)-->/);
    if (match) {
      const vis = match[1] as ProfileVisibility;
      const cleanBio = row.bio.replace(/<!--vis:(public|friends|private)-->/g, '').trim();
      return { visibility: vis, cleanBio };
    }
  }

  const vis: ProfileVisibility = row.is_public === false ? 'private' : 'public';
  const cleanBio = row.bio ? row.bio.replace(/<!--vis:(public|friends|private)-->/g, '').trim() : '';
  return { visibility: vis, cleanBio };
}

export function mapRowToProfile(row: RawProfileRow): UserProfile {
  const { visibility, cleanBio } = extractVisibility(row);
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url,
    bio: cleanBio,
    isPublic: visibility === 'public',
    visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const PROFILE_CACHE_PREFIX = 'nexus_library_profile_';
const GUEST_ALIAS_KEY = 'nexus_library_guest_alias';
const GUEST_AVATAR_KEY = 'nexus_library_guest_avatar';

export const profileService = {
  /**
   * Obtiene el perfil cacheado en el almacenamiento local para evitar parpadeos
   */
  getCachedProfile(userId: string): UserProfile | null {
    try {
      const raw = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`);
      if (!raw) return null;
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  },

  /**
   * Guarda el perfil en el almacenamiento local
   */
  setCachedProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(`${PROFILE_CACHE_PREFIX}${profile.id}`, JSON.stringify(profile));
    } catch {
      // Ignorar errores de cuota de almacenamiento
    }
  },

  /**
   * Carga el perfil desde Supabase. Si el usuario aún no tiene fila en la tabla profiles
   * (por ejemplo, cuentas creadas antes del trigger), crea automáticamente una fila por defecto.
   */
  async fetchUserProfile(userId: string, emailFallback?: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error al obtener perfil desde Supabase:', error.message);
        return this.getCachedProfile(userId);
      }

      if (data) {
        const profile = mapRowToProfile(data as RawProfileRow);
        this.setCachedProfile(profile);
        return profile;
      }

      // Si no existe fila en profiles, crearla automáticamente
      const baseName = emailFallback ? emailFallback.split('@')[0] : 'lector';
      const cleanUsername = `${baseName.toLowerCase().replace(/[^a-z0-9_]/g, '')}_${userId.slice(0, 4)}`;
      const displayName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

      const initialRow: Partial<RawProfileRow> = {
        id: userId,
        username: cleanUsername,
        display_name: displayName,
        bio: '',
        is_public: true
      };

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert(initialRow)
        .select()
        .single();

      if (insertError || !inserted) {
        console.warn('No se pudo inicializar la fila de perfil:', insertError?.message);
        return this.getCachedProfile(userId);
      }

      const profile = mapRowToProfile(inserted as RawProfileRow);
      this.setCachedProfile(profile);
      return profile;
    } catch (err) {
      console.warn('Excepción al cargar perfil de Supabase:', err);
      return this.getCachedProfile(userId);
    }
  },

  /**
   * Actualiza los datos del perfil en Supabase y sincroniza la caché local
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const current = this.getCachedProfile(userId);
    const targetVisibility: ProfileVisibility =
      updates.visibility !== undefined
        ? updates.visibility
        : updates.isPublic !== undefined
        ? updates.isPublic
          ? 'public'
          : 'private'
        : current?.visibility || (current?.isPublic === false ? 'private' : 'public');

    const isPublicBoolean = targetVisibility === 'public';

    let rawBio = updates.bio ? updates.bio.trim() : (current?.bio || '');
    rawBio = rawBio.replace(/<!--vis:(public|friends|private)-->/g, '').trim();

    let bioToSave: string | null = rawBio;
    if (targetVisibility === 'friends') {
      bioToSave = rawBio ? `${rawBio} <!--vis:friends-->` : '<!--vis:friends-->';
    } else if (targetVisibility === 'private') {
      bioToSave = rawBio ? `${rawBio} <!--vis:private-->` : '<!--vis:private-->';
    } else {
      bioToSave = rawBio || null;
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      is_public: isPublicBoolean
    };

    if (updates.username !== undefined) {
      payload.username = updates.username.toLowerCase().trim();
    }
    if (updates.displayName !== undefined) {
      payload.display_name = updates.displayName.trim();
    }
    if (updates.avatarUrl !== undefined) {
      payload.avatar_url = updates.avatarUrl;
    }
    if (updates.bio !== undefined || updates.visibility !== undefined || updates.isPublic !== undefined) {
      payload.bio = bioToSave;
    }

    let resultRow: RawProfileRow | null = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...payload, visibility: targetVisibility })
        .eq('id', userId)
        .select()
        .single();

      if (!error && data) {
        resultRow = data as RawProfileRow;
      }
    } catch {
      // Ignorado si la columna aún no existe en Supabase
    }

    if (!resultRow) {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Error al guardar los cambios del perfil');
      }
      resultRow = data as RawProfileRow;
    }

    const updatedProfile = mapRowToProfile(resultRow);
    updatedProfile.visibility = targetVisibility;
    updatedProfile.isPublic = targetVisibility === 'public';
    updatedProfile.bio = rawBio;

    this.setCachedProfile(updatedProfile);
    return updatedProfile;
  },

  /**
   * Comprueba si un nombre de usuario (@username) está disponible o ya pertenece a otro usuario
   */
  async checkUsernameAvailable(
    username: string,
    currentUserId: string
  ): Promise<{ available: boolean; reason?: string }> {
    const clean = username.toLowerCase().trim();

    if (clean.length < 3) {
      return { available: false, reason: 'El nombre de usuario debe tener al menos 3 caracteres.' };
    }

    if (clean.length > 25) {
      return { available: false, reason: 'El nombre de usuario no puede superar los 25 caracteres.' };
    }

    if (!/^[a-z0-9_]+$/.test(clean)) {
      return {
        available: false,
        reason: 'Solo se permiten letras minúsculas, números y guiones bajos (_).'
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', currentUserId)
        .maybeSingle();

      if (error) {
        return { available: true };
      }

      if (data) {
        return { available: false, reason: 'Este nombre de usuario ya está en uso por otro lector.' };
      }

      return { available: true };
    } catch {
      return { available: true };
    }
  },

  /**
   * Alias local para usuarios en modo invitado (sin cuenta)
   */
  getGuestAlias(): string {
    try {
      return localStorage.getItem(GUEST_ALIAS_KEY) || '';
    } catch {
      return '';
    }
  },

  setGuestAlias(alias: string): void {
    try {
      if (alias.trim()) {
        localStorage.setItem(GUEST_ALIAS_KEY, alias.trim());
      } else {
        localStorage.removeItem(GUEST_ALIAS_KEY);
      }
    } catch {
      // Ignorar errores de storage
    }
  },

  /**
   * Avatar local para usuarios en modo invitado (sin cuenta)
   */
  getGuestAvatar(): string | null {
    try {
      return localStorage.getItem(GUEST_AVATAR_KEY) || null;
    } catch {
      return null;
    }
  },

  setGuestAvatar(avatarUrl: string | null): void {
    try {
      if (avatarUrl && avatarUrl.trim()) {
        localStorage.setItem(GUEST_AVATAR_KEY, avatarUrl.trim());
      } else {
        localStorage.removeItem(GUEST_AVATAR_KEY);
      }
    } catch {
      // Ignorar errores de storage
    }
  }
};
