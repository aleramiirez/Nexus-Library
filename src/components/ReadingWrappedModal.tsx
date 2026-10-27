import React, { useRef, useState } from 'react';
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
  Star
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
  onShowToast?: (message: string) => void;
}

export const ReadingWrappedModal: React.FC<ReadingWrappedModalProps> = ({
  isOpen,
  onClose,
  stats,
  userName = 'Lector Nexus',
  onShowToast
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

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

      // 1. Fondo elegante oscuro con textura de pergamino de noche
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1400);
      bgGrad.addColorStop(0, '#0c1017');
      bgGrad.addColorStop(0.5, '#141a26');
      bgGrad.addColorStop(1, '#090d14');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 1400);

      // Marco dorado ornamental
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, 1200 - 72, 1400 - 72);
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(46, 46, 1200 - 92, 1400 - 92);

      // 2. Encabezado
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f59e0b';
      ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('NEXUS LIBRARY · MEMORIA LITERARIA', 600, 110);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px "Cinzel", Georgia, serif';
      ctx.fillText(yearLabel.toUpperCase(), 600, 185);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 26px Georgia, serif';
      ctx.fillText(`Colección personal de ${userName}`, 600, 230);

      // Línea divisoria dorada
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
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
        ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(c.label, x + cardW / 2, y + 42);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 50px "Cinzel", Georgia, serif';
        ctx.fillText(c.val, x + cardW / 2, y + 106);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(c.sub, x + cardW / 2, y + 144);
      });

      // 4. Bloque destacado: Obra más querida y género predilecto
      const blockY = 710;
      const blockW = 1050;
      const blockH = 210;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(75, blockY, blockW, blockH, 22);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✦ OBRA MÁS DESTACADA DEL AÑO', 110, blockY + 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Georgia, serif';
      const favTitle = topFavorite ? topFavorite.nombre : 'Sin lecturas finalizadas';
      ctx.fillText(favTitle.length > 38 ? favTitle.slice(0, 36) + '...' : favTitle, 110, blockY + 105);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'italic 22px Georgia, serif';
      const favAuthor = topFavorite ? `por ${topFavorite.autor || 'Autor anónimo'}` : 'Añade libros leídos para ver tu top';
      ctx.fillText(favAuthor, 110, blockY + 145);

      if (stats.topGenre) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f59e0b';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('GÉNERO ESTRELLA', 1080, blockY + 50);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 32px Georgia, serif';
        ctx.fillText(stats.topGenre, 1080, blockY + 95);
      }

      // 5. Mosaico de libros leídos (cubiertas estilizadas vectoriales)
      const shelfY = 960;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f59e0b';
      ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('ESTANTERÍA DEL AÑO', 75, shelfY - 15);

      const showcaseBooks = stats.completedBooks.slice(0, 6);
      const bookSlotW = 155;
      const bookSlotH = 230;
      const gap = 24;

      showcaseBooks.forEach((b, idx) => {
        const bx = 75 + idx * (bookSlotW + gap);
        // Base del libro
        ctx.fillStyle = idx % 2 === 0 ? '#1f293d' : '#2b2116';
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, shelfY, bookSlotW, bookSlotH, 8);
        ctx.fill();
        ctx.stroke();

        // Lomo lateral estilizado
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.fillRect(bx, shelfY, 14, bookSlotH);

        // Texto del título dentro de la cubierta
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 15px Georgia, serif';
        ctx.textAlign = 'center';
        const shortTitle = b.nombre.length > 28 ? b.nombre.slice(0, 26) + '...' : b.nombre;
        ctx.fillText(shortTitle, bx + bookSlotW / 2 + 5, shelfY + 60, bookSlotW - 25);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 12px Georgia, serif';
        const shortAuthor = (b.autor || '').length > 20 ? (b.autor || '').slice(0, 18) + '...' : (b.autor || '');
        ctx.fillText(shortAuthor, bx + bookSlotW / 2 + 5, shelfY + 95, bookSlotW - 25);

        if (b.puntuacion) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText('⭐'.repeat(b.puntuacion), bx + bookSlotW / 2 + 5, shelfY + 195);
        }
      });

      // 6. Pie de página
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0e131d] border border-amber-600/35 rounded-3xl shadow-2xl text-slate-100 overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior con botón cerrar */}
        <div className="flex items-center justify-between border-b border-amber-900/25 px-5 py-3.5 bg-[#0a0d14]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-serif text-sm font-bold text-amber-200">
              Nexus Wrapped · Memoria Literaria
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ficha Visual Editorial */}
        <div ref={cardRef} className="p-5 sm:p-7 space-y-5 bg-gradient-to-b from-[#0e131d] via-[#121824] to-[#0a0d14]">
          {/* Cabecera */}
          <div className="text-center space-y-1 border-b border-amber-900/20 pb-4">
            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-mono font-semibold">
              Ex-Libris Personal
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
              {yearLabel.toUpperCase()}
            </h2>
            <p className="font-serif italic text-xs sm:text-sm text-slate-300">
              Colección y lecturas de {userName}
            </p>
          </div>

          {/* Cuadrícula de 4 métricas clave */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-amber-600/30 bg-amber-500/10 p-3.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-amber-300 block">
                Libros Leídos
              </span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-200 mt-0.5">
                {stats.completedCount}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {stats.percentage}% de {stats.targetGoal} de meta
              </span>
            </div>

            <div className="rounded-2xl border border-amber-900/25 bg-slate-900/60 p-3.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Páginas Leídas
              </span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-white mt-0.5">
                {stats.totalPagesRead.toLocaleString('es-ES')}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                ~{stats.avgPagesPerBook} págs por obra
              </span>
            </div>

            <div className="rounded-2xl border border-amber-900/25 bg-slate-900/60 p-3.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Tiempo Dedicado
              </span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-white mt-0.5">
                ~{stats.estimatedHoursRead}h
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                en historias y relatos
              </span>
            </div>

            <div className="rounded-2xl border border-amber-900/25 bg-slate-900/60 p-3.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Calificación Media
              </span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-300 mt-0.5">
                {stats.avgRating !== null ? `${stats.avgRating} ⭐` : '—'}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {stats.ratedCount} libros calificados
              </span>
            </div>
          </div>

          {/* Obra destacada del año */}
          {topFavorite ? (
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 flex items-center gap-4">
              <div className="w-16 shrink-0 shadow-lg rounded-lg overflow-hidden">
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
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-400 tracking-wider">
                  <Award className="w-3 h-3" /> Obra más valorada
                </span>
                <h3 className="font-serif font-bold text-base text-white truncate mt-0.5">
                  {topFavorite.nombre}
                </h3>
                <p className="text-xs text-slate-300 italic truncate">
                  {topFavorite.autor || 'Autor no especificado'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-amber-400 text-xs font-bold">
                    {formatStars(topFavorite.puntuacion)}
                  </span>
                  {topFavorite.genero && (
                    <span className="text-[10px] rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 font-medium">
                      {topFavorite.genero}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Balda visual de libros leídos */}
          {stats.completedBooks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-serif italic text-amber-300">
                  Estantería de lecturas del año ({stats.completedBooks.length} obras)
                </span>
                {stats.topGenre && (
                  <span className="text-[10px] rounded-full border border-amber-600/30 bg-amber-500/15 text-amber-200 px-2 py-0.5 font-semibold">
                    Género favorito: {stats.topGenre}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {stats.completedBooks.slice(0, 6).map((b) => (
                  <div key={b.id} className="relative group rounded-lg overflow-hidden shadow">
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
            </div>
          )}
        </div>

        {/* Barra de acciones fija en el pie */}
        <div className="flex items-center justify-between gap-3 border-t border-amber-900/20 bg-[#0a0d14] px-5 py-3.5">
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-200 font-semibold px-3.5 py-2 text-xs transition"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
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
