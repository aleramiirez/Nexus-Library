import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Award,
  BookOpen,
  Compass,
  Layers,
  Target,
  Quote,
  Star,
  FileText,
  Lock,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
  Feather,
  Key,
  Scroll,
  Landmark,
  Gem,
  Crown
} from 'lucide-react';
import {
  OrderRank,
  ORDER_RANKS,
  ReaderLevelInfo,
  setSelectedHonorificTitle
} from '../services/levelingService';
import { UserAvatar } from './UserAvatar';
import { soundService } from '../services/soundService';

export interface NexusOrderRankPanelProps {
  levelInfo: ReaderLevelInfo;
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  onShowToast?: (message: string) => void;
}

const ICON_MAP = {
  Feather,
  BookOpen,
  Compass,
  ShieldCheck,
  Key,
  Scroll,
  Landmark,
  Gem,
  Crown,
  Sparkles
};

export const NexusOrderRankPanel: React.FC<NexusOrderRankPanelProps> = ({
  levelInfo,
  avatarUrl,
  displayName,
  username,
  onShowToast
}) => {
  const {
    level,
    rank,
    totalXp,
    xpInLevel,
    xpNeededForNext,
    progressPercent,
    isMaxLevel,
    unlockedTitles,
    activeTitle,
    breakdown
  } = levelInfo;

  const [currentActiveTitle, setCurrentActiveTitle] = useState(activeTitle);
  const [isTitleSelectorOpen, setIsTitleSelectorOpen] = useState(false);

  useEffect(() => {
    setCurrentActiveTitle(activeTitle);
  }, [activeTitle]);

  const handleSelectTitle = (title: string) => {
    setSelectedHonorificTitle(title);
    setCurrentActiveTitle(title);
    setIsTitleSelectorOpen(false);
    soundService.playBrassBell();
    onShowToast?.(`Título honorífico cambiado a «${title}»`);
  };

  return (
    <section className="catalog-card-panel relative pt-8 sm:pt-9 p-6 sm:p-8 shadow-xl mt-6 space-y-6">
      <div className="catalog-brass-tab" aria-hidden="true">
        Jerarquía Bibliotecaria · La Orden del Nexus
      </div>

      {/* ─── Encabezado del Panel ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#222B3D] pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono text-[11px] font-bold border border-amber-600/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>SISTEMA DE PROGRESIÓN LITERARIA</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            La Orden de los Guardianes del Nexus
          </h2>
          <p className="text-xs text-stone-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Asciende a través de los 10 escalafones de la biblioteca legendaria. Cada volumen culminado, página leída y territorio explorado nutre tus Puntos de Sabiduría.
          </p>
        </div>

        {/* Total XP acumulado */}
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-amber-900/15 dark:border-amber-400/20 bg-[#fffcf5]/80 dark:bg-[#121824] shadow-xs self-start md:self-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-bold shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-slate-400">
              Puntos de Sabiduría
            </span>
            <span className="font-mono text-lg font-black text-amber-900 dark:text-amber-300 leading-none">
              {totalXp.toLocaleString()} XP
            </span>
          </div>
        </div>
      </div>

      {/* ─── Ficha del Escalafón Actual (Avatar, Nivel, Título y Barra) ─── */}
      <div className="p-5 sm:p-6 rounded-2xl border border-amber-900/20 dark:border-amber-400/25 bg-gradient-to-br from-[#fbf6ea] via-[#f7eedb] to-[#efe3cd] dark:from-[#151c2b] dark:via-[#131926] dark:to-[#0f1420] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar con marco del escalafón */}
          <div className="shrink-0">
            <UserAvatar
              avatarUrl={avatarUrl}
              displayName={displayName}
              username={username}
              size="2xl"
              level={level}
              rank={rank}
              showLevelBadge={true}
            />
          </div>

          {/* Información del lector y rango */}
          <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold border shadow-xs ${rank.badgeStyle}`}>
                Rango {rank.roman} · Nivel {level}
              </span>
              <span className="text-xs font-mono text-stone-500 dark:text-slate-400">
                ({rank.latinName})
              </span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white leading-tight">
              {rank.name}
            </h3>

            <p className="text-xs text-stone-600 dark:text-slate-300 font-serif italic max-w-xl">
              &ldquo;{rank.description}&rdquo;
            </p>

            <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[11px] font-semibold text-stone-600 dark:text-slate-400">
                Marco honorífico:
              </span>
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 bg-amber-500/15 border border-amber-600/25 px-2.5 py-0.5 rounded-lg">
                {rank.visualFrame}
              </span>
            </div>
          </div>
        </div>

        {/* Selector de Título Honorífico Activo */}
        <div className="pt-3 border-t border-amber-900/15 dark:border-[#222B3D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-stone-700 dark:text-slate-300 block">
              Título Honorífico Exhibido:
            </span>
            <span className="text-[11px] text-stone-500 dark:text-slate-400">
              Puedes elegir cualquier título que hayas desbloqueado en tu trayectoria.
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTitleSelectorOpen(!isTitleSelectorOpen)}
              className="inline-flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl border border-amber-800/25 dark:border-amber-400/30 bg-[#fffcf5] dark:bg-[#161c28] text-xs font-serif font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-500/15 transition shadow-xs"
            >
              <span>{currentActiveTitle}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {isTitleSelectorOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-64 rounded-xl border border-amber-900/20 dark:border-slate-700 bg-[#fffcf5] dark:bg-[#161c28] shadow-2xl z-30 py-1.5 max-h-56 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200 dark:border-slate-700">
                  Títulos Desbloqueados
                </div>
                {unlockedTitles.map((t) => {
                  const isSelected = t === currentActiveTitle;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleSelectTitle(t)}
                      className={`w-full text-left px-3 py-2 text-xs font-serif font-semibold flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-950 dark:text-amber-300 font-bold'
                          : 'text-stone-700 dark:text-slate-300 hover:bg-amber-500/10'
                      }`}
                    >
                      <span>{t}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Barra dorada de progreso hacia el siguiente nivel */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-serif font-bold text-stone-800 dark:text-slate-200">
              Progreso hacia el Nivel {isMaxLevel ? 50 : level + 1}
            </span>
            <span className="font-mono text-stone-600 dark:text-slate-400">
              {isMaxLevel ? (
                'Máximo Rango Alcanzado (Nivel 50)'
              ) : (
                <>
                  <strong className="text-amber-900 dark:text-amber-300">{xpInLevel}</strong> / {xpNeededForNext} XP ({progressPercent}%)
                </>
              )}
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-stone-300/60 dark:bg-slate-700/60 overflow-hidden p-0.5 border border-amber-900/15 dark:border-slate-600">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 transition-all duration-700 shadow"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── Desglose Detallado de XP (Puntos de Sabiduría) ─── */}
      <div className="space-y-3">
        <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Desglose de Puntos de Sabiduría
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Libros leídos */}
          <div className="p-3.5 rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-[#fffcf5]/70 dark:bg-[#121824] space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Libros
              </span>
              <span className="font-mono text-[10px]">{breakdown.booksReadCount} leídos</span>
            </div>
            <div className="font-mono text-base font-bold text-stone-900 dark:text-white">
              +{breakdown.booksBaseXp} <span className="text-xs text-amber-600">XP</span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-tight">
              100 XP base por obra terminada
            </p>
          </div>

          {/* Páginas */}
          <div className="p-3.5 rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-[#fffcf5]/70 dark:bg-[#121824] space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="w-3.5 h-3.5 text-amber-600" /> Páginas
              </span>
              <span className="font-mono text-[10px]">{breakdown.totalPagesRead.toLocaleString()} pág.</span>
            </div>
            <div className="font-mono text-base font-bold text-stone-900 dark:text-white">
              +{breakdown.pagesXp.toLocaleString()} <span className="text-xs text-amber-600">XP</span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-tight">
              1 XP por página devorada
            </p>
          </div>

          {/* Atlas Literario */}
          <div className="p-3.5 rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-[#fffcf5]/70 dark:bg-[#121824] space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Compass className="w-3.5 h-3.5 text-amber-600" /> Atlas
              </span>
              <span className="font-mono text-[10px]">{breakdown.countriesCount} países</span>
            </div>
            <div className="font-mono text-base font-bold text-stone-900 dark:text-white">
              +{breakdown.countriesXp.toLocaleString()} <span className="text-xs text-amber-600">XP</span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-tight">
              150 XP por país con libros leídos
            </p>
          </div>

          {/* Sagas completadas */}
          <div className="p-3.5 rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-[#fffcf5]/70 dark:bg-[#121824] space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-amber-600" /> Sagas
              </span>
              <span className="font-mono text-[10px]">{breakdown.completedSagasCount} sagas</span>
            </div>
            <div className="font-mono text-base font-bold text-stone-900 dark:text-white">
              +{breakdown.sagasXp.toLocaleString()} <span className="text-xs text-amber-600">XP</span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-tight">
              300 XP por saga 100% leída
            </p>
          </div>

          {/* Valoraciones */}
          <div className="p-3.5 rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-[#fffcf5]/70 dark:bg-[#121824] space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Star className="w-3.5 h-3.5 text-amber-600" /> Estrellas
              </span>
            </div>
            <div className="font-mono text-base font-bold text-stone-900 dark:text-white">
              +{breakdown.ratingsXp} <span className="text-xs text-amber-600">XP</span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-tight">
              25 XP por valorar cada obra
            </p>
          </div>

          {/* Reseñas personales */}
          <div className="p-3.5 rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-[#fffcf5]/70 dark:bg-[#121824] space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="w-3.5 h-3.5 text-amber-600" /> Reseñas
              </span>
            </div>
            <div className="font-mono text-base font-bold text-stone-900 dark:text-white">
              +{breakdown.reviewsXp} <span className="text-xs text-amber-600">XP</span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-tight">
              50 XP por notas personales
            </p>
          </div>

          {/* Citas memorables */}
          <div className="p-3.5 rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-[#fffcf5]/70 dark:bg-[#121824] space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Quote className="w-3.5 h-3.5 text-amber-600" /> Citas
              </span>
            </div>
            <div className="font-mono text-base font-bold text-stone-900 dark:text-white">
              +{breakdown.quotesXp} <span className="text-xs text-amber-600">XP</span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-tight">
              15 XP por cita guardada
            </p>
          </div>

          {/* Reto Anual */}
          <div className="p-3.5 rounded-xl border border-amber-900/15 dark:border-[#222B3D] bg-[#fffcf5]/70 dark:bg-[#121824] space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Target className="w-3.5 h-3.5 text-amber-600" /> Reto Anual
              </span>
              {breakdown.isChallengeCompleted && (
                <span className="text-[9px] font-bold text-emerald-600">¡Conseguido!</span>
              )}
            </div>
            <div className="font-mono text-base font-bold text-stone-900 dark:text-white">
              +{breakdown.challengeXp} <span className="text-xs text-amber-600">XP</span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-400 leading-tight">
              Bonificación por cumplir meta anual
            </p>
          </div>
        </div>
      </div>

      {/* ─── Los 10 Escalafones de la Orden (Desbloqueados vs Bloqueados) ─── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Los 10 Escalafones de la Orden
          </h3>
          <span className="text-xs font-mono text-stone-500 dark:text-slate-400">
            {levelInfo.unlockedRanks.length} de 10 alcanzados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ORDER_RANKS.map((r) => {
            const isUnlocked = level >= r.minLevel;
            const isCurrent = rank.id === r.id;
            const Icon = ICON_MAP[r.iconName] || BookOpen;

            return (
              <div
                key={r.id}
                className={`relative p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-2 ${
                  isCurrent
                    ? 'border-amber-500/80 bg-amber-500/15 dark:bg-amber-500/10 shadow-md ring-2 ring-amber-500/30'
                    : isUnlocked
                    ? 'border-amber-900/20 dark:border-[#222B3D] bg-[#fffcf5]/90 dark:bg-[#121824]'
                    : 'border-stone-300/40 dark:border-slate-800/40 bg-stone-100/50 dark:bg-slate-900/30 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-xs font-extrabold text-amber-800 dark:text-amber-300">
                      Rango {r.roman}
                    </span>
                    {isCurrent ? (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-600 text-slate-950 uppercase">
                        Actual
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-stone-400 dark:text-slate-500 font-bold text-[10px] flex items-center gap-0.5">
                        <Lock className="w-3 h-3" /> Nv. {r.minLevel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                        isUnlocked
                          ? 'bg-amber-500/20 border-amber-600/30 text-amber-900 dark:text-amber-300'
                          : 'bg-stone-300/30 dark:bg-slate-800 border-stone-400/30 text-stone-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-serif font-bold text-xs text-stone-900 dark:text-white leading-tight truncate">
                        {r.name}
                      </h4>
                      <span className="text-[10px] font-mono text-stone-500 dark:text-slate-400 block truncate">
                        Niveles {r.minLevel}–{r.maxLevel}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-stone-600 dark:text-slate-400 font-serif italic mt-2 line-clamp-2 leading-snug">
                    {r.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-amber-900/10 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-stone-500 dark:text-slate-400 font-medium truncate">
                    {r.visualFrame}
                  </span>
                  {isUnlocked && r.name !== currentActiveTitle && (
                    <button
                      type="button"
                      onClick={() => handleSelectTitle(r.name)}
                      className="text-amber-800 dark:text-amber-300 font-bold hover:underline shrink-0 ml-1"
                    >
                      Elegir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
