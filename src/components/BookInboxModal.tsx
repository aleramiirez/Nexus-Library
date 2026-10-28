import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Inbox,
  X,
  Sparkles,
  BookOpen,
  Check,
  Plus,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Clock,
  Loader2,
  MessageSquareHeart,
  Calendar,
  History,
  CheckCircle2,
  Bell
} from 'lucide-react';
import { BookRecommendation, Friendship, Book } from '../types/models';
import { recommendationInboxService } from '../services/recommendationInboxService';
import { friendshipService } from '../services/friendshipService';
import { BookCover } from './BookCover';
import {
  getPushSubscriptionStatus,
  subscribeUserToPush,
  PushSubscriptionStatus
} from '../services/pushNotificationService';

interface BookInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onAddBookToLibrary: (bookData: BookRecommendation['bookData']) => Promise<void>;
  onShowToast?: (message: string) => void;
  onInboxUpdated?: () => void;
  initialTab?: 'recommendations' | 'friend_requests';
}

export const BookInboxModal: React.FC<BookInboxModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onAddBookToLibrary,
  onShowToast,
  onInboxUpdated,
  initialTab = 'recommendations'
}) => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'friend_requests'>(initialTab);
  const [recsView, setRecsView] = useState<'pending' | 'history'>('pending');
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ received: Friendship[]; sent: Friendship[] }>({
    received: [],
    sent: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [addingRecId, setAddingRecId] = useState<string | null>(null);
  const [respondingFriendshipId, setRespondingFriendshipId] = useState<string | null>(null);
  const [cancellingFriendshipId, setCancellingFriendshipId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<PushSubscriptionStatus | null>(null);
  const [isPushBannerDismissed, setIsPushBannerDismissed] = useState(false);
  const [isActivatingPush, setIsActivatingPush] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      getPushSubscriptionStatus()
        .then(setPushStatus)
        .catch(() => null);
    }
  }, [isOpen]);

  const handleActivatePushFromBanner = async () => {
    if (!currentUserId) {
      onShowToast?.('Inicia sesión para activar las notificaciones Push.');
      return;
    }
    setIsActivatingPush(true);
    try {
      const res = await subscribeUserToPush(currentUserId);
      if (res.success) {
        onShowToast?.(res.message || '¡Notificaciones activadas!');
        const status = await getPushSubscriptionStatus();
        setPushStatus(status);
      } else {
        onShowToast?.(res.error || 'No se pudieron activar las notificaciones.');
      }
    } catch {
      onShowToast?.('Error al solicitar permiso de notificaciones.');
    } finally {
      setIsActivatingPush(false);
    }
  };

  const handleCancelSentRequest = async (friendshipId: string) => {
    setCancellingFriendshipId(friendshipId);
    try {
      const res = await friendshipService.cancelFriendRequest(friendshipId);
      onShowToast?.(res.message);
      if (res.success) {
        setPendingRequests((prev) => ({
          ...prev,
          sent: prev.sent.filter((f) => f.id !== friendshipId)
        }));
        onInboxUpdated?.();
        window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));
      }
    } catch {
      onShowToast?.('Ocurrió un error al cancelar la solicitud.');
    } finally {
      setCancellingFriendshipId(null);
    }
  };

  const pendingRecs = useMemo(
    () => recommendations.filter((r) => r.status !== 'accepted' && r.status !== 'dismissed'),
    [recommendations]
  );
  const historyRecs = useMemo(
    () => recommendations.filter((r) => r.status === 'accepted'),
    [recommendations]
  );

  const loadData = async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [recs, requests] = await Promise.all([
        recommendationInboxService.getReceivedRecommendations(currentUserId),
        friendshipService.getPendingRequests(currentUserId)
      ]);

      setRecommendations(recs);
      setPendingRequests(requests);

      // Si hay recomendaciones no leídas, marcarlas como leídas
      const unreadList = recs.filter((r) => r.status === 'unread');
      if (unreadList.length > 0) {
        await Promise.all(unreadList.map((r) => recommendationInboxService.markAsRead(r.id)));
      }
      onInboxUpdated?.();
    } catch {
      // Manejo silencioso
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();

      const handleFriendshipUpdated = () => {
        loadData();
      };
      window.addEventListener('nexus:friendship-updated', handleFriendshipUpdated);
      return () => {
        window.removeEventListener('nexus:friendship-updated', handleFriendshipUpdated);
      };
    }
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleAddRecToLibrary = async (rec: BookRecommendation) => {
    setAddingRecId(rec.id);
    try {
      await onAddBookToLibrary(rec.bookData);
      await recommendationInboxService.acceptRecommendation(rec.id);
      setRecommendations((prev) =>
        prev.map((item) => (item.id === rec.id ? { ...item, status: 'accepted' } : item))
      );
      onShowToast?.(`«${rec.bookData.nombre}» añadido a tu biblioteca en "Por leer".`);
      onInboxUpdated?.();
    } catch {
      onShowToast?.('No se pudo añadir el libro a tu biblioteca.');
    } finally {
      setAddingRecId(null);
    }
  };

  const handleDismissRec = async (recId: string) => {
    try {
      await recommendationInboxService.dismissRecommendation(recId);
      setRecommendations((prev) => prev.filter((item) => item.id !== recId));
      onShowToast?.('Recomendación descartada del buzón.');
      onInboxUpdated?.();
    } catch {
      onShowToast?.('No se pudo descartar la recomendación.');
    }
  };

  const handleRespondFriendRequest = async (friendshipId: string, action: 'accept' | 'decline') => {
    setRespondingFriendshipId(friendshipId);
    try {
      const res = await friendshipService.respondFriendRequest(friendshipId, action);
      onShowToast?.(res.message);
      if (res.success) {
        setPendingRequests((prev) => ({
          ...prev,
          received: prev.received.filter((f) => f.id !== friendshipId)
        }));
        onInboxUpdated?.();
        window.dispatchEvent(new CustomEvent('nexus:friendship-updated'));
      }
    } catch {
      onShowToast?.('Ocurrió un error al responder a la solicitud.');
    } finally {
      setRespondingFriendshipId(null);
    }
  };

  const unreadRecsCount = recommendations.filter((r) => r.status === 'unread').length;
  const pendingRequestsCount = pendingRequests.received.length;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbox-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden sm:my-6 max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-5 py-3.5 bg-[#f0e5cc] dark:bg-[#101520] shrink-0">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-xs sm:text-sm">
            <Inbox className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 id="inbox-modal-title" className="font-serif font-bold text-stone-900 dark:text-white">
              Buzón Literario
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra discreta para invitar a activar notificaciones Push */}
        {pushStatus &&
          !pushStatus.isSubscribed &&
          !isPushBannerDismissed &&
          pushStatus.permission !== 'denied' && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-amber-500/15 border-b border-amber-600/25 text-xs text-amber-950 dark:text-amber-200 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">🔔</span>
                <span className="truncate sm:whitespace-normal">
                  Activa las notificaciones para enterarte al instante cuando tus amigos te recomienden un libro o te pidan amistad.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleActivatePushFromBanner}
                  disabled={isActivatingPush}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 text-[11px] transition shadow-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  {isActivatingPush ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Bell className="w-3 h-3" />
                  )}
                  <span>{isActivatingPush ? 'Activando...' : 'Activar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPushBannerDismissed(true)}
                  className="p-1 rounded text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white transition cursor-pointer"
                  title="Ocultar aviso"
                  aria-label="Ocultar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        {/* Pestañas del Buzón */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-amber-900/15 dark:border-[#242E42] bg-[#f8f1e3]/60 dark:bg-[#121824] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={
              'relative pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ' +
              (activeTab === 'recommendations'
                ? 'border-amber-600 text-amber-900 dark:text-amber-300 font-bold'
                : 'border-transparent text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
            }
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recomendaciones de Amigos</span>
            {pendingRecs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {pendingRecs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('friend_requests')}
            className={
              'relative pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 ' +
              (activeTab === 'friend_requests'
                ? 'border-amber-600 text-amber-900 dark:text-amber-300 font-bold'
                : 'border-transparent text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
            }
          >
            <Users className="w-3.5 h-3.5" />
            <span>Solicitudes de Amistad</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-xs text-stone-500 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400" />
              <span>Abriendo tu correspondencia literaria...</span>
            </div>
          ) : activeTab === 'recommendations' ? (
            /* Vista 1: Recomendaciones Recibidas */
            <div className="space-y-4">
              {/* Barra superior de pestañas secundarias: Pendientes e Historial */}
              <div className="flex items-center justify-between gap-2 border-b border-amber-900/10 dark:border-[#20293C] pb-3">
                <div className="inline-flex rounded-xl p-1 bg-amber-900/10 dark:bg-[#101520] border border-amber-900/15 dark:border-[#20293C] text-xs">
                  <button
                    type="button"
                    onClick={() => setRecsView('pending')}
                    className={
                      'px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ' +
                      (recsView === 'pending'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                    }
                  >
                    <span>Pendientes</span>
                    {pendingRecs.length > 0 && (
                      <span
                        className={
                          'px-1.5 py-0.2 rounded-full text-[10px] font-bold ' +
                          (recsView === 'pending'
                            ? 'bg-slate-950 text-amber-400'
                            : 'bg-amber-500/20 text-amber-800 dark:text-amber-300')
                        }
                      >
                        {pendingRecs.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecsView('history')}
                    className={
                      'px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ' +
                      (recsView === 'history'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                    }
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Historial</span>
                  </button>
                </div>

                {recsView === 'pending' && historyRecs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecsView('history')}
                    className="text-xs font-semibold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Ver historial</span>
                  </button>
                )}
                {recsView === 'history' && (
                  <button
                    type="button"
                    onClick={() => setRecsView('pending')}
                    className="text-xs font-semibold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Volver a pendientes</span>
                  </button>
                )}
              </div>

              {recsView === 'pending' ? (
                /* Subvista: Pendientes */
                pendingRecs.length === 0 ? (
                  <div className="py-14 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif font-bold text-base text-stone-800 dark:text-slate-200">
                      ¡Buzón al día!
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      {historyRecs.length > 0
                        ? 'Has gestionado todas las recomendaciones recibidas de tus amigos.'
                        : 'Cuando tus amigos te recomienden lecturas con dedicatorias personales, aparecerán aquí para que puedas añadirlas con un clic.'}
                    </p>
                    {historyRecs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRecsView('history')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-600/30 text-xs font-semibold transition"
                      >
                        <History className="w-3.5 h-3.5" />
                        Ver historial de recomendaciones
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRecs.map((rec) => {
                      const isAdding = addingRecId === rec.id;
                      const sender = rec.senderProfile;

                      return (
                        <article
                          key={rec.id}
                          className="rounded-2xl border border-amber-900/15 dark:border-[#253044] bg-[#fffcf5] dark:bg-[#0E131E] p-4 sm:p-5 shadow-sm space-y-3.5 hover:border-amber-600/40 transition"
                        >
                          {/* Remitente y fecha */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-xs flex items-center justify-center shrink-0">
                                {sender ? sender.displayName.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-stone-900 dark:text-slate-100 truncate block">
                                  {sender ? sender.displayName : 'Un amigo lector'}
                                </span>
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono block">
                                  @{sender?.username || 'amigo'}
                                </span>
                              </div>
                            </div>

                            <span className="text-[10px] text-stone-500 dark:text-slate-500 flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3" />
                              {new Date(rec.createdAt).toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </div>

                          {/* Dedicatoria personal si existe */}
                          {rec.note && (
                            <div className="rounded-xl border border-amber-600/25 bg-amber-500/10 dark:bg-amber-500/15 p-3 text-xs flex items-start gap-2.5">
                              <MessageSquareHeart className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <p className="italic text-stone-800 dark:text-amber-100 leading-relaxed font-serif">
                                «{rec.note}»
                              </p>
                            </div>
                          )}

                          {/* Libro recomendado */}
                          <div className="flex items-start gap-3.5 rounded-xl border border-amber-900/10 dark:border-[#20293C] bg-[#fbf6ea]/70 dark:bg-[#141A26] p-3">
                            <div className="w-14 sm:w-16 shrink-0 rounded overflow-hidden shadow">
                              <BookCover
                                nombre={rec.bookData.nombre}
                                autor={rec.bookData.autor}
                                portadaUrl={rec.bookData.portadaUrl}
                                portadaFallbackUrl={rec.bookData.portadaFallbackUrl}
                                size="sm"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 leading-snug">
                                {rec.bookData.nombre}
                              </h4>
                              <p className="text-xs text-stone-600 dark:text-slate-400">
                                {rec.bookData.autor}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                                {rec.bookData.fechaPublicacion && (
                                  <span className="rounded bg-amber-900/10 dark:bg-slate-800 px-1.5 py-0.2">
                                    {rec.bookData.fechaPublicacion}
                                  </span>
                                )}
                                {rec.bookData.genero && (
                                  <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2">
                                    {rec.bookData.genero.replace(/^[^\s]+\s/, '')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-900/10 dark:border-[#20293C]">
                            <button
                              type="button"
                              onClick={() => handleDismissRec(rec.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Descartar</span>
                            </button>

                            <button
                              type="button"
                              disabled={isAdding}
                              onClick={() => handleAddRecToLibrary(rec)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 text-xs shadow-sm transition disabled:opacity-50"
                            >
                              {isAdding ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              <span>Añadir a Por Leer</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Subvista: Historial de Recomendaciones Aceptadas */
                historyRecs.length === 0 ? (
                  <div className="py-14 text-center space-y-2">
                    <History className="w-10 h-10 mx-auto text-amber-600/40 dark:text-amber-400/40" />
                    <h4 className="font-serif font-bold text-base text-stone-800 dark:text-slate-200">
                      Sin historial de recomendaciones
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Cuando aceptes las recomendaciones que te envíen tus amigos, quedarán archivadas aquí para que recuerdes quién te las envió y su dedicatoria.
                    </p>
                    {pendingRecs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRecsView('pending')}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-xs transition"
                      >
                        Ver pendientes ({pendingRecs.length})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historyRecs.map((rec) => {
                      const sender = rec.senderProfile;

                      return (
                        <article
                          key={rec.id}
                          className="rounded-2xl border border-amber-900/15 dark:border-[#253044] bg-[#fffcf5]/80 dark:bg-[#0E131E]/80 p-4 sm:p-5 shadow-sm space-y-3.5"
                        >
                          {/* Remitente y fecha */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/80 to-amber-700/80 text-slate-950 font-serif font-bold text-xs flex items-center justify-center shrink-0">
                                {sender ? sender.displayName.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-stone-900 dark:text-slate-100 truncate block">
                                  {sender ? sender.displayName : 'Un amigo lector'}
                                </span>
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono block">
                                  @{sender?.username || 'amigo'}
                                </span>
                              </div>
                            </div>

                            <span className="text-[10px] text-stone-500 dark:text-slate-500 flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3" />
                              {new Date(rec.createdAt).toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </div>

                          {/* Dedicatoria personal si existe */}
                          {rec.note && (
                            <div className="rounded-xl border border-amber-600/20 bg-amber-500/5 dark:bg-amber-500/10 p-3 text-xs flex items-start gap-2.5">
                              <MessageSquareHeart className="w-4 h-4 text-amber-600/80 dark:text-amber-400/80 shrink-0 mt-0.5" />
                              <p className="italic text-stone-700 dark:text-amber-100/90 leading-relaxed font-serif">
                                «{rec.note}»
                              </p>
                            </div>
                          )}

                          {/* Libro recomendado */}
                          <div className="flex items-start gap-3.5 rounded-xl border border-amber-900/10 dark:border-[#20293C] bg-[#fbf6ea]/60 dark:bg-[#141A26]/60 p-3">
                            <div className="w-14 sm:w-16 shrink-0 rounded overflow-hidden shadow">
                              <BookCover
                                nombre={rec.bookData.nombre}
                                autor={rec.bookData.autor}
                                portadaUrl={rec.bookData.portadaUrl}
                                portadaFallbackUrl={rec.bookData.portadaFallbackUrl}
                                size="sm"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 leading-snug">
                                {rec.bookData.nombre}
                              </h4>
                              <p className="text-xs text-stone-600 dark:text-slate-400">
                                {rec.bookData.autor}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                                {rec.bookData.fechaPublicacion && (
                                  <span className="rounded bg-amber-900/10 dark:bg-slate-800 px-1.5 py-0.2">
                                    {rec.bookData.fechaPublicacion}
                                  </span>
                                )}
                                {rec.bookData.genero && (
                                  <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2">
                                    {rec.bookData.genero.replace(/^[^\s]+\s/, '')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Acciones del historial */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-900/10 dark:border-[#20293C]">
                            <button
                              type="button"
                              onClick={() => handleDismissRec(rec.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-400 hover:text-rose-600 transition"
                              title="Eliminar de tu historial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar del historial</span>
                            </button>

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                              <Check className="w-3.5 h-3.5" /> En tu biblioteca
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          ) : (
            /* Vista 2: Solicitudes de Amistad */
            <div className="space-y-5">
              {pendingRequests.received.length === 0 && pendingRequests.sent.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Users className="w-10 h-10 mx-auto text-amber-600/50 dark:text-amber-400/50" />
                  <h4 className="font-serif font-bold text-base text-stone-800 dark:text-slate-200">
                    No tienes solicitudes de amistad pendientes
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Puedes buscar a tus amigos por su @usuario en la pestaña Comunidad de Lectores para conectar vuestras estanterías.
                  </p>
                </div>
              ) : (
                <>
                  {/* Recibidas */}
                  {pendingRequests.received.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                        Solicitudes recibidas ({pendingRequests.received.length})
                      </h4>
                      <div className="space-y-2.5">
                        {pendingRequests.received.map((req) => {
                          const p = req.friendProfile;
                          const isBusy = respondingFriendshipId === req.id;

                          return (
                            <div
                              key={req.id}
                              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-amber-900/15 dark:border-[#253044] bg-[#fffcf5] dark:bg-[#0E131E] shadow-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-sm flex items-center justify-center shrink-0">
                                  {p ? p.displayName.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-stone-900 dark:text-slate-100 truncate">
                                    {p?.displayName || 'Lector'}
                                  </div>
                                  <div className="text-[11px] text-amber-700 dark:text-amber-400 truncate">
                                    @{p?.username}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRespondFriendRequest(req.id, 'decline')}
                                  className="p-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-stone-500 hover:text-rose-600 transition"
                                  title="Rechazar solicitud"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRespondFriendRequest(req.id, 'accept')}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 text-xs shadow-sm transition"
                                >
                                  {isBusy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <UserCheck className="w-3.5 h-3.5" />
                                  )}
                                  <span>Aceptar</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Enviadas */}
                  {pendingRequests.sent.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                        Solicitudes enviadas ({pendingRequests.sent.length})
                      </h4>
                      <div className="space-y-2">
                        {pendingRequests.sent.map((req) => {
                          const p = req.friendProfile;
                          const isCancelling = cancellingFriendshipId === req.id;
                          return (
                            <div
                              key={req.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-900/10 dark:border-[#20293C] bg-[#fbf6ea]/50 dark:bg-[#121824] text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-amber-900/10 dark:bg-slate-800 text-stone-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                                  {p ? p.displayName.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="truncate">
                                  <span className="font-semibold text-stone-800 dark:text-slate-200">
                                    {p?.displayName || 'Lector'}
                                  </span>{' '}
                                  <span className="text-[10px] text-stone-500">(@{p?.username})</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium hidden sm:inline">
                                  Pendiente de respuesta
                                </span>
                                <button
                                  type="button"
                                  disabled={isCancelling}
                                  onClick={() => handleCancelSentRequest(req.id)}
                                  className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                                  title="Cancelar solicitud de amistad"
                                  aria-label="Cancelar solicitud de amistad"
                                >
                                  {isCancelling ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <X className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
