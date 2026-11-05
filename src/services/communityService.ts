import { supabase } from './supabaseClient';
import { UserProfile, Book } from '../types/models';
import { mapRowToBook, SupabaseBookRow } from '../db/database';
import { mapRowToProfile, RawProfileRow } from './profileService';
import { friendshipService } from './friendshipService';
import { calculateGuardianProgress, OrderRankId } from './levelingService';

export interface CommunityReaderSummary {
  profile: UserProfile;
  totalBooks: number;
  readingCount: number;
  pausedCount: number;
  readCount: number;
  unreadCount: number;
  books?: Book[];
}

export interface FriendActivityItem {
  friend: UserProfile;
  book: Book;
}

export interface FriendsActivitySummary {
  readingNow: FriendActivityItem[];
  recentReadsAndReviews: FriendActivityItem[];
  friendsReadingCounts: Record<string, number>;
  friendsRanks: Record<string, { orderFrame: OrderRankId; level: number }>;
}

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
   * Obtiene los libros públicos de un lector con todas sus columnas extendidas
   * (página actual, país, reseña, citas, formato, propiedad, veces leído, historial).
   */
  async fetchPublicReaderBooks(userId: string): Promise<Book[]> {
    if (!userId) return [];
    try {
      // 1. Intentar seleccionar todas las columnas con '*'
      let { data: bRows, error: bError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      // Fallback si alguna columna extendida da error de esquema
      if (bError && bError.message?.includes('column')) {
        const fallback = await supabase
          .from('books')
          .select('id, user_id, data, created_at, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        bRows = fallback.data;
        bError = fallback.error;
      }

      if (bError || !bRows) {
        console.warn('Error al cargar libros del lector:', bError?.message);
        return [];
      }

      return (bRows as SupabaseBookRow[]).map((row: any): Book => {
        const base = mapRowToBook(row);
        const d = row.data || {};

        const rawPagina = typeof row.pagina_actual === 'number'
          ? row.pagina_actual
          : typeof d.paginaActual === 'number'
          ? d.paginaActual
          : null;

        const rawPais = row.pais || d.pais || base.pais || '';
        const rawResena = row.resena || d.resena || d.notasPersonales || base.notasPersonales || '';
        const rawCitas = Array.isArray(row.citas)
          ? row.citas
          : Array.isArray(d.citas)
          ? d.citas
          : base.citas || [];
        const rawFormato = row.formato || d.formato || base.formato || '';
        const rawPropiedad = row.propiedad || d.propiedad || base.propiedad || '';
        const rawVecesLeido = typeof row.veces_leido === 'number'
          ? row.veces_leido
          : typeof d.vecesLeido === 'number'
          ? d.vecesLeido
          : base.vecesLeido;
        const rawHistorial = Array.isArray(row.historial_lecturas)
          ? row.historial_lecturas
          : Array.isArray(d.historialLecturas)
          ? d.historialLecturas
          : base.historialLecturas;

        return {
          ...base,
          paginaActual: rawPagina,
          pais: rawPais,
          resena: rawResena,
          notasPersonales: rawResena,
          citas: rawCitas,
          formato: rawFormato as any,
          propiedad: rawPropiedad as any,
          vecesLeido: rawVecesLeido,
          historialLecturas: rawHistorial
        };
      });
    } catch (err) {
      console.warn('Excepción en fetchPublicReaderBooks:', err);
      return [];
    }
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

      // 2. Obtener libros completos de la estantería usando fetchPublicReaderBooks
      const books = await this.fetchPublicReaderBooks(targetUserId);
      return { profile, books, canViewShelf: true };
    } catch (err) {
      console.warn('Excepción al cargar la biblioteca del lector:', err);
      return null;
    }
  },

  /**
   * Obtiene la lista de lectores de la comunidad con sus contadores de estantería
   * precisos (incluyendo Leyendo, Pausado, Leído, No Leído).
   */
  async fetchCommunityReaders(currentUserId?: string): Promise<CommunityReaderSummary[]> {
    try {
      const profiles = await this.searchPublicProfiles('', currentUserId);
      if (profiles.length === 0) return [];

      const userIds = profiles.map((p) => p.id);
      const { data: booksData } = await supabase
        .from('books')
        .select('*')
        .in('user_id', userIds);

      const booksByUser: Record<string, Book[]> = {};
      if (Array.isArray(booksData)) {
        for (const row of booksData as any[]) {
          const uid = row.user_id;
          if (!booksByUser[uid]) booksByUser[uid] = [];
          booksByUser[uid].push(mapRowToBook(row));
        }
      }

      return profiles.map((profile) => {
        const uBooks = booksByUser[profile.id] || [];
        let readingCount = 0;
        let pausedCount = 0;
        let readCount = 0;
        let unreadCount = 0;

        for (const b of uBooks) {
          const p = (b.progreso || '').toLowerCase();
          if (p.includes('leyendo') || p === 'reading') readingCount++;
          else if (p.includes('pausado') || p === 'paused') pausedCount++;
          else if (p.includes('leído') || p.includes('leido') || p === 'read') readCount++;
          else unreadCount++;
        }

        const progress = calculateGuardianProgress(uBooks);
        if (!profile.orderFrame) {
          profile.orderFrame = progress.rank.id;
        }
        if (profile.level === undefined) {
          profile.level = progress.level;
        }

        return {
          profile,
          totalBooks: uBooks.length,
          readingCount,
          pausedCount,
          readCount,
          unreadCount,
          books: uBooks
        };
      });
    } catch (err) {
      console.warn('Excepción en fetchCommunityReaders:', err);
      return [];
    }
  },

  /**
   * Carga la actividad del Círculo de Amigos para el feed social y la barra de Stories:
   * - Lecturas en curso ('⏳ Leyendo')
   * - Libros leídos recientemente o con reseñas y valoraciones ('✅ Leído')
   * - Mapa de libros en lectura por amigo para el anillo de Stories
   */
  async fetchFriendsActivity(currentUserId: string): Promise<FriendsActivitySummary> {
    const result: FriendsActivitySummary = {
      readingNow: [],
      recentReadsAndReviews: [],
      friendsReadingCounts: {},
      friendsRanks: {}
    };

    if (!currentUserId) return result;

    try {
      const acceptedFriendships = await friendshipService.getFriends(currentUserId);
      if (acceptedFriendships.length === 0) return result;

      const friendsMap = new Map<string, UserProfile>();
      const friendIds: string[] = [];

      for (const f of acceptedFriendships) {
        if (f.friendProfile) {
          friendsMap.set(f.friendProfile.id, f.friendProfile);
          friendIds.push(f.friendProfile.id);
          result.friendsReadingCounts[f.friendProfile.id] = 0;
        }
      }

      if (friendIds.length === 0) return result;

      // Obtener libros de amigos
      let { data: bRows, error: bError } = await supabase
        .from('books')
        .select('*')
        .in('user_id', friendIds)
        .order('updated_at', { ascending: false });

      if (bError && bError.message?.includes('column')) {
        const fallback = await supabase
          .from('books')
          .select('id, user_id, data, created_at, updated_at')
          .in('user_id', friendIds)
          .order('updated_at', { ascending: false });
        bRows = fallback.data;
        bError = fallback.error;
      }

      if (bError || !bRows) return result;

      for (const row of bRows as any[]) {
        const friend = friendsMap.get(row.user_id);
        if (!friend) continue;

        const base = mapRowToBook(row);
        const d = row.data || {};
        const book: Book = {
          ...base,
          paginaActual:
            typeof row.pagina_actual === 'number'
              ? row.pagina_actual
              : typeof d.paginaActual === 'number'
              ? d.paginaActual
              : base.paginaActual ?? null,
          pais: row.pais || d.pais || base.pais || '',
          resena: row.resena || d.resena || d.notasPersonales || base.notasPersonales || '',
          notasPersonales: d.notasPersonales || row.resena || d.resena || base.notasPersonales || '',
          citas: Array.isArray(row.citas) ? row.citas : Array.isArray(d.citas) ? d.citas : base.citas || [],
          formato: (row.formato || d.formato || base.formato || '') as any,
          propiedad: (row.propiedad || d.propiedad || base.propiedad || '') as any
        };

        const prog = (book.progreso || '').toLowerCase();
        const isReading = prog.includes('leyendo') || prog === 'reading';
        const isRead = (prog.includes('leído') || prog.includes('leido') || prog === 'read') && !prog.includes('no');

        if (isReading) {
          result.friendsReadingCounts[friend.id] = (result.friendsReadingCounts[friend.id] || 0) + 1;
          result.readingNow.push({ friend, book });
        } else if (isRead || (book.resena && book.resena.trim().length > 0) || book.puntuacion) {
          result.recentReadsAndReviews.push({ friend, book });
        }
      }

      // Calcular rango y marco de la Orden para cada amigo según su colección
      for (const [fId, friend] of friendsMap.entries()) {
        const friendBooks = (bRows as any[])
          .filter((r) => r.user_id === fId)
          .map((r) => mapRowToBook(r));
        const progress = calculateGuardianProgress(friendBooks);
        const effectiveFrame = friend.orderFrame || progress.rank.id;
        const effectiveLevel = friend.level || progress.level;
        friend.orderFrame = effectiveFrame;
        friend.level = effectiveLevel;
        result.friendsRanks[fId] = {
          orderFrame: effectiveFrame,
          level: effectiveLevel
        };
      }

      return result;
    } catch (err) {
      console.warn('Excepción al cargar actividad de amigos:', err);
      return result;
    }
  }
};

export const fetchPublicReaderBooks = communityService.fetchPublicReaderBooks.bind(communityService);
export const fetchCommunityReaders = communityService.fetchCommunityReaders.bind(communityService);
