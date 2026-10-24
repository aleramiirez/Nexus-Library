import { supabase } from './supabaseClient';
import { UserProfile, Book } from '../types/models';
import { mapRowToBook, SupabaseBookRow } from '../db/database';

export const communityService = {
  /**
   * Busca perfiles públicos de lectores por nombre (@username o Alias)
   */
  async searchPublicProfiles(query: string, currentUserId?: string): Promise<UserProfile[]> {
    const clean = query.trim().replace(/^@/, '');

    let req = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public, created_at, updated_at')
      .eq('is_public', true);

    if (currentUserId) {
      req = req.neq('id', currentUserId);
    }

    if (clean) {
      req = req.or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`);
    }

    const { data, error } = await req
      .order('updated_at', { ascending: false })
      .limit(30);

    if (error || !data) {
      console.warn('Error al buscar lectores en Supabase:', error?.message);
      return [];
    }

    return data.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      isPublic: r.is_public ?? true,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  /**
   * Obtiene la estantería pública y perfil de otro lector
   */
  async fetchUserPublicLibrary(
    targetUserId: string
  ): Promise<{ profile: UserProfile; books: Book[] } | null> {
    try {
      // 1. Obtener perfil
      const { data: pRow, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (pError || !pRow) {
        return null;
      }

      const profile: UserProfile = {
        id: pRow.id,
        username: pRow.username,
        displayName: pRow.display_name,
        avatarUrl: pRow.avatar_url,
        bio: pRow.bio,
        isPublic: pRow.is_public ?? true,
        createdAt: pRow.created_at,
        updatedAt: pRow.updated_at
      };

      // Si el perfil no es público, retornar solo el perfil sin libros
      if (!profile.isPublic) {
        return { profile, books: [] };
      }

      // 2. Obtener libros públicos
      const { data: bRows, error: bError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', targetUserId)
        .order('updated_at', { ascending: false });

      if (bError || !bRows) {
        return { profile, books: [] };
      }

      const books = (bRows as SupabaseBookRow[]).map(mapRowToBook);
      return { profile, books };
    } catch (err) {
      console.warn('Excepción al cargar la biblioteca pública:', err);
      return null;
    }
  }
};
