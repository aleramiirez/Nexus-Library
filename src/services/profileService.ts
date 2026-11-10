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
  order_frame?: string | null;
  level?: number | null;
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

export function extractMetadata(row: {
  is_public?: boolean | null;
  visibility?: string | null;
  bio?: string | null;
  order_frame?: string | null;
  level?: number | null;
  total_xp?: number | null;
}): {
  visibility: ProfileVisibility;
  cleanBio: string;
  orderFrame?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX' | 'X';
  level?: number;
  totalXp?: number;
} {
  const { visibility } = extractVisibility(row);
  let cleanBio = row.bio ? row.bio.replace(/<!--vis:(public|friends|private)-->/g, '').trim() : '';

  let orderFrame: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX' | 'X' | undefined = undefined;
  if (row.order_frame && /^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(row.order_frame)) {
    orderFrame = row.order_frame.toUpperCase() as any;
  } else if (row.bio) {
    const frameMatch = row.bio.match(/<!--frame:(I|II|III|IV|V|VI|VII|VIII|IX|X)-->/i);
    if (frameMatch) {
      orderFrame = frameMatch[1].toUpperCase() as any;
    }
  }

  let level = typeof row.level === 'number' && !isNaN(row.level) ? row.level : undefined;
  if (level === undefined && row.bio) {
    const lvlMatch = row.bio.match(/<!--lvl:(\d+)-->/);
    if (lvlMatch) {
      level = parseInt(lvlMatch[1], 10);
    }
  }

  let totalXp = typeof (row as any).total_xp === 'number' && !isNaN((row as any).total_xp) ? (row as any).total_xp : undefined;
  if (totalXp === undefined && row.bio) {
    const xpMatch = row.bio.match(/<!--xp:(\d+)-->/);
    if (xpMatch) {
      totalXp = parseInt(xpMatch[1], 10);
    }
  }

  if (row.bio) {
    cleanBio = cleanBio
      .replace(/<!--frame:[A-Za-z0-9]+-->/g, '')
      .replace(/<!--lvl:\d+-->/g, '')
      .replace(/<!--xp:\d+-->/g, '')
      .trim();
  }

  return { visibility, cleanBio, orderFrame, level, totalXp };
}

export function mapRowToProfile(row: RawProfileRow): UserProfile {
  const { visibility, cleanBio, orderFrame, level, totalXp } = extractMetadata(row);
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url,
    bio: cleanBio,
    isPublic: visibility === 'public',
    visibility,
    orderFrame,
    level,
    totalXp,
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

    const targetOrderFrame = updates.orderFrame !== undefined ? updates.orderFrame : current?.orderFrame;
    const targetLevel = updates.level !== undefined ? updates.level : current?.level;
    const targetTotalXp = updates.totalXp !== undefined ? updates.totalXp : current?.totalXp;

    rawBio = rawBio
      .replace(/<!--frame:[A-Za-z0-9]+-->/g, '')
      .replace(/<!--lvl:\d+-->/g, '')
      .replace(/<!--xp:\d+-->/g, '')
      .trim();

    const metadataTags: string[] = [];
    if (targetVisibility === 'friends') metadataTags.push('<!--vis:friends-->');
    else if (targetVisibility === 'private') metadataTags.push('<!--vis:private-->');
    if (targetOrderFrame) metadataTags.push(`<!--frame:${targetOrderFrame}-->`);
    if (typeof targetLevel === 'number') metadataTags.push(`<!--lvl:${targetLevel}-->`);
    if (typeof targetTotalXp === 'number') metadataTags.push(`<!--xp:${targetTotalXp}-->`);

    let bioToSave: string | null = rawBio;
    if (metadataTags.length > 0) {
      bioToSave = rawBio ? `${rawBio} ${metadataTags.join(' ')}` : metadataTags.join(' ');
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
    if (updates.orderFrame !== undefined) {
      payload.order_frame = updates.orderFrame;
    }
    if (updates.level !== undefined) {
      payload.level = updates.level;
    }
    if (updates.totalXp !== undefined) {
      payload.total_xp = updates.totalXp;
    }
    if (updates.bio !== undefined || updates.visibility !== undefined || updates.isPublic !== undefined || updates.orderFrame !== undefined || updates.level !== undefined || updates.totalXp !== undefined) {
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
      // Ignorado si la columna visibility no existe en Supabase
    }

    if (!resultRow) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', userId)
          .select()
          .single();

        if (!error && data) {
          resultRow = data as RawProfileRow;
        }
      } catch {
        // Ignorado si alguna columna de payload no existe en Supabase
      }
    }

    // Fallback con columnas seguras estándar (sin order_frame ni level directo, que se guardan en bio)
    if (!resultRow) {
      const safePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        is_public: isPublicBoolean,
        bio: bioToSave
      };
      if (payload.username !== undefined) safePayload.username = payload.username;
      if (payload.display_name !== undefined) safePayload.display_name = payload.display_name;
      if (payload.avatar_url !== undefined) safePayload.avatar_url = payload.avatar_url;

      let { data, error } = await supabase
        .from('profiles')
        .update(safePayload)
        .eq('id', userId)
        .select()
        .single();

      // Si no existe la fila o falla el update por RLS, intentar upsert
      if (error || !data) {
        const upsertRes = await supabase
          .from('profiles')
          .upsert({ id: userId, ...safePayload })
          .select()
          .single();
        data = upsertRes.data;
        error = upsertRes.error;
      }

      if (error || !data) {
        console.warn('[profileService] Error persistiendo en Supabase, usando caché local:', error?.message);
        // Si falla la red o políticas de Supabase, construir el perfil local para no bloquear la UI
        resultRow = {
          id: userId,
          username: (payload.username as string) || current?.username || 'lector',
          display_name: (payload.display_name as string) || current?.displayName || 'Lector',
          avatar_url: (payload.avatar_url as string) ?? current?.avatarUrl ?? null,
          bio: bioToSave,
          is_public: isPublicBoolean,
          updated_at: new Date().toISOString()
        };
      } else {
        resultRow = data as RawProfileRow;
      }
    }

    const updatedProfile = mapRowToProfile(resultRow);
    updatedProfile.visibility = targetVisibility;
    updatedProfile.isPublic = targetVisibility === 'public';
    updatedProfile.bio = rawBio;
    if (targetOrderFrame) updatedProfile.orderFrame = targetOrderFrame;
    if (typeof targetLevel === 'number') updatedProfile.level = targetLevel;
    if (typeof targetTotalXp === 'number') updatedProfile.totalXp = targetTotalXp;

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
