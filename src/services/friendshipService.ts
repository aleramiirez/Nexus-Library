import { supabase } from './supabaseClient';
import { Friendship, FriendshipStatus, UserProfile } from '../types/models';

interface RawFriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
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

export const friendshipService = {
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
   * Responder a una solicitud recibida (aceptar o rechazar)
   */
  async respondFriendRequest(
    friendshipId: string,
    action: 'accept' | 'decline'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const newStatus: FriendshipStatus = action === 'accept' ? 'accepted' : 'declined';
      const { error } = await supabase
        .from('friendships')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) {
        return { success: false, message: 'No se pudo responder a la solicitud.' };
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
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) {
        return { success: false, message: 'No se pudo eliminar al amigo.' };
      }
      return { success: true, message: 'Amigo eliminado de tu lista.' };
    } catch {
      return { success: false, message: 'Error de conexión al eliminar amigo.' };
    }
  }
};
