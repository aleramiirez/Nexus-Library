import React from 'react';
import {
  Feather,
  BookOpen,
  Clock,
  Flame,
  Compass,
  Library,
  Landmark,
  Crown,
  Scroll,
  Sparkles
} from 'lucide-react';

export interface AvatarPreset {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  borderColor: string;
  iconColor: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'preset:quill',
    label: 'Pluma',
    title: 'Pluma de Escribano',
    description: 'El trazo y la memoria del cronista',
    icon: Feather,
    gradient: 'from-[#6e1e2d] via-[#4d121c] to-[#2b080f]',
    borderColor: 'border-amber-500/50',
    iconColor: 'text-amber-300'
  },
  {
    id: 'preset:owl',
    label: 'Búho',
    title: 'Búho de Minerva',
    description: 'La mirada atenta de la sabiduría nocturna',
    icon: Sparkles,
    gradient: 'from-[#1c2d4f] via-[#121f36] to-[#090f1c]',
    borderColor: 'border-amber-400/45',
    iconColor: 'text-amber-200'
  },
  {
    id: 'preset:book',
    label: 'Grimorio',
    title: 'Tomo de Cuero Antiguo',
    description: 'Encuadernación artesanal en piel noble',
    icon: BookOpen,
    gradient: 'from-[#5a3619] via-[#3d220e] to-[#241306]',
    borderColor: 'border-amber-600/50',
    iconColor: 'text-amber-400'
  },
  {
    id: 'preset:watch',
    label: 'Reloj',
    title: 'Reloj Victoriano',
    description: 'El tiempo detenido entre las páginas',
    icon: Clock,
    gradient: 'from-[#4e3c1a] via-[#35280f] to-[#1d1607]',
    borderColor: 'border-amber-500/40',
    iconColor: 'text-amber-300'
  },
  {
    id: 'preset:lamp',
    label: 'Lámpara',
    title: 'Lámpara de Archivo',
    description: 'Luz verde sobre el escritorio de roble',
    icon: Landmark,
    gradient: 'from-[#18422b] via-[#0f2c1c] to-[#08170e]',
    borderColor: 'border-emerald-500/45',
    iconColor: 'text-emerald-300'
  },
  {
    id: 'preset:bust',
    label: 'Busto',
    title: 'Busto de Mármol',
    description: 'Elegancia estoica y filosofía clásica',
    icon: Crown,
    gradient: 'from-[#333d50] via-[#212836] to-[#121720]',
    borderColor: 'border-slate-400/40',
    iconColor: 'text-slate-200'
  },
  {
    id: 'preset:candle',
    label: 'Vela',
    title: 'Llama de Vigilia',
    description: 'Lecturas a la luz tibia de medianoche',
    icon: Flame,
    gradient: 'from-[#73400d] via-[#4d2906] to-[#2e1702]',
    borderColor: 'border-amber-500/50',
    iconColor: 'text-amber-400'
  },
  {
    id: 'preset:compass',
    label: 'Brújula',
    title: 'Rosa de los Vientos',
    description: 'Cartografía de mundos y viajes literarios',
    icon: Compass,
    gradient: 'from-[#1b344d] via-[#102133] to-[#07111c]',
    borderColor: 'border-amber-500/40',
    iconColor: 'text-amber-300'
  },
  {
    id: 'preset:scroll',
    label: 'Pergamino',
    title: 'Manuscrito Imperial',
    description: 'Letras capitulares y cera de lacre',
    icon: Scroll,
    gradient: 'from-[#6e2229] via-[#471318] to-[#29070a]',
    borderColor: 'border-amber-500/45',
    iconColor: 'text-amber-300'
  },
  {
    id: 'preset:library',
    label: 'Santuario',
    title: 'Templo del Saber',
    description: 'Columnas, estanterías y silencio reverente',
    icon: Library,
    gradient: 'from-[#23232b] via-[#17171d] to-[#0c0c0f]',
    borderColor: 'border-amber-500/50',
    iconColor: 'text-amber-300'
  }
];

export function getAvatarPreset(presetId?: string | null): AvatarPreset | undefined {
  if (!presetId || !presetId.startsWith('preset:')) return undefined;
  return AVATAR_PRESETS.find((p) => p.id === presetId);
}
