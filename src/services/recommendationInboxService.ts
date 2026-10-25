import { supabase } from './supabaseClient';
import {
  Book,
  BibliographicCandidate,
  BookRecommendation,
  BookRecommendationPayload,
  RecommendationStatus,
  UserProfile
} from '../types/models';

interface RawRecommendationRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  book_data: BookRecommendationPayload;
  note: string;
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
}

interface RawProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  is_public?: boolean | null;
}

function mapProfile(row: RawProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    isPublic: row.is_public ?? true
  };
}

export const recommendationInboxService = {
  /**
   * Envía una recomendación de libro a un amigo
   */
  async sendRecommendation(params: {
    senderId: string;
    receiverId: string;
    book: Book | BibliographicCandidate;
    note?: string;
  }): Promise<{ success: boolean; message: string }> {
    const { senderId, receiverId, book, note } = params;

    if (!senderId || !receiverId) {
      return { success: false, message: 'Faltan datos de usuario para el envío.' };
    }
    if (senderId === receiverId) {
      return { success: false, message: 'No puedes enviarte una recomendación a ti mismo.' };
    }

    // Preparar el snapshot del libro
    const genero = 'genero' in book ? book.genero : (book.suggestedGenre || '');
    const subgeneros = 'subgeneros' in book ? (book.subgeneros || []) : (book.suggestedSubgenres || []);

    const payload: BookRecommendationPayload = {
      nombre: book.nombre.trim(),
      autor: book.autor.trim(),
      portadaUrl: book.portadaUrl || '',
      portadaFallbackUrl: book.portadaFallbackUrl || '',
      isbn: book.isbn || '',
      editorial: book.editorial || '',
      fechaPublicacion: book.fechaPublicacion || null,
      paginas: book.paginas || null,
      genero: genero as any,
      subgeneros: subgeneros as any,
      sinopsis: book.sinopsis || ''
    };

    try {
      const { error } = await supabase.from('book_recommendations').insert({
        sender_id: senderId,
        receiver_id: receiverId,
        book_data: payload,
        note: (note || '').trim(),
        status: 'unread'
      });

      if (error) {
        console.warn('Error al guardar recomendación en Supabase:', error.message);
        return { success: false, message: 'No se pudo enviar la recomendación. Inténtalo de nuevo.' };
      }

      return {
        success: true,
        message: `¡Recomendación de «${payload.nombre}» enviada con éxito!`
      };
    } catch {
      return { success: false, message: 'Error de conexión al enviar la recomendación.' };
    }
  },

  /**
   * Obtiene las recomendaciones recibidas por un usuario
   */
  async getReceivedRecommendations(userId: string): Promise<BookRecommendation[]> {
    if (!userId) return [];

    try {
      const { data: rows, error } = await supabase
        .from('book_recommendations')
        .select('*')
        .eq('receiver_id', userId)
        .neq('status', 'dismissed')
        .order('created_at', { ascending: false });

      if (error || !rows || rows.length === 0) {
        return [];
      }

      const senderIds = [...new Set(rows.map((r: RawRecommendationRow) => r.sender_id))];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, is_public')
        .in('id', senderIds);

      const profileMap = new Map<string, UserProfile>();
      if (Array.isArray(profilesData)) {
        for (const p of profilesData as RawProfileRow[]) {
          profileMap.set(p.id, mapProfile(p));
        }
      }

      return (rows as RawRecommendationRow[]).map((r): BookRecommendation => ({
        id: r.id,
        senderId: r.sender_id,
        receiverId: r.receiver_id,
        bookData: r.book_data,
        note: r.note || '',
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        senderProfile: profileMap.get(r.sender_id)
      }));
    } catch (err) {
      console.warn('Excepción al cargar recomendaciones recibidas:', err);
      return [];
    }
  },

  /**
   * Obtiene la cantidad de recomendaciones sin leer
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
      const { count, error } = await supabase
        .from('book_recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('status', 'unread');

      if (error || count === null) return 0;
      return count;
    } catch {
      return 0;
    }
  },

  /**
   * Obtiene la cantidad total de novedades en el buzón:
   * Recomendaciones de libros sin leer + Solicitudes de amistad pendientes recibidas
   */
  async getTotalInboxNotificationsCount(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
      const [recsRes, friendsRes] = await Promise.all([
        supabase
          .from('book_recommendations')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', userId)
          .eq('status', 'unread'),
        supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .eq('addressee_id', userId)
          .eq('status', 'pending')
      ]);

      const recsCount = recsRes.count || 0;
      const friendsCount = friendsRes.count || 0;
      return recsCount + friendsCount;
    } catch (err) {
      console.warn('Error al obtener novedades del buzón:', err);
      return 0;
    }
  },

  /**
   * Marca una recomendación como leída
   */
  async markAsRead(recommendationId: string): Promise<void> {
    try {
      await supabase
        .from('book_recommendations')
        .update({ status: 'read', updated_at: new Date().toISOString() })
        .eq('id', recommendationId)
        .eq('status', 'unread');
    } catch {
      // Silencioso
    }
  },

  /**
   * Marca una recomendación como aceptada (cuando el usuario la añade a su lista)
   */
  async acceptRecommendation(recommendationId: string): Promise<void> {
    try {
      await supabase
        .from('book_recommendations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', recommendationId);
    } catch {
      // Silencioso
    }
  },

  /**
   * Descarta una recomendación de la bandeja de entrada
   */
  async dismissRecommendation(recommendationId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('book_recommendations')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', recommendationId);

      return { success: !error };
    } catch {
      return { success: false };
    }
  }
};
