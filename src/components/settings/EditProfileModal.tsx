import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User as UserIcon,
  Globe,
  Users,
  Lock,
  Loader2,
  Check,
  AlertCircle,
  Save
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { ProfileVisibility, UserProfile } from '../../types/models';
import { profileService } from '../../services/profileService';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userProfile?: UserProfile | null;
  guestAlias: string;
  onUpdateGuestAlias?: (alias: string) => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
  onShowFeedback: (feedback: { type: 'success' | 'error' | 'info'; text: string }) => void;
  onSaved?: (updated: {
    displayName: string;
    username: string;
    bio: string;
    visibility: ProfileVisibility;
  }) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  guestAlias,
  onUpdateGuestAlias,
  onUpdateProfile,
  onShowFeedback,
  onSaved
}) => {
  const [displayName, setDisplayName] = useState(
    currentUser ? (userProfile?.displayName || '') : guestAlias
  );
  const [username, setUsername] = useState(userProfile?.username || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [visibility, setVisibility] = useState<ProfileVisibility>(
    userProfile?.visibility ?? (userProfile?.isPublic === false ? 'private' : 'public')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<{
    status: 'idle' | 'checking' | 'available' | 'unavailable';
    message?: string;
  }>({ status: 'idle' });

  // Sincronizar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (currentUser && userProfile) {
        setDisplayName(userProfile.displayName || '');
        setUsername(userProfile.username || '');
        setBio(userProfile.bio || '');
        setVisibility(userProfile.visibility ?? (userProfile.isPublic === false ? 'private' : 'public'));
      } else if (!currentUser) {
        setDisplayName(guestAlias);
        setUsername('');
        setBio('');
        setVisibility('public');
      }
      setUsernameCheck({ status: 'idle' });
    }
  }, [isOpen, currentUser, userProfile, guestAlias]);

  if (!isOpen) return null;

  const handleUsernameBlur = async () => {
    if (!currentUser || !username.trim()) return;
    const clean = username.trim().toLowerCase();
    if (clean === userProfile?.username) {
      setUsernameCheck({ status: 'available', message: 'Tu nombre de usuario actual' });
      return;
    }
    setUsernameCheck({ status: 'checking' });
    const res = await profileService.checkUsernameAvailable(clean, currentUser.id);
    if (res.available) {
      setUsernameCheck({ status: 'available', message: '¡Disponible!' });
    } else {
      setUsernameCheck({ status: 'unavailable', message: res.reason || 'Nombre no disponible' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      onUpdateGuestAlias?.(displayName);
      onShowFeedback({ type: 'success', text: 'Nombre guardado en este dispositivo.' });
      onSaved?.({
        displayName,
        username: '',
        bio: '',
        visibility: 'public'
      });
      onClose();
      return;
    }

    if (!displayName.trim()) {
      onShowFeedback({ type: 'error', text: 'Por favor, introduce un nombre visible o alias.' });
      return;
    }

    if (!username.trim()) {
      onShowFeedback({ type: 'error', text: 'Por favor, introduce un nombre de usuario.' });
      return;
    }

    setIsSaving(true);
    try {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername !== userProfile?.username) {
        const check = await profileService.checkUsernameAvailable(cleanUsername, currentUser.id);
        if (!check.available) {
          onShowFeedback({ type: 'error', text: check.reason || 'El nombre de usuario no está disponible.' });
          setIsSaving(false);
          return;
        }
      }

      if (onUpdateProfile) {
        await onUpdateProfile({
          displayName: displayName.trim(),
          username: cleanUsername,
          bio: bio.trim(),
          isPublic: visibility === 'public',
          visibility
        });
      }

      onShowFeedback({
        type: 'success',
        text: '¡Perfil actualizado! Tu alias y nombre de usuario ya están activos.'
      });

      onSaved?.({
        displayName: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        visibility
      });

      onClose();
    } catch (err: unknown) {
      onShowFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar el perfil.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pt-8 sm:pt-10 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="catalog-card-panel relative w-full max-w-2xl max-h-[90vh] flex flex-col p-0 shadow-2xl mt-2 sm:mt-4">
        <div className="catalog-brass-tab">
          Expediente de Lector · Modificación
        </div>

        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-amber-900/15 dark:border-[#242f42] bg-[#f7eedc]/80 dark:bg-[#141b27]/80 rounded-t-[14px]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 leading-tight">
                Datos de la Credencial & Privacidad
              </h2>
              <p className="text-[11px] text-stone-600 dark:text-slate-400">
                Modifica tu nombre público, identificador único, cita bibliotecaria y visibilidad comunitaria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Alias o Nombre visible */}
            <div className="space-y-1.5">
              <label htmlFor="modal-input-alias" className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                Alias o Nombre Visible
              </label>
              <input
                id="modal-input-alias"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Alejandro Ramírez"
                maxLength={50}
                className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0e1420] px-3.5 py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none shadow-xs transition"
              />
              <p className="text-[11px] text-stone-500 dark:text-slate-500 leading-tight">
                Tu nombre en el carnet. Puede incluir espacios, tildes y mayúsculas.
              </p>
            </div>

            {/* Nombre de usuario */}
            {currentUser ? (
              <div className="space-y-1.5">
                <label htmlFor="modal-input-username" className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                  Nombre de usuario
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-amber-700 dark:text-amber-400 select-none">@</span>
                  <input
                    id="modal-input-username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      setUsernameCheck({ status: 'idle' });
                    }}
                    onBlur={handleUsernameBlur}
                    placeholder="usuario"
                    maxLength={25}
                    className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0e1420] pl-7 pr-3.5 py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none shadow-xs transition font-mono"
                  />
                </div>
                {usernameCheck.status === 'checking' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Comprobando disponibilidad...
                  </p>
                )}
                {usernameCheck.status === 'available' && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-3 h-3" /> {usernameCheck.message || '¡Disponible!'}
                  </p>
                )}
                {usernameCheck.status === 'unavailable' && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3" /> {usernameCheck.message}
                  </p>
                )}
                {usernameCheck.status === 'idle' && (
                  <p className="text-[11px] text-stone-500 dark:text-slate-500 leading-tight">
                    Identificador único para que otros lectores puedan encontrarte.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#fbf6ea]/70 dark:bg-[#141A26] p-3 text-xs text-stone-600 dark:text-slate-400 flex flex-col justify-center">
                <span className="font-semibold text-stone-800 dark:text-slate-200">¿Quieres tu @usuario único?</span>
                <p className="text-[11px] mt-0.5">
                  Inicia sesión con tu cuenta para reservar tu nombre de usuario y compartir lecturas con amigos.
                </p>
              </div>
            )}
          </div>

          {/* Biografía / Gustos de lectura */}
          {currentUser && (
            <div className="space-y-1.5">
              <label htmlFor="modal-input-bio" className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                Cita o Biografía Literaria (opcional)
              </label>
              <textarea
                id="modal-input-bio"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ej: Lector empedernido de clásicos, novelas de misterio, filosofía y fantasía oscura..."
                maxLength={200}
                className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0e1420] p-3 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none shadow-xs transition resize-none"
              />
              <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-500">
                <span>Aparece estampada en tu Carnet de Lector y perfil comunitario.</span>
                <span>{bio.length} / 200</span>
              </div>
            </div>
          )}

          {/* Selector de Privacidad de la Estantería */}
          {currentUser && (
            <div className="space-y-2 pt-1">
              <span id="modal-privacy-group-label" className="block text-xs font-semibold text-stone-800 dark:text-slate-200">
                Privacidad de tu estantería y lecturas
              </span>
              <div role="group" aria-labelledby="modal-privacy-group-label" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Opción 1: Público */}
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`flex flex-col text-left p-3 rounded-xl border transition cursor-pointer ${
                    visibility === 'public'
                      ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/30'
                      : 'border-amber-900/15 dark:border-[#242E42] bg-white dark:bg-[#141A26] hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-slate-100">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Público
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        visibility === 'public'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-stone-400 dark:border-stone-600'
                      }`}
                    >
                      {visibility === 'public' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-tight">
                    Cualquier lector de la comunidad puede explorar tu estantería y ver tus libros.
                  </p>
                </button>

                {/* Opción 2: Solo amigos */}
                <button
                  type="button"
                  onClick={() => setVisibility('friends')}
                  className={`flex flex-col text-left p-3 rounded-xl border transition cursor-pointer ${
                    visibility === 'friends'
                      ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-500/15 ring-2 ring-sky-500/30'
                      : 'border-amber-900/15 dark:border-[#242E42] bg-white dark:bg-[#141A26] hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-slate-100">
                      <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      Solo amigos
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        visibility === 'friends'
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-stone-400 dark:border-stone-600'
                      }`}
                    >
                      {visibility === 'friends' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-tight">
                    Tu perfil es visible, pero solo tus amigos aceptados pueden ver tus libros.
                  </p>
                </button>

                {/* Opción 3: Privado */}
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`flex flex-col text-left p-3 rounded-xl border transition cursor-pointer ${
                    visibility === 'private'
                      ? 'border-amber-700 dark:border-amber-400 bg-amber-500/10 dark:bg-amber-500/15 ring-2 ring-amber-500/30'
                      : 'border-amber-900/15 dark:border-[#242E42] bg-white dark:bg-[#141A26] hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-slate-100">
                      <Lock className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                      Privado
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        visibility === 'private'
                          ? 'border-stone-600 dark:border-stone-400 bg-stone-700 dark:bg-stone-300 text-white dark:text-slate-900'
                          : 'border-stone-400 dark:border-stone-600'
                      }`}
                    >
                      {visibility === 'private' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-tight">
                    Nadie puede ver tus libros ni tu estantería. Solo verán tu @usuario para agregarte.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-amber-900/15 dark:border-[#242f42]">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] hover:bg-amber-500/10 text-stone-700 dark:text-slate-300 font-semibold px-4 py-2 text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 text-xs shadow-md transition cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isSaving ? 'Guardando...' : 'Guardar Credencial de Lector'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
