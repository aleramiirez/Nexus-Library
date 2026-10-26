import { supabase } from './supabaseClient';
import { UserProfile, Book } from '../types/models';
import { mapRowToBook, SupabaseBookRow } from '../db/database';
import { mapRowToProfile, RawProfileRow } from './profileService';
import { friendshipService } from './friendshipService';

export const communityService = {
  /**
   * Busca perfiles de lectores por nombre (@username o Alias)
   */
  async searchPublicProfiles(query: string, currentUserId?: string): Promise<UserProfile[]> {
    const clean = query.trim().replace(/^@/, '');

    let req = supabase
      .from('profiles')
      .select('*');

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

    return data.map((r) => mapRowToProfile(r as RawProfileRow));
  },

  /**
   * Obtiene la estantería y perfil de otro lector considerando su nivel de visibilidad
   * (Público, Solo amigos, Privado).
   */
  async fetchUserPublicLibrary(
    targetUserId: string,
    currentUserId?: string
  ): Promise<{ profile: UserProfile; books: Book[]; canViewShelf: boolean } | null> {
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

      const profile = mapRowToProfile(pRow as RawProfileRow);

      // Comprobar permisos de visibilidad para ver la estantería
      const isCurrentUser = Boolean(currentUserId && currentUserId === targetUserId);
      let isFriend = false;
      if (currentUserId && !isCurrentUser) {
        isFriend = await friendshipService.isFriend(currentUserId, targetUserId);
      }

      const visibility = profile.visibility || (profile.isPublic ? 'public' : 'private');
      const canViewShelf =
        isCurrentUser || visibility === 'public' || (visibility === 'friends' && isFriend);

      // Si no tiene permiso para ver la estantería, retornar solo el perfil
      if (!canViewShelf) {
        return { profile, books: [], canViewShelf: false };
      }

      // 2. Obtener libros de la estantería
      const { data: bRows, error: bError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', targetUserId)
        .order('updated_at', { ascending: false });

      if (bError || !bRows) {
        return { profile, books: [], canViewShelf: true };
      }

      const books = (bRows as SupabaseBookRow[]).map(mapRowToBook);
      return { profile, books, canViewShelf: true };
    } catch (err) {
      console.warn('Excepción al cargar la biblioteca del lector:', err);
      return null;
    }
  }
};
