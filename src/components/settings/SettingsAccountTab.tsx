import React, { useEffect, useState } from 'react';
import {
  Cloud,
  Sparkles,
  Award,
  Compass,
  ShieldCheck,
  RefreshCw,
  LogOut,
  LogIn,
  User as UserIcon,
  Globe,
  Users,
  Lock,
  Loader2,
  Check,
  CheckCircle2,
  AlertCircle,
  Save,
  Pencil,
  X
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Book, Saga, UserProfile, ProfileVisibility } from '../../types/models';
import { ReaderLevelInfo } from '../../services/levelingService';
import { isBookRead } from '../../services/literaryGeographyService';
import { profileService } from '../../services/profileService';
import { UserAvatar } from '../UserAvatar';
import { AvatarPickerModal } from '../AvatarPickerModal';
import { ShareReaderCardModal } from '../ShareReaderCardModal';
import { LiteraryPassportModal } from '../LiteraryPassportModal';
import { EditProfileModal } from './EditProfileModal';

interface SettingsAccountTabProps {
  currentUser: User | null;
  userProfile?: UserProfile | null;
  guestAlias: string;
  guestAvatar: string | null;
  onUpdateGuestAlias?: (alias: string) => void;
  onUpdateGuestAvatar?: (avatar: string | null) => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
  readerLevelInfo: ReaderLevelInfo;
  books: Book[];
  sagas: Saga[];
  isSyncing: boolean;
  isSigningOut: boolean;
  onTriggerSync: () => Promise<void>;
  onOpenAuthModal: () => void;
  onSignOutClick: () => void;
  onOpenOrderModal?: () => void;
  onOpenBookDetail?: (book: Book) => void;
  onShowFeedback: (feedback: { type: 'success' | 'error' | 'info'; text: string }) => void;
}

