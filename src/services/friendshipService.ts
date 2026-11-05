import { supabase } from './supabaseClient';
import { Friendship, FriendshipStatus, UserProfile, Book, StarRating } from '../types/models';
import { normalizeText } from '../constants/catalogs';
import { mapRowToProfile, RawProfileRow } from './profileService';
import { broadcastInboxNotification, broadcastFriendshipSync } from './pushNotificationService';

interface RawFriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

// RawProfileRow imported

function mapProfile(row: RawProfileRow): UserProfile {
  return mapRowToProfile(row);
}

export const friendshipService = {
  /**
   * Comprueba si dos usuarios son amigos aceptados mutuamente
   */
  async isFriend(userIdA: string, userIdB: string): Promise<boolean> {
    if (!userIdA || !userIdB || userIdA === userIdB) return false;
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(
          `and(requester_id.eq.${userIdA},addressee_id.eq.${userIdB}),and(requester_id.eq.${userIdB},addressee_id.eq.${userIdA})`
        )
        .limit(1);

      return Boolean(!error && data && data.length > 0);
    } catch {
      return false;
    }
  },
  /**
   * Obtiene la lista de amigos aceptados de un usuario con sus perfiles cargados
   */
  async getFriends(currentUserId: string): Promise<Friendship[]> {
    if (!currentUserId) return [];

    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      if (error || !rows || rows.length === 0) {
        return [];
      }

      // Obtener los IDs de los amigos
      const friendIds = rows.map((r: RawFriendshipRow) =>
        r.requester_id === currentUserId ? r.addressee_id : r.requester_id
      );

      // Cargar perfiles de los amigos en bloque
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, is_public')
        .in('id', friendIds);

      const profileMap = new Map<string, UserProfile>();
      if (Array.isArray(profilesData)) {
        for (const p of profilesData as RawProfileRow[]) {
          profileMap.set(p.id, mapProfile(p));
        }
      }

      return (rows as RawFriendshipRow[]).map((r): Friendship => {
        const friendId = r.requester_id === currentUserId ? r.addressee_id : r.requester_id;
        return {
          id: r.id,
          requesterId: r.requester_id,
          addresseeId: r.addressee_id,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          friendProfile: profileMap.get(friendId)
        };
      });
    } catch (err) {
      console.warn('Excepción al cargar amigos:', err);
      return [];
    }
  },

  /**
   * Mapa de estados de amistad con respecto a otros usuarios
   * Útil para saber rápidamente en las tarjetas de usuarios si es 'friend', 'pending_sent', 'pending_received'
   */
  async getFriendshipMap(
    currentUserId: string
  ): Promise<
    Record<
      string,
      {
        status: FriendshipStatus;
        friendshipId: string;
        isRequester: boolean;
      }
    >
  > {
    if (!currentUserId) return {};

    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      if (error || !rows) return {};

      const map: Record<
        string,
        { status: FriendshipStatus; friendshipId: string; isRequester: boolean }
      > = {};

      for (const r of rows as RawFriendshipRow[]) {
        const isRequester = r.requester_id === currentUserId;
        const otherId = isRequester ? r.addressee_id : r.requester_id;
        map[otherId] = {
          status: r.status,
          friendshipId: r.id,
          isRequester
        };
      }

      return map;
    } catch (err) {
      console.warn('Excepción al obtener mapa de amistades:', err);
      return {};
    }
  },

  /**
   * Solicitudes de amistad pendientes (recibidas y enviadas)
   */
  async getPendingRequests(
    currentUserId: string
  ): Promise<{ received: Friendship[]; sent: Friendship[] }> {
    if (!currentUserId) return { received: [], sent: [] };

    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'pending')
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

      if (error || !rows || rows.length === 0) {
        return { received: [], sent: [] };
      }

      const otherIds = rows.map((r: RawFriendshipRow) =>
        r.requester_id === currentUserId ? r.addressee_id : r.requester_id
      );

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, is_public')
        .in('id', otherIds);

      const profileMap = new Map<string, UserProfile>();
      if (Array.isArray(profilesData)) {
        for (const p of profilesData as RawProfileRow[]) {
          profileMap.set(p.id, mapProfile(p));
        }
      }

      const received: Friendship[] = [];
      const sent: Friendship[] = [];

      for (const r of rows as RawFriendshipRow[]) {
        const isRequester = r.requester_id === currentUserId;
        const otherId = isRequester ? r.addressee_id : r.requester_id;
        const friendship: Friendship = {
          id: r.id,
          requesterId: r.requester_id,
          addresseeId: r.addressee_id,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          friendProfile: profileMap.get(otherId)
        };

        if (isRequester) {
          sent.push(friendship);
        } else {
          received.push(friendship);
        }
      }

      return { received, sent };
    } catch (err) {
      console.warn('Excepción al obtener solicitudes pendientes:', err);
      return { received: [], sent: [] };
    }
  },

  /**
   * Envía una solicitud de amistad a otro lector
   */
  async sendFriendRequest(
    requesterId: string,
    addresseeId: string
  ): Promise<{ success: boolean; message: string; friendshipId?: string }> {
    if (!requesterId || !addresseeId) {
      return { success: false, message: 'Identificadores de usuario inválidos.' };
    }
    if (requesterId === addresseeId) {
      return { success: false, message: 'No puedes enviarte una solicitud a ti mismo.' };
    }

    try {
      // Comprobar si ya existe una relación previa
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status, requester_id, addressee_id')
        .or(
          `and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`
        )
        .maybeSingle();

      if (existing) {
        if (existing.status === 'accepted') {
          return { success: false, message: 'Ya eres amigo de este lector.' };
        }
        if (existing.status === 'pending') {
          if (existing.requester_id === requesterId) {
            return { success: false, message: 'Ya tienes una solicitud pendiente enviada a este lector.' };
          } else {
            // El otro usuario ya te había enviado solicitud, la aceptamos automáticamente
            const { error: acceptErr } = await supabase
              .from('friendships')
              .update({ status: 'accepted', updated_at: new Date().toISOString() })
              .eq('id', existing.id);

            if (!acceptErr) {
              return { success: true, message: '¡Solicitud mutua aceptada! Ya sois amigos.', friendshipId: existing.id };
            }
          }
        }
        // Si estaba declinada, se puede reactivar
        const { error: reactivateErr } = await supabase
          .from('friendships')
          .update({
            requester_id: requesterId,
            addressee_id: addresseeId,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (reactivateErr) {
          return { success: false, message: 'No se pudo enviar la solicitud. Inténtalo más tarde.' };
        }

        // Notificar en tiempo real y vía push al destinatario
        this.notifyFriendRequest(requesterId, addresseeId).catch(() => null);

        return { success: true, message: 'Solicitud de amistad enviada con éxito.', friendshipId: existing.id };
      }

      // Nueva solicitud
      const { data: inserted, error: insertErr } = await supabase
        .from('friendships')
        .insert({
          requester_id: requesterId,
          addressee_id: addresseeId,
          status: 'pending'
        })
        .select('id')
        .single();

      if (insertErr) {
        return { success: false, message: 'No se pudo enviar la solicitud. Asegúrate de tener conexión.' };
      }

      // Notificar en tiempo real y vía push al destinatario
      this.notifyFriendRequest(requesterId, addresseeId).catch(() => null);

      return {
        success: true,
        message: 'Solicitud de amistad enviada con éxito.',
        friendshipId: inserted?.id
      };
    } catch {
      return { success: false, message: 'Error de red al conectar con el servidor.' };
    }
  },

  /**
   * Helper interno para emitir la notificación instantánea al usuario destinatario
   */
  async notifyFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', requesterId)
        .maybeSingle();

      const senderName = profile?.display_name || profile?.username || 'Un lector';
      await broadcastInboxNotification({
        recipientId: addresseeId,
        senderId: requesterId,
        type: 'friend_request',
        title: '¡Nueva solicitud de amistad!',
        body: `${senderName} quiere conectar contigo en Nexus Library.`,
        tab: 'friend_requests',
        avatarUrl: profile?.avatar_url || ''
      });
    } catch {
      // Silencioso
    }
  },

  /**
   * Helper interno para emitir notificación push/inbox cuando una solicitud es aceptada
   */
  async notifyFriendAccepted(accepterId: string, requesterId: string): Promise<void> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', accepterId)
        .maybeSingle();

      const accepterName = profile?.display_name || profile?.username || 'Un lector';
      await broadcastInboxNotification({
        recipientId: requesterId,
        senderId: accepterId,
        type: 'friend_request',
        title: '¡Solicitud de amistad aceptada!',
        body: `¡${accepterName} y tú ya sois amigos de lectura en Nexus Library!`,
        tab: 'friend_requests',
        avatarUrl: profile?.avatar_url || ''
      });
    } catch {
      // Silencioso
    }
  },

  /**
   * Responder a una solicitud recibida (aceptar o rechazar)
   */
  async respondFriendRequest(
    friendshipId: string,
    action: 'accept' | 'decline'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const newStatus: FriendshipStatus = action === 'accept' ? 'accepted' : 'declined';
      const { data: updated, error } = await supabase
        .from('friendships')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', friendshipId)
        .select('requester_id, addressee_id')
        .maybeSingle();

      if (error) {
        return { success: false, message: 'No se pudo responder a la solicitud.' };
      }

      if (updated) {
        broadcastFriendshipSync(updated.requester_id, updated.addressee_id).catch(() => null);
        if (action === 'accept') {
          this.notifyFriendAccepted(updated.addressee_id, updated.requester_id).catch(() => null);
        }
      }

      return {
        success: true,
        message: action === 'accept' ? '¡Solicitud aceptada! Ahora sois amigos.' : 'Solicitud rechazada.'
      };
    } catch {
      return { success: false, message: 'Ocurrió un error de conexión.' };
    }
  },

  /**
   * Eliminar o cancelar amistad
   */
  async removeFriend(friendshipId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data: deleted, error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
        .select('requester_id, addressee_id')
        .maybeSingle();

      if (error) {
        return { success: false, message: 'No se pudo eliminar al amigo.' };
      }

      if (deleted) {
        broadcastFriendshipSync(deleted.requester_id, deleted.addressee_id).catch(() => null);
      }

      return { success: true, message: 'Amigo eliminado de tu lista.' };
    } catch {
      return { success: false, message: 'Error de conexión al eliminar amigo.' };
    }
  },

  /**
   * Cancelar una solicitud de amistad enviada pendiente
   */
  async cancelFriendRequest(friendshipId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data: deleted, error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
        .select('requester_id, addressee_id')
        .maybeSingle();

      if (error) {
        return { success: false, message: 'No se pudo cancelar la solicitud de amistad.' };
      }

      if (deleted) {
        broadcastFriendshipSync(deleted.requester_id, deleted.addressee_id).catch(() => null);
      }

      return { success: true, message: 'Solicitud de amistad cancelada con éxito.' };
    } catch {
      return { success: false, message: 'Error de conexión al cancelar la solicitud.' };
    }
  },

  calculateBookAffinity
};


