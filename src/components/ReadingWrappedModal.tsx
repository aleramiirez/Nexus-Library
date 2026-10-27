import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  BookOpen,
  Award,
  Calendar,
  Flame,
  Star,
  Sun,
  Moon
} from 'lucide-react';
import { Book } from '../types/models';
import { YearReadingStats } from '../services/readingChallengeService';
import { BookCover } from './BookCover';
import { formatStars } from '../constants/catalogs';

interface ReadingWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: YearReadingStats;
  userName?: string;
  darkMode?: boolean;
  onShowToast?: (message: string) => void;
}

export const ReadingWrappedModal: React.FC<ReadingWrappedModalProps> = ({
  isOpen,
  onClose,
  stats,
  userName = 'Lector Nexus',
  darkMode = false,
  onShowToast
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cardTheme, setCardTheme] = useState<'light' | 'dark'>(() => (darkMode ? 'dark' : 'light'));
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCardTheme(darkMode ? 'dark' : 'light');
  }, [darkMode]);

  if (!isOpen) return null;

  const isDark = cardTheme === 'dark';
  const yearLabel = stats.year === 'all' ? 'Histórico Global' : `Año ${stats.year}`;
  const topFavorite = stats.favoriteBooks.length > 0 ? stats.favoriteBooks[0] : null;

  const handleCopyText = async () => {
    const text = [
      `🏛️ Mi Memoria Literaria ${yearLabel} en Nexus Library`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🎯 Reto: ${stats.completedCount} de ${stats.targetGoal} libros (${stats.percentage}%)`,
      `📄 Páginas leídas: ${stats.totalPagesRead.toLocaleString('es-ES')}`,
      `⏱️ Tiempo invertido: ~${stats.estimatedHoursRead} horas de lectura`,
      stats.avgRating ? `⭐ Calificación media: ${stats.avgRating} / 5` : '',
      stats.topGenre ? `🎭 Género predilecto: ${stats.topGenre}` : '',
      topFavorite ? `✨ Obra destacada: «${topFavorite.nombre}» (${topFavorite.autor})` : '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📖 Registrado con Nexus Library`
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      onShowToast?.('¡Resumen de lectura copiado al portapapeles!');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      onShowToast?.('No se pudo copiar al portapapeles.');
    }
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isDarkCard = cardTheme === 'dark';

      // 1. Fondo de la tarjeta (adaptado al tema claro u oscuro)
      if (isDarkCard) {
        const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1400);
        bgGrad.addColorStop(0, '#0c1017');
        bgGrad.addColorStop(0.5, '#141a26');
        bgGrad.addColorStop(1, '#090d14');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 1400);

        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 4;
        ctx.strokeRect(36, 36, 1200 - 72, 1400 - 72);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(46, 46, 1200 - 92, 1400 - 92);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1400);
        bgGrad.addColorStop(0, '#fbf5e8');
        bgGrad.addColorStop(0.5, '#f6ebd4');
        bgGrad.addColorStop(1, '#eee0c4');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 1400);

        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 4;
        ctx.strokeRect(36, 36, 1200 - 72, 1400 - 72);
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(46, 46, 1200 - 92, 1400 - 92);
      }

      // 2. Encabezado
      ctx.textAlign = 'center';
      ctx.fillStyle = isDarkCard ? '#f59e0b' : '#b45309';
      ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('NEXUS LIBRARY · MEMORIA LITERARIA', 600, 110);

      ctx.fillStyle = isDarkCard ? '#ffffff' : '#1c1917';
      ctx.font = 'bold 54px "Cinzel", Georgia, serif';
      ctx.fillText(yearLabel.toUpperCase(), 600, 185);

      ctx.fillStyle = isDarkCard ? '#94a3b8' : '#57534e';
      ctx.font = 'italic 26px Georgia, serif';
      ctx.fillText(`Colección personal de ${userName}`, 600, 230);

      // Línea divisoria ornamental
      ctx.strokeStyle = isDarkCard ? 'rgba(217, 119, 6, 0.4)' : 'rgba(180, 83, 9, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(350, 260);
      ctx.lineTo(850, 260);
      ctx.stroke();

      // 3. Tarjetas métricas centrales (2 filas x 2 cols)
      const cards = [
        { label: 'LIBROS COMPLETADOS', val: `${stats.completedCount}`, sub: `${stats.percentage}% del reto fijado` },
        { label: 'PÁGINAS LEÍDAS', val: stats.totalPagesRead.toLocaleString('es-ES'), sub: `~${stats.avgPagesPerBook} págs por obra` },
        { label: 'TIEMPO ESTIMADO', val: `~${stats.estimatedHoursRead}h`, sub: 'dedicadas a la lectura' },
        { label: 'VALORACIÓN MEDIA', val: stats.avgRating ? `${stats.avgRating} ⭐` : '—', sub: `${stats.ratedCount} libros puntuados` }
      ];

      const cardW = 510;
      const cardH = 170;
      const positions = [
        { x: 75, y: 300 },
        { x: 615, y: 300 },
        { x: 75, y: 500 },
        { x: 615, y: 500 }
      ];

      cards.forEach((c, i) => {
        const { x, y } = positions[i];
        ctx.fillStyle = isDarkCard ? 'rgba(245, 158, 11, 0.06)' : '#fffcf5';
        ctx.strokeStyle = isDarkCard ? 'rgba(245, 158, 11, 0.25)' : 'rgba(180, 83, 9, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = isDarkCard ? '#cbd5e1' : '#78716c';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(c.label, x + cardW / 2, y + 42);

        ctx.fillStyle = isDarkCard ? '#fbbf24' : '#b45309';
        ctx.font = 'bold 50px "Cinzel", Georgia, serif';
        ctx.fillText(c.val, x + cardW / 2, y + 106);

        ctx.fillStyle = isDarkCard ? '#94a3b8' : '#57534e';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(c.sub, x + cardW / 2, y + 144);
      });

      // 4. Bloque destacado: Obra más querida y género predilecto
      const blockY = 710;
      const blockW = 1050;
      const blockH = 210;
      ctx.fillStyle = isDarkCard ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.12)';
      ctx.strokeStyle = isDarkCard ? 'rgba(16, 185, 129, 0.3)' : 'rgba(5, 150, 105, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(75, blockY, blockW, blockH, 22);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = isDarkCard ? '#34d399' : '#047857';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✦ OBRA MÁS DESTACADA DEL AÑO', 110, blockY + 50);

      ctx.fillStyle = isDarkCard ? '#ffffff' : '#1c1917';
      ctx.font = 'bold 36px Georgia, serif';
      const favTitle = topFavorite ? topFavorite.nombre : 'Sin lecturas finalizadas';
      ctx.fillText(favTitle.length > 38 ? favTitle.slice(0, 36) + '...' : favTitle, 110, blockY + 105);

      ctx.fillStyle = isDarkCard ? '#cbd5e1' : '#44403c';
      ctx.font = 'italic 22px Georgia, serif';
      const favAuthor = topFavorite ? `por ${topFavorite.autor || 'Autor anónimo'}` : 'Añade libros leídos para ver tu top';
      ctx.fillText(favAuthor, 110, blockY + 145);

      if (stats.topGenre) {
        ctx.textAlign = 'right';
        ctx.fillStyle = isDarkCard ? '#f59e0b' : '#b45309';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('GÉNERO ESTRELLA', 1080, blockY + 50);
        ctx.fillStyle = isDarkCard ? '#fbbf24' : '#92400e';
        ctx.font = 'bold 32px Georgia, serif';
        ctx.fillText(stats.topGenre, 1080, blockY + 95);
      }

      // 5. Mosaico de libros leídos estilo estantería física
      const shelfY = 930;
      ctx.textAlign = 'left';
      ctx.fillStyle = isDarkCard ? '#f59e0b' : '#b45309';
      ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('ESTANTERÍA DEL AÑO', 75, shelfY - 18);

      const showcaseBooks = stats.completedBooks.slice(0, 6);
      const bookSlotW = 155;
      const bookSlotH = 225;
      const gap = 24;

      // Balda de madera artesanal bajo los libros
      const plankY = shelfY + bookSlotH;
      const plankW = 1050;
      const plankX = 75;

      // Sombra proyectada por la balda
      ctx.fillStyle = isDarkCard ? 'rgba(0, 0, 0, 0.65)' : 'rgba(70, 40, 10, 0.35)';
      ctx.fillRect(plankX, plankY + 22, plankW, 12);

      // Superficie superior de la balda
      const plankTopGrad = ctx.createLinearGradient(plankX, plankY, plankX, plankY + 12);
      if (isDarkCard) {
        plankTopGrad.addColorStop(0, '#8a6040');
        plankTopGrad.addColorStop(0.5, '#62412b');
        plankTopGrad.addColorStop(1, '#4a2f1e');
      } else {
        plankTopGrad.addColorStop(0, '#efd5a6');
        plankTopGrad.addColorStop(0.5, '#dbb67f');
        plankTopGrad.addColorStop(1, '#c4965c');
      }
      ctx.fillStyle = plankTopGrad;
      ctx.fillRect(plankX, plankY, plankW, 12);

      // Canto frontal de la balda
      const plankFrontGrad = ctx.createLinearGradient(plankX, plankY + 12, plankX, plankY + 26);
      if (isDarkCard) {
        plankFrontGrad.addColorStop(0, '#62412b');
        plankFrontGrad.addColorStop(0.6, '#4a2f1e');
        plankFrontGrad.addColorStop(1, '#33200f');
      } else {
        plankFrontGrad.addColorStop(0, '#dbb67f');
        plankFrontGrad.addColorStop(0.6, '#c4965c');
        plankFrontGrad.addColorStop(1, '#a47843');
      }
      ctx.fillStyle = plankFrontGrad;
      ctx.fillRect(plankX, plankY + 12, plankW, 14);

      // Placa central de latón en la balda
      ctx.textAlign = 'center';
      ctx.fillStyle = isDarkCard ? 'rgba(251, 191, 36, 0.6)' : 'rgba(120, 53, 15, 0.7)';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`NEXUS LIBRARY · MEMORIAS ${stats.year}`, plankX + plankW / 2, plankY + 22);

      const clothPalettes = [
        ['#7a2231', '#4a1320'], // burdeos
        ['#24523b', '#12301f'], // bosque
        ['#23406e', '#122241'], // marino
        ['#8a5a22', '#553413'], // ocre
        ['#3b4252', '#1e222c'], // pizarra
        ['#5b2f5e', '#321a35']  // ciruela
      ];

      showcaseBooks.forEach((b, idx) => {
        const bx = 75 + idx * (bookSlotW + gap);

        // 1. Sombra de contacto del libro sobre la balda
        ctx.fillStyle = isDarkCard ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(bx + bookSlotW / 2, plankY + 1, bookSlotW * 0.44, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Cantos de las páginas asomando a la derecha (estilo encuadernación artesanal)
        ctx.fillStyle = '#dccfae';
        ctx.fillRect(bx + bookSlotW, shelfY + 3, 2, bookSlotH - 6);
        ctx.fillStyle = '#b6a784';
        ctx.fillRect(bx + bookSlotW + 2, shelfY + 5, 2, bookSlotH - 10);
        ctx.fillStyle = '#8e8062';
        ctx.fillRect(bx + bookSlotW + 4, shelfY + 8, 2, bookSlotH - 16);

        // 3. Tapa dura del libro (forma con lomo recto y esquinas exteriores redondeadas)
        const clothColors = clothPalettes[idx % clothPalettes.length];
        const bookGrad = ctx.createLinearGradient(bx, shelfY, bx + bookSlotW, shelfY + bookSlotH);
        bookGrad.addColorStop(0, clothColors[0]);
        bookGrad.addColorStop(1, clothColors[1]);
        ctx.fillStyle = bookGrad;

        ctx.beginPath();
        ctx.roundRect(bx, shelfY, bookSlotW, bookSlotH, [2, 6, 6, 2]);
        ctx.fill();

        // 4. Marco dorado editorial grabado en la tela
        ctx.strokeStyle = 'rgba(236, 213, 150, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 18, shelfY + 12, bookSlotW - 28, bookSlotH - 24);
        ctx.strokeStyle = 'rgba(236, 213, 150, 0.2)';
        ctx.strokeRect(bx + 21, shelfY + 15, bookSlotW - 34, bookSlotH - 30);

        // 5. Relieve del lomo y articulación de bisagra a la izquierda
        const spineGrad = ctx.createLinearGradient(bx, shelfY, bx + 22, shelfY);
        spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        spineGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.18)');
        spineGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.55)');
        spineGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.12)');
        spineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = spineGrad;
        ctx.fillRect(bx, shelfY, 22, bookSlotH);

        // 6. Brillo satinado diagonal (barniz de la cubierta)
        const shineGrad = ctx.createLinearGradient(bx, shelfY, bx + bookSlotW, shelfY + bookSlotH);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        shineGrad.addColorStop(0.35, 'transparent');
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.roundRect(bx, shelfY, bookSlotW, bookSlotH, [2, 6, 6, 2]);
        ctx.fill();

        // 7. Texto del libro estampado en oro
        ctx.fillStyle = '#fce7b0';
        ctx.font = 'bold 15px Georgia, serif';
        ctx.textAlign = 'center';
        const shortTitle = b.nombre.length > 26 ? b.nombre.slice(0, 24) + '...' : b.nombre;
        ctx.fillText(shortTitle, bx + bookSlotW / 2 + 5, shelfY + 70, bookSlotW - 32);

        ctx.fillStyle = '#ecd596';
        ctx.font = 'italic 12px Georgia, serif';
        const shortAuthor = (b.autor || '').length > 20 ? (b.autor || '').slice(0, 18) + '...' : (b.autor || '');
        ctx.fillText(shortAuthor, bx + bookSlotW / 2 + 5, shelfY + 105, bookSlotW - 32);

        if (b.puntuacion) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText('⭐'.repeat(b.puntuacion), bx + bookSlotW / 2 + 5, shelfY + 185);
        }
      });

      // 6. Pie
      ctx.textAlign = 'center';
      ctx.fillStyle = isDarkCard ? '#64748b' : '#78716c';
      ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Biblioteca personal gestionada con NEXUS · nexus-library.app', 600, 1345);

      // Generar descarga
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `nexus-resumen-lectura-${stats.year}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      onShowToast?.('Imagen de tu resumen descargada con éxito.');
    } catch (err) {
      console.error('Error al generar la imagen del resumen:', err);
      onShowToast?.('No se pudo generar la imagen descargable.');
    } finally {
      setIsDownloading(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={
          'relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto transition-colors duration-300 ' +
          (isDark
            ? 'bg-[#0e131d] border-amber-600/35 text-slate-100'
            : 'bg-[#fbf6ea] border-amber-800/30 text-stone-900')
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior con selector de tema de la tarjeta y botón cerrar */}
        <div
          className={
            'flex items-center justify-between border-b px-5 py-3.5 transition-colors ' +
            (isDark
              ? 'bg-[#0a0d14] border-amber-900/25'
              : 'bg-[#f3e5c8] border-amber-900/20')
          }
        >
          <div className="flex items-center gap-2">
            <Sparkles className={isDark ? 'w-4 h-4 text-amber-400' : 'w-4 h-4 text-amber-600'} />
            <span
              className={
                'font-serif text-sm font-bold ' +
                (isDark ? 'text-amber-200' : 'text-amber-950')
              }
            >
              Nexus Wrapped · Memoria Literaria
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCardTheme((curr) => (curr === 'dark' ? 'light' : 'dark'))}
              className={
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition ' +
                (isDark
                  ? 'border-slate-700 bg-slate-800/80 text-amber-300 hover:bg-slate-750'
                  : 'border-amber-900/20 bg-white/80 text-amber-950 hover:bg-white shadow-sm')
              }
              title="Alternar apariencia clara / oscura"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">Modo Noche</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={
                'p-1.5 rounded-xl border transition ' +
                (isDark
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
                  : 'border-amber-900/25 bg-[#e8dac0] hover:bg-[#dfcdb0] text-stone-800')
              }
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ficha Visual Editorial */}
        <div
          ref={cardRef}
          className={
            'p-5 sm:p-7 space-y-5 transition-colors ' +
            (isDark
              ? 'bg-gradient-to-b from-[#0e131d] via-[#121824] to-[#0a0d14]'
              : 'bg-gradient-to-b from-[#fffcf5] via-[#fbf6ea] to-[#f4ead4]')
          }
        >
          {/* Cabecera */}
          <div
            className={
              'text-center space-y-1 border-b pb-4 ' +
              (isDark ? 'border-amber-900/20' : 'border-amber-900/15')
            }
          >
            <span
              className={
                'text-[10px] uppercase tracking-[0.25em] font-mono font-semibold ' +
                (isDark ? 'text-amber-400' : 'text-amber-800')
              }
            >
              Ex-Libris Personal
            </span>
            <h2
              className={
                'font-serif text-2xl sm:text-3xl font-bold tracking-wide ' +
                (isDark ? 'text-white' : 'text-stone-900')
              }
            >
              {yearLabel.toUpperCase()}
            </h2>
            <p
              className={
                'font-serif italic text-xs sm:text-sm ' +
                (isDark ? 'text-slate-300' : 'text-stone-600')
              }
            >
              Colección y lecturas de {userName}
            </p>
          </div>

          {/* Cuadrícula de 4 métricas clave */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={
                'rounded-2xl border p-3.5 text-center ' +
                (isDark
                  ? 'border-amber-600/30 bg-amber-500/10'
                  : 'border-amber-600/35 bg-amber-500/15 shadow-sm')
              }
            >
              <span
                className={
                  'text-[10px] uppercase font-semibold block ' +
                  (isDark ? 'text-amber-300' : 'text-amber-900')
                }
              >
                Libros Leídos
              </span>
              <p
                className={
                  'font-serif text-2xl sm:text-3xl font-bold mt-0.5 ' +
                  (isDark ? 'text-amber-200' : 'text-amber-950')
                }
              >
                {stats.completedCount}
              </p>
              <span
                className={
                  'text-[11px] block mt-0.5 ' +
                  (isDark ? 'text-slate-400' : 'text-stone-600')
                }
              >
                {stats.percentage}% de {stats.targetGoal} de meta
              </span>
            </div>

            <div
              className={
                'rounded-2xl border p-3.5 text-center ' +
                (isDark
                  ? 'border-amber-900/25 bg-slate-900/60'
                  : 'border-amber-900/15 bg-white/85 shadow-sm')
              }
            >
              <span
                className={
                  'text-[10px] uppercase font-semibold block ' +
                  (isDark ? 'text-slate-400' : 'text-stone-500')
                }
              >
                Páginas Leídas
              </span>
              <p
                className={
                  'font-serif text-2xl sm:text-3xl font-bold mt-0.5 ' +
                  (isDark ? 'text-white' : 'text-stone-900')
                }
              >
                {stats.totalPagesRead.toLocaleString('es-ES')}
              </p>
              <span
                className={
                  'text-[11px] block mt-0.5 ' +
                  (isDark ? 'text-slate-400' : 'text-stone-600')
                }
              >
                ~{stats.avgPagesPerBook} págs por obra
              </span>
            </div>

            <div
              className={
                'rounded-2xl border p-3.5 text-center ' +
                (isDark
                  ? 'border-amber-900/25 bg-slate-900/60'
                  : 'border-amber-900/15 bg-white/85 shadow-sm')
              }
            >
              <span
                className={
                  'text-[10px] uppercase font-semibold block ' +
                  (isDark ? 'text-slate-400' : 'text-stone-500')
                }
              >
                Tiempo Dedicado
              </span>
              <p
                className={
                  'font-serif text-2xl sm:text-3xl font-bold mt-0.5 ' +
                  (isDark ? 'text-white' : 'text-stone-900')
                }
              >
                ~{stats.estimatedHoursRead}h
              </p>
              <span
                className={
                  'text-[11px] block mt-0.5 ' +
                  (isDark ? 'text-slate-400' : 'text-stone-600')
                }
              >
                en historias y relatos
              </span>
            </div>

            <div
              className={
                'rounded-2xl border p-3.5 text-center ' +
                (isDark
                  ? 'border-amber-900/25 bg-slate-900/60'
                  : 'border-amber-900/15 bg-white/85 shadow-sm')
              }
            >
              <span
                className={
                  'text-[10px] uppercase font-semibold block ' +
                  (isDark ? 'text-slate-400' : 'text-stone-500')
                }
              >
                Calificación Media
              </span>
              <p
                className={
                  'font-serif text-2xl sm:text-3xl font-bold mt-0.5 ' +
                  (isDark ? 'text-amber-300' : 'text-amber-700')
                }
              >
                {stats.avgRating !== null ? `${stats.avgRating} ⭐` : '—'}
              </p>
              <span
                className={
                  'text-[11px] block mt-0.5 ' +
                  (isDark ? 'text-slate-400' : 'text-stone-600')
                }
              >
                {stats.ratedCount} libros calificados
              </span>
            </div>
          </div>

          {/* Obra destacada del año */}
          {topFavorite ? (
            <div
              className={
                'rounded-2xl border p-4 flex items-center gap-4 ' +
                (isDark
                  ? 'border-emerald-500/35 bg-emerald-500/10'
                  : 'border-emerald-600/35 bg-emerald-500/15 shadow-sm')
              }
            >
              <div className="w-16 shrink-0 relative transition-transform duration-300 hover:scale-105">
                <div className="absolute -bottom-1.5 left-1 right-1 h-2 bg-black/45 blur-[2px] rounded-full pointer-events-none" />
                <BookCover
                  nombre={topFavorite.nombre}
                  autor={topFavorite.autor}
                  portadaUrl={topFavorite.portadaUrl}
                  portadaFallbackUrl={topFavorite.portadaFallbackUrl}
                  portadaDataUrl={topFavorite.portadaDataUrl}
                  size="sm"
                  variant="book"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className={
                    'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ' +
                    (isDark ? 'text-emerald-400' : 'text-emerald-800')
                  }
                >
                  <Award className="w-3 h-3" /> Obra más valorada
                </span>
                <h3
                  className={
                    'font-serif font-bold text-base truncate mt-0.5 ' +
                    (isDark ? 'text-white' : 'text-stone-900')
                  }
                >
                  {topFavorite.nombre}
                </h3>
                <p
                  className={
                    'text-xs italic truncate ' +
                    (isDark ? 'text-slate-300' : 'text-stone-600')
                  }
                >
                  {topFavorite.autor || 'Autor no especificado'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={
                      'text-xs font-bold ' +
                      (isDark ? 'text-amber-400' : 'text-amber-700')
                    }
                  >
                    {formatStars(topFavorite.puntuacion)}
                  </span>
                  {topFavorite.genero && (
                    <span
                      className={
                        'text-[10px] rounded px-1.5 py-0.5 font-medium ' +
                        (isDark
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-emerald-700/15 text-emerald-900')
                      }
                    >
                      {topFavorite.genero}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Balda visual de libros leídos estilo estantería física */}
          {stats.completedBooks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={
                    'text-xs font-serif italic ' +
                    (isDark ? 'text-amber-300' : 'text-amber-900 font-semibold')
                  }
                >
                  Estantería de lecturas del año ({stats.completedBooks.length} obras)
                </span>
                {stats.topGenre && (
                  <span
                    className={
                      'text-[10px] rounded-full border px-2 py-0.5 font-semibold ' +
                      (isDark
                        ? 'border-amber-600/30 bg-amber-500/15 text-amber-200'
                        : 'border-amber-700/30 bg-amber-500/20 text-amber-950')
                    }
                  >
                    Género favorito: {stats.topGenre}
                  </span>
                )}
              </div>

              {/* Mueble / balda física con los libros apoyados */}
              <div className="bookcase relative pt-3.5 px-3 sm:px-4 rounded-2xl bg-amber-950/5 dark:bg-black/30 border border-amber-900/15 dark:border-amber-500/10 shadow-inner">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 items-end pb-1">
                  {stats.completedBooks.slice(0, 6).map((b) => (
                    <div
                      key={b.id}
                      className="group relative cursor-pointer transition-transform duration-300 hover:-translate-y-2 active:scale-95"
                      title={`${b.nombre} (por ${b.autor})`}
                    >
                      {/* Sombra de contacto realista sobre la balda */}
                      <div className="absolute -bottom-1.5 left-1 right-1 h-2.5 bg-black/45 blur-[2px] rounded-full pointer-events-none" />
                      <BookCover
                        nombre={b.nombre}
                        autor={b.autor}
                        portadaUrl={b.portadaUrl}
                        portadaFallbackUrl={b.portadaFallbackUrl}
                        portadaDataUrl={b.portadaDataUrl}
                        size="sm"
                        variant="book"
                      />
                    </div>
                  ))}
                </div>

                {/* Balda de madera con veta, relieve y placa central */}
                <div className="shelf-plank -mx-3 sm:-mx-4 mt-0.5" aria-hidden="true">
                  <div className="shelf-plank-top" />
                  <div className="shelf-plank-front flex items-center justify-center">
                    <span className="text-[9px] font-serif tracking-widest text-amber-900/70 dark:text-amber-200/60 uppercase font-bold py-0.5">
                      Nexus Library · Memorias {stats.year}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de acciones fija en el pie */}
        <div
          className={
            'flex items-center justify-between gap-3 border-t px-5 py-3.5 transition-colors ' +
            (isDark
              ? 'border-amber-900/20 bg-[#0a0d14]'
              : 'border-amber-900/15 bg-[#f3e5c8]')
          }
        >
          <button
            type="button"
            onClick={handleCopyText}
            className={
              'inline-flex items-center gap-1.5 rounded-xl border font-semibold px-3.5 py-2 text-xs transition ' +
              (isDark
                ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-200'
                : 'border-amber-900/20 bg-white hover:bg-[#fffcf5] text-stone-800 shadow-sm')
            }
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar resumen</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadImage}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2 text-xs shadow-md transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Generando imagen...' : 'Descargar imagen'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
