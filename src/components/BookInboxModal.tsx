import React, { useEffect, useState } from 'react';
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
  Calendar
} from 'lucide-react';
import { BookRecommendation, Friendship, Book } from '../types/models';
import { recommendationInboxService } from '../services/recommendationInboxService';
import { friendshipService } from '../services/friendshipService';
import { BookCover } from './BookCover';

interface BookInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onAddBookToLibrary: (bookData: BookRecommendation['bookData']) => Promise<void>;
  onShowToast?: (message: string) => void;
  onInboxUpdated?: () => void;
}

export const BookInboxModal: React.FC<BookInboxModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onAddBookToLibrary,
  onShowToast,
  onInboxUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'friend_requests'>('recommendations');
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ received: Friendship[]; sent: Friendship[] }>({
    received: [],
    sent: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [addingRecId, setAddingRecId] = useState<string | null>(null);
  const [respondingFriendshipId, setRespondingFriendshipId] = useState<string | null>(null);

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

      // Si hay recomendaciones no leídas, marcarlas en segundo plano
      recs.filter((r) => r.status === 'unread').forEach((r) => {
        recommendationInboxService.markAsRead(r.id);
      });
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
            {recommendations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {recommendations.length}
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
            recommendations.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Inbox className="w-10 h-10 mx-auto text-amber-600/50 dark:text-amber-400/50" />
                <h4 className="font-serif font-bold text-base text-stone-800 dark:text-slate-200">
                  Tu buzón literario está al día
                </h4>
                <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Cuando tus amigos te recomienden lecturas con dedicatorias personales, aparecerán aquí para que puedas añadirlas con un clic.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recommendations.map((rec) => {
                  const isAdding = addingRecId === rec.id;
                  const isAccepted = rec.status === 'accepted';
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

                        <div>
                          {isAccepted ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                              <Check className="w-3.5 h-3.5" /> Añadido a tu lista
                            </span>
                          ) : (
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
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
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
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium shrink-0">
                                Pendiente de respuesta
                              </span>
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
