import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Users,
  Send,
  Loader2,
  CheckCircle2,
  BookOpen,
  MessageSquareHeart,
  UserCheck
} from 'lucide-react';
import { Book, BibliographicCandidate, Friendship } from '../types/models';
import { friendshipService } from '../services/friendshipService';
import { recommendationInboxService } from '../services/recommendationInboxService';
import { BookCover } from './BookCover';

interface RecommendBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | BibliographicCandidate;
  currentUserId?: string;
  onSuccess?: (message: string) => void;
}

export const RecommendBookModal: React.FC<RecommendBookModalProps> = ({
  isOpen,
  onClose,
  book,
  currentUserId,
  onSuccess
}) => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    let active = true;
    setIsLoadingFriends(true);
    setErrorMsg('');
    setSelectedFriendId('');
    setNote('');

    friendshipService
      .getFriends(currentUserId)
      .then((items) => {
        if (!active) return;
        setFriends(items);
        if (items.length > 0 && items[0].friendProfile) {
          setSelectedFriendId(items[0].friendProfile.id);
        }
      })
      .catch(() => {
        if (active) setErrorMsg('No se pudo cargar la lista de amigos.');
      })
      .finally(() => {
        if (active) setIsLoadingFriends(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleSend = async () => {
    if (!currentUserId) {
      setErrorMsg('Debes iniciar sesión para recomendar libros a tus amigos.');
      return;
    }
    if (!selectedFriendId) {
      setErrorMsg('Selecciona un amigo para enviar la recomendación.');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    try {
      const result = await recommendationInboxService.sendRecommendation({
        senderId: currentUserId,
        receiverId: selectedFriendId,
        book,
        note
      });

      if (result.success) {
        const selectedFriend = friends.find(
          (f) => f.friendProfile?.id === selectedFriendId
        );
        const friendName = selectedFriend?.friendProfile?.displayName || 'tu amigo';
        onSuccess?.(`¡Recomendación de «${book.nombre}» enviada a ${friendName}!`);
        onClose();
      } else {
        setErrorMsg(result.message);
      }
    } catch {
      setErrorMsg('Ocurrió un error inesperado al enviar la recomendación.');
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommend-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl border-t sm:border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden sm:my-6 max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-amber-900/20 dark:border-[#242E42] px-5 py-3.5 bg-[#f0e5cc] dark:bg-[#101520] shrink-0">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-xs sm:text-sm">
            <Sparkles className="w-4 h-4" />
            <h3 id="recommend-modal-title" className="font-serif font-bold text-stone-900 dark:text-white">
              Recomendar a un amigo
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

        {/* Contenido */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Ficha compacta del libro a recomendar */}
          <div className="flex items-center gap-3.5 rounded-xl border border-amber-900/15 dark:border-[#253044] bg-[#fffcf5] dark:bg-[#0D1017] p-3 shadow-sm">
            <div className="w-12 h-16 shrink-0 rounded overflow-hidden shadow">
              <BookCover
                nombre={book.nombre}
                autor={book.autor}
                portadaUrl={book.portadaUrl}
                portadaFallbackUrl={book.portadaFallbackUrl}
                size="sm"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-400 block">
                Libro a compartir
              </span>
              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 truncate mt-0.5">
                {book.nombre}
              </h4>
              <p className="text-xs text-stone-600 dark:text-slate-400 truncate">
                {book.autor || 'Autor desconocido'}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Selector de amigos */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
              ¿A quién quieres recomendárselo?
            </label>

            {!currentUserId ? (
              <div className="rounded-xl border border-amber-900/15 dark:border-[#253044] bg-[#fffcf5] dark:bg-[#0D1017] p-4 text-center text-xs text-stone-600 dark:text-slate-400">
                <Users className="w-6 h-6 text-amber-600 mx-auto mb-1.5" />
                <p className="font-medium">Inicia sesión para conectar con tus amigos de lectura.</p>
              </div>
            ) : isLoadingFriends ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                <span>Cargando tu círculo de amigos...</span>
              </div>
            ) : friends.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-900/20 dark:border-[#253044] p-5 text-center text-xs text-stone-600 dark:text-slate-400 space-y-1.5">
                <Users className="w-6 h-6 text-amber-600/70 mx-auto mb-1" />
                <p className="font-serif font-bold text-stone-800 dark:text-slate-200">
                  Aún no tienes amigos en tu círculo
                </p>
                <p className="text-[11px] max-w-xs mx-auto">
                  Para recomendar libros a personas concretas, conéctate con ellos en la pestaña de Comunidad de Lectores.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {friends.map((f) => {
                  const profile = f.friendProfile;
                  if (!profile) return null;
                  const isSelected = selectedFriendId === profile.id;

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFriendId(profile.id)}
                      className={
                        'flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition ' +
                        (isSelected
                          ? 'border-amber-600 bg-amber-500/15 text-stone-900 dark:text-white font-semibold shadow-sm'
                          : 'border-amber-900/15 dark:border-[#253044] bg-[#fffcf5] dark:bg-[#0D1017] text-stone-700 dark:text-slate-300 hover:border-amber-600/40')
                      }
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-serif font-bold text-xs flex items-center justify-center shrink-0">
                        {profile.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{profile.displayName}</div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                          @{profile.username}
                        </div>
                      </div>
                      {isSelected && <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nota personal o dedicatoria */}
          {friends.length > 0 && (
            <div className="space-y-1.5">
              <label
                htmlFor="rec-note-input"
                className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                <MessageSquareHeart className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Dedicatoria o nota personal (opcional)</span>
              </label>
              <textarea
                id="rec-note-input"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: «Te recomiendo mucho este libro, el estilo narrativo y los personajes te van a fascinar...»"
                maxLength={350}
                className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-3 text-xs sm:text-sm text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500/40 resize-none transition"
              />
              <div className="text-[10px] text-stone-400 dark:text-slate-500 text-right">
                {note.length} / 350
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2.5 border-t border-amber-900/20 dark:border-[#242E42] px-5 py-3.5 bg-[#f0e5cc]/50 dark:bg-[#101520]/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-amber-900/20 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-amber-900/10 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSending || friends.length === 0 || !selectedFriendId}
            onClick={handleSend}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 text-xs shadow-md transition"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Enviar recomendación</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
