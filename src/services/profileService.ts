import { supabase } from './supabaseClient';
import { UserProfile } from '../types/models';

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

const PROFILE_CACHE_PREFIX = 'nexus_library_profile_';
const GUEST_ALIAS_KEY = 'nexus_library_guest_alias';

function mapRowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    isPublic: row.is_public ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

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
        const profile = mapRowToProfile(data as ProfileRow);
        this.setCachedProfile(profile);
        return profile;
      }

      // Si no existe fila en profiles, crearla automáticamente
      const baseName = emailFallback ? emailFallback.split('@')[0] : 'lector';
      const cleanUsername = `${baseName.toLowerCase().replace(/[^a-z0-9_]/g, '')}_${userId.slice(0, 4)}`;
      const displayName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

      const initialRow: Partial<ProfileRow> = {
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

      const profile = mapRowToProfile(inserted as ProfileRow);
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
    const payload: Partial<ProfileRow> = {
      updated_at: new Date().toISOString()
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
    if (updates.bio !== undefined) {
      payload.bio = updates.bio ? updates.bio.trim() : null;
    }
    if (updates.isPublic !== undefined) {
      payload.is_public = updates.isPublic;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al guardar los cambios del perfil');
    }

    const updatedProfile = mapRowToProfile(data as ProfileRow);
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
  }
};