export const SettingsAccountTab: React.FC<SettingsAccountTabProps> = ({
  currentUser,
  userProfile,
  guestAlias,
  guestAvatar,
  onUpdateGuestAlias,
  onUpdateGuestAvatar,
  onUpdateProfile,
  readerLevelInfo,
  books,
  sagas,
  isSyncing,
  isSigningOut,
  onTriggerSync,
  onOpenAuthModal,
  onSignOutClick,
  onOpenOrderModal,
  onOpenBookDetail,
  onShowFeedback
}) => {
  // Estados de perfil de lector (Alias y Usuario)
  const [profileDisplayName, setProfileDisplayName] = useState(
    currentUser ? (userProfile?.displayName || '') : guestAlias
  );
  const [profileUsername, setProfileUsername] = useState(userProfile?.username || '');
  const [profileBio, setProfileBio] = useState(userProfile?.bio || '');
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>(
    userProfile?.visibility ?? (userProfile?.isPublic === false ? 'private' : 'public')
  );
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(
    currentUser ? (userProfile?.avatarUrl ?? null) : guestAvatar
  );
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isExportCarnetOpen, setIsExportCarnetOpen] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);

  useEffect(() => {
    if (currentUser && userProfile) {
      setProfileDisplayName(userProfile.displayName || '');
      setProfileUsername(userProfile.username || '');
      setProfileBio(userProfile.bio || '');
      setProfileVisibility(userProfile.visibility ?? (userProfile.isPublic === false ? 'private' : 'public'));
      setCurrentAvatar(userProfile.avatarUrl ?? null);
    } else if (!currentUser) {
      setProfileDisplayName(guestAlias);
      setCurrentAvatar(guestAvatar);
    }
  }, [currentUser, userProfile, guestAlias, guestAvatar]);

  const handleAvatarSelect = async (avatarUrl: string | null, frameId?: any) => {
    setCurrentAvatar(avatarUrl);
    if (currentUser) {
      if (onUpdateProfile) {
        await onUpdateProfile({ avatarUrl, ...(frameId ? { orderFrame: frameId } : {}) });
      }
      onShowFeedback({
        type: 'success',
        text: '¡Sello heráldico actualizado con éxito en tu Carnet de Lector!'
      });
    } else {
      onUpdateGuestAvatar?.(avatarUrl);
      onShowFeedback({
        type: 'success',
        text: 'Sello de lector guardado en este dispositivo.'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="catalog-card-panel relative pt-8 sm:pt-9 p-5 sm:p-7 shadow-xl space-y-6">
        <div className="catalog-brass-tab">
          Expediente de Lector · Carnet Oficial
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#222B3C] pb-4">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-slate-100">
              <Cloud className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Carnet de Lector & Sincronización
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
              Tu credencial bibliotecaria histórica, heráldica personal y copia de seguridad en la nube.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsEditProfileModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-900/25 dark:border-amber-400/30 bg-[#fffcf5] dark:bg-[#162135] hover:bg-amber-500/10 text-stone-800 dark:text-amber-200 font-bold px-3.5 py-1.5 text-xs transition shadow-xs transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Editar Perfil</span>
            </button>

            {currentUser ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Copia en la nube activa
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-600/30 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Guardado en este dispositivo
              </div>
            )}
          </div>
        </div>

        {/* ═══ TARJETA FÍSICA: CARNET DE LECTOR OFICIAL ═══ */}
        <div className="relative rounded-2xl border-2 border-amber-900/25 dark:border-amber-500/30 bg-gradient-to-br from-[#fbf6ec] via-[#f5ebd6] to-[#eee0c4] dark:from-[#131926] dark:via-[#0f1420] dark:to-[#0a0d14] p-5 sm:p-7 shadow-lg overflow-hidden">
          {/* Filigrana de fondo */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -bottom-6 w-56 h-56 opacity-5 dark:opacity-10 text-amber-900 dark:text-amber-400 select-none flex items-center justify-center font-serif text-9xl font-black rotate-12"
          >
            NL
          </div>

          {/* Borde interior diploma */}
          <div className="pointer-events-none absolute inset-2.5 rounded-xl border border-amber-900/15 dark:border-amber-400/15" />

          {/* Encabezado de la credencial */}
          <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/15 dark:border-amber-400/20 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600/60 dark:bg-amber-400/60" />
              <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest uppercase text-amber-950/70 dark:text-amber-300/80">
                Nexus Librarivm · Carnet Bibliotecario
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentUser && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full text-[10px] font-semibold px-2.5 py-0.5 border ${
                    profileVisibility === 'public'
                      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                      : profileVisibility === 'friends'
                      ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30'
                      : 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-400/30'
                  }`}
                >
                  {profileVisibility === 'public' && (
                    <>
                      <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Público
                    </>
                  )}
                  {profileVisibility === 'friends' && (
                    <>
                      <Users className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      Solo amigos
                    </>
                  )}
                  {profileVisibility === 'private' && (
                    <>
                      <Lock className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                      Privado
                    </>
                  )}
                </span>
              )}
              <div className="font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-amber-900/10 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 border border-amber-900/20 dark:border-amber-400/20">
                № NL-{(currentUser?.id ? currentUser.id.slice(0, 8) : 'INVITADO').toUpperCase()}
              </div>
            </div>
          </div>

          {/* Contenido: Avatar + Datos del lector */}
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar heráldico con botón de edición */}
            <div className="relative group shrink-0">
              <div className="p-1 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-md transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg">
                <UserAvatar
                  avatarUrl={currentAvatar}
                  displayName={profileDisplayName}
                  username={profileUsername}
                  size="2xl"
                  className="rounded-xl"
                  level={readerLevelInfo.level}
                  rank={readerLevelInfo.rank}
                  isCurrentUser={true}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                title="Personalizar Sello o Avatar"
                aria-label="Personalizar Sello o Avatar"
                className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 text-[10px] shadow-lg border-2 border-white dark:border-[#131926] transition transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Sello</span>
              </button>
            </div>

            {/* Info lector */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div>
                  <button
                    type="button"
                    onClick={onOpenOrderModal}
                    title="Ver Códice de la Orden, Rango y Escalafones"
                    className="flex flex-wrap items-center gap-2 mb-1 justify-center sm:justify-start group/rank cursor-pointer hover:opacity-95 text-left focus:outline-hidden"
                  >
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border shadow-xs transition group-hover/rank:scale-105 ${readerLevelInfo.rank.badgeStyle}`}>
                      Rango {readerLevelInfo.rank.roman} · Nivel {readerLevelInfo.level}
                      <Compass className="w-3 h-3 text-amber-500/80 ml-0.5" />
                    </span>
                    <span className="font-serif italic text-xs font-bold text-amber-900 dark:text-amber-300 group-hover/rank:underline decoration-amber-500/60 underline-offset-2">
                      {readerLevelInfo.activeTitle}
                    </span>
                  </button>
                  <h3 className="font-serif text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100 tracking-tight">
                    {profileDisplayName.trim() || (currentUser ? currentUser.email : 'Lector Invitado')}
                  </h3>
                  <p className="text-xs font-mono font-semibold text-amber-800 dark:text-amber-400 mt-0.5">
                    {currentUser && profileUsername ? (
                      <span>@{profileUsername}</span>
                    ) : currentUser ? (
                      <span className="text-stone-600 dark:text-slate-400">{currentUser.email}</span>
                    ) : (
                      <span className="text-stone-500 italic">Sin identificador @usuario</span>
                    )}
                  </p>
                </div>

                <div className="self-center sm:self-start flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExportCarnetOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition shadow-sm transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-slate-950" />
                    <span>Exportar Carnet Oficial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPassportOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-900/25 dark:border-amber-400/30 bg-[#fffcf5] dark:bg-[#162135] hover:bg-amber-500/10 text-stone-800 dark:text-amber-200 font-bold px-4 py-2 text-xs transition shadow-sm transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Pasaporte Literario</span>
                  </button>
                </div>
              </div>

              {/* Cita o Biografía en cursiva clásica */}
              <div className="text-xs italic font-serif text-stone-700 dark:text-slate-300 border-l-2 border-amber-600/40 pl-3 py-1 bg-amber-500/5 dark:bg-amber-400/5 rounded-r">
                &ldquo;{profileBio.trim() || 'Custodio de volúmenes, páginas devoradas y pasajes memorables en Nexus Library.'}&rdquo;
              </div>

              {/* Cifras de biblioteca en carnet */}
              <div className="pt-1.5 grid grid-cols-3 gap-2 text-center sm:text-left">
                <div className="rounded-lg bg-amber-900/5 dark:bg-amber-400/5 border border-amber-900/10 dark:border-amber-400/10 p-2">
                  <div className="font-serif text-base sm:text-lg font-bold text-amber-900 dark:text-amber-300">
                    {books.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400">
                    Libros
                  </div>
                </div>
                <div className="rounded-lg bg-amber-900/5 dark:bg-amber-400/5 border border-amber-900/10 dark:border-amber-400/10 p-2">
                  <div className="font-serif text-base sm:text-lg font-bold text-amber-900 dark:text-amber-300">
                    {sagas.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400">
                    Sagas
                  </div>
                </div>
                <div className="rounded-lg bg-amber-900/5 dark:bg-amber-400/5 border border-amber-900/10 dark:border-amber-400/10 p-2">
                  <div className="font-serif text-base sm:text-lg font-bold text-amber-900 dark:text-amber-300">
                    {books.filter((b) => isBookRead(b)).length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400">
                    Leídos
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción del carnet */}
          <div className="relative mt-5 pt-4 border-t border-amber-900/15 dark:border-amber-400/20 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-stone-600 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>
                {currentUser
                  ? `Sesión activa como ${currentUser.email}`
                  : 'Modo local activo. Conéctate para sincronizar tu colección.'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentUser ? (
                <>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={onTriggerSync}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 text-xs transition shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={'w-3.5 h-3.5 ' + (isSyncing ? 'animate-spin' : '')} />
                    {isSyncing ? 'Guardando en la nube...' : 'Sincronizar ahora'}
                  </button>
                  <button
                    type="button"
                    disabled={isSigningOut}
                    onClick={onSignOutClick}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold px-3.5 py-2 text-xs transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition shadow-md cursor-pointer"
                >
                  <LogIn className="w-4 h-4" /> Iniciar sesión o Crear cuenta
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Información amigable de sincronización */}
        {currentUser ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Tu colección está al día en la nube</span>
            </div>
            <p className="text-stone-600 dark:text-slate-400 leading-relaxed pl-6">
              Tus <strong>{books.length} libros</strong> y <strong>{sagas.length} sagas</strong> están
              guardados de forma segura. Si abres Nexus Library en tu teléfono móvil o en otro
              ordenador e inicias sesión, encontrarás exactamente la misma biblioteca.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#f4ebd6]/60 dark:bg-[#101520] p-4 text-xs space-y-2">
            <span className="font-semibold text-stone-800 dark:text-slate-200 block">
              ¿Por qué vincular una cuenta gratuita?
            </span>
            <ul className="space-y-1 text-stone-600 dark:text-slate-400 list-disc list-inside leading-relaxed">
              <li>Tus lecturas y notas estarán protegidas si limpias el navegador o cambias de equipo.</li>
              <li>Podrás consultar tu catálogo y añadir libros desde cualquier dispositivo (móvil, tablet o PC).</li>
              <li>Tus datos son completamente privados y solo tú puedes acceder a ellos.</li>
            </ul>
          </div>
        )}

        {/* Modal de Edición de Perfil & Privacidad */}
        <EditProfileModal
          isOpen={isEditProfileModalOpen}
          onClose={() => setIsEditProfileModalOpen(false)}
          currentUser={currentUser}
          userProfile={userProfile}
          guestAlias={guestAlias}
          onUpdateGuestAlias={onUpdateGuestAlias}
          onUpdateProfile={onUpdateProfile}
          onShowFeedback={onShowFeedback}
          onSaved={(updated) => {
            setProfileDisplayName(updated.displayName);
            if (updated.username) setProfileUsername(updated.username);
            setProfileBio(updated.bio);
            setProfileVisibility(updated.visibility);
          }}
        />

        {/* Modal de selección de Sello Heráldico / Avatar */}
        <AvatarPickerModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          currentAvatarUrl={currentAvatar}
          displayName={profileDisplayName}
          username={profileUsername}
          onSaveAvatar={handleAvatarSelect}
          levelInfo={readerLevelInfo}
          onShowToast={(msg, type) =>
            onShowFeedback({ type: type ?? 'success', text: msg })
          }
        />

        {/* Modal de Exportación Oficial de Carnet */}
        <ShareReaderCardModal
          isOpen={isExportCarnetOpen}
          onClose={() => setIsExportCarnetOpen(false)}
          displayName={profileDisplayName}
          username={profileUsername}
          avatarUrl={currentUser ? (userProfile?.avatarUrl ?? null) : guestAvatar}
          bio={profileBio}
          memberId={currentUser?.id}
          totalBooks={books.length}
          readBooks={books.filter((b) => isBookRead(b)).length}
          totalSagas={sagas.length}
          levelInfo={readerLevelInfo}
          onShowToast={(msg, type) =>
            onShowFeedback({ type: type === 'error' ? 'error' : 'success', text: msg })
          }
        />

        {/* Modal de Pasaporte Literario y Visados Consulares */}
        <LiteraryPassportModal
          isOpen={isPassportOpen}
          onClose={() => setIsPassportOpen(false)}
          books={books}
          displayName={profileDisplayName}
          username={profileUsername}
          avatarUrl={currentUser ? (userProfile?.avatarUrl ?? null) : guestAvatar}
          memberId={currentUser?.id}
          onOpenBookDetail={onOpenBookDetail}
          onShowToast={(msg, type) =>
            onShowFeedback({ type: type === 'error' ? 'error' : 'success', text: msg })
          }
        />
      </div>
    </div>
  );
};