export interface CommonBookComparison {
  myBook: Book;
  readerBook: Book;
  title: string;
  author: string;
  myRating: StarRating | number | null;
  readerRating: StarRating | number | null;
}

export interface BookAffinityResult {
  percentage: number;
  commonBooks: CommonBookComparison[];
  commonAuthors: string[];
  gemsForYou: Book[];
  genresInCommon: string[];
}

export function calculateBookAffinity(myBooks: Book[] = [], readerBooks: Book[] = []): BookAffinityResult {
  if (!Array.isArray(myBooks) || !Array.isArray(readerBooks) || myBooks.length === 0 || readerBooks.length === 0) {
    return {
      percentage: 0,
      commonBooks: [],
      commonAuthors: [],
      gemsForYou: (readerBooks || []).filter((b) => (Number(b.puntuacion) >= 4)),
      genresInCommon: []
    };
  }

  const cleanKey = (str: string) => normalizeText(str || '').replace(/[^a-z0-9]/g, '');

  // Indexar mis libros por título normalizado e ISBN
  const myByTitle = new Map<string, Book>();
  const myByIsbn = new Map<string, Book>();
  const myAuthorsSet = new Set<string>();
  const myGenresSet = new Set<string>();

  for (const b of myBooks) {
    if (b.nombre) myByTitle.set(cleanKey(b.nombre), b);
    if (b.isbn) myByIsbn.set(b.isbn.replace(/[^0-9X]/gi, ''), b);
    if (b.autor) myAuthorsSet.add(normalizeText(b.autor));
    if (b.genero) myGenresSet.add(normalizeText(b.genero));
  }

  const commonBooks: CommonBookComparison[] = [];
  const commonAuthorsSet = new Set<string>();
  const genresInCommonSet = new Set<string>();
  const matchedMyBookIds = new Set<string>();

  for (const rb of readerBooks) {
    const rKey = cleanKey(rb.nombre);
    const rIsbn = rb.isbn ? rb.isbn.replace(/[^0-9X]/gi, '') : '';
    const match = (rIsbn && myByIsbn.get(rIsbn)) || (rKey && myByTitle.get(rKey));

    if (match) {
      matchedMyBookIds.add(match.id);
      commonBooks.push({
        myBook: match,
        readerBook: rb,
        title: rb.nombre || match.nombre,
        author: rb.autor || match.autor,
        myRating: match.puntuacion,
        readerRating: rb.puntuacion
      });
    }

    if (rb.autor && myAuthorsSet.has(normalizeText(rb.autor))) {
      commonAuthorsSet.add(rb.autor);
    }
    if (rb.genero && myGenresSet.has(normalizeText(rb.genero))) {
      genresInCommonSet.add(rb.genero);
    }
  }

  // Joyas para ti: libros de readerBooks valorados >= 4 que no están en mis libros
  const gemsForYou = readerBooks.filter((rb) => {
    const rKey = cleanKey(rb.nombre);
    const rIsbn = rb.isbn ? rb.isbn.replace(/[^0-9X]/gi, '') : '';
    const isInMyBooks = (rIsbn && myByIsbn.has(rIsbn)) || (rKey && myByTitle.has(rKey));
    return !isInMyBooks && Number(rb.puntuacion) >= 4;
  });

  const commonAuthors = Array.from(commonAuthorsSet);
  const genresInCommon = Array.from(genresInCommonSet);

  // Cálculo del porcentaje de afinidad
  let percentage = 0;
  if (commonBooks.length > 0) {
    let score = Math.min(80, 35 + commonBooks.length * 15 + commonAuthors.length * 6);
    // Bonificación si las puntuaciones de los libros en común están alineadas
    let ratingBonus = 0;
    for (const cb of commonBooks) {
      if (cb.myRating && cb.readerRating) {
        const diff = Math.abs(Number(cb.myRating) - Number(cb.readerRating));
        if (diff <= 0.5) ratingBonus += 8;
        else if (diff <= 1) ratingBonus += 4;
      }
    }
    percentage = Math.min(100, Math.round(score + ratingBonus));
  } else if (commonAuthors.length > 0 || genresInCommon.length > 0) {
    percentage = Math.min(55, Math.round(commonAuthors.length * 12 + genresInCommon.length * 8));
  }

  return {
    percentage,
    commonBooks,
    commonAuthors,
    gemsForYou,
    genresInCommon
  };
}


