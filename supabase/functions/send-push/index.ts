// Supabase Edge Function: send-push
// Envía notificaciones Web Push a través de web-push cuando se insertan registros en friendships o book_recommendations

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

interface WebhookPayload {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  schema?: string;
  record?: Record<string, any>;
  old_record?: Record<string, any> | null;
  // Soporte directo para invocación manual
  userId?: string;
  title?: string;
  body?: string;
  tab?: 'recommendations' | 'friend_requests';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@nexuslibrary.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured in Edge Function environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    let targetUserId = '';
    let notificationTitle = 'Nexus Library';
    let notificationBody = 'Tienes una nueva novedad en tu biblioteca.';
    let notificationTab: 'recommendations' | 'friend_requests' = 'recommendations';
    let notificationTag = 'nexus-inbox';

    // 1. Caso de invocación manual directa
    if (payload.userId && payload.title) {
      targetUserId = payload.userId;
      notificationTitle = payload.title;
      notificationBody = payload.body || '';
      notificationTab = payload.tab || 'recommendations';
      notificationTag = `nexus-${notificationTab}`;
    }
    // 2. Caso Webhook de Supabase en 'friendships'
    else if (payload.table === 'friendships' && payload.record) {
      const record = payload.record;
      // Solo notificar si la solicitud es 'pending'
      if (record.status !== 'pending') {
        return new Response(
          JSON.stringify({ message: 'Ignorado: el estado de amistad no es pending' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetUserId = record.addressee_id;
      const requesterId = record.requester_id;

      // Obtener datos del remitente
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', requesterId)
        .maybeSingle();

      const senderName = requesterProfile?.display_name || requesterProfile?.username || 'Un usuario';
      notificationTitle = '¡Nueva solicitud de amistad!';
      notificationBody = `${senderName} quiere conectar contigo en Nexus Library.`;
      notificationTab = 'friend_requests';
      notificationTag = `friend-request-${record.id}`;
    }
    // 3. Caso Webhook de Supabase en 'book_recommendations'
    else if (payload.table === 'book_recommendations' && payload.record) {
      const record = payload.record;
      targetUserId = record.receiver_id;
      const senderId = record.sender_id;
      const bookData = record.book_data || {};
      const bookTitle = bookData.nombre || 'un libro';

      // Obtener datos del remitente
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', senderId)
        .maybeSingle();

      const senderName = senderProfile?.display_name || senderProfile?.username || 'Un amigo';
      notificationTitle = '¡Te han recomendado un libro!';
      notificationBody = `${senderName} te ha recomendado "${bookTitle}".`;
      notificationTab = 'recommendations';
      notificationTag = `book-rec-${record.id}`;
    } else {
      return new Response(
        JSON.stringify({ message: 'Evento no soportado o payload vacío' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'No se encontró un targetUserId válido para la notificación' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar las suscripciones Push activas del usuario destinatario
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', targetUserId);

    if (subsError) {
      console.error('Error al consultar push_subscriptions:', subsError.message);
      return new Response(
        JSON.stringify({ error: subsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'El usuario destinatario no tiene suscripciones Push registradas',
          targetUserId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pushPayload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      icon: '/logo.png',
      badge: '/logo.png',
      url: `/?openInbox=${notificationTab}`,
      tab: notificationTab,
      tag: notificationTag
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, pushPayload);
          return { endpoint: sub.endpoint, success: true };
        } catch (err: any) {
          // Si el endpoint ya no existe o caducó (404 o 410 Gone), eliminarlo automáticamente de la BD
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.info(`Eliminando suscripción caducada (${err.statusCode}): ${sub.endpoint}`);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
          throw err;
        }
      })
    );

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.filter((r) => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        success: true,
        total: subscriptions.length,
        sent: sentCount,
        failed: failedCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Excepción general en send-push:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
