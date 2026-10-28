import { ReadingStatus } from './catalogs';
import { Bookmark, BookOpen, Pause, CheckCircle2, LucideIcon } from 'lucide-react';

export interface ReadingStatusMetaItem {
  key: ReadingStatus;
  label: string;
  icon: LucideIcon;
}

export const READING_STATUS_META: Record<ReadingStatus, ReadingStatusMetaItem> = {
  '❌ No Leído': {
    key: '❌ No Leído',
    label: 'No leído',
    icon: Bookmark
  },
  '⏳ Leyendo': {
    key: '⏳ Leyendo',
    label: 'Leyendo',
    icon: BookOpen
  },
  '⏸️ Pausado': {
    key: '⏸️ Pausado',
    label: 'Pausado',
    icon: Pause
  },
  '✅ Leído': {
    key: '✅ Leído',
    label: 'Leído',
    icon: CheckCircle2
  }
};
