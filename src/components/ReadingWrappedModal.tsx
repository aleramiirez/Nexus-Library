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

/**
 * Carga de forma segura una imagen de portada para el canvas evitando el "tainting"
 * (contaminación por CORS de navegadores) mediante conversión a DataURL o verificación en micro-canvas.
 */
async function loadSafeCoverImage(book: Book): Promise<HTMLImageElement | null> {
  const sources = [book.portadaDataUrl, book.portadaUrl, book.portadaFallbackUrl].filter(
    (u): u is string => Boolean(u && u.trim())
  );
  if (sources.length === 0) return null;

  for (const src of sources) {
    // 1. Data URL local (nunca contamina el canvas)
    if (src.startsWith('data:image/')) {
      try {
        const img = await new Promise<HTMLImageElement | null>((resolve) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => resolve(null);
          i.src = src;
        });
        if (img && (img.naturalWidth || img.width) > 2) return img;
      } catch {}
    }

    // 2. Fetch CORS a Blob y conversión a DataURL local
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(src, { mode: 'cors', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.type.startsWith('image/')) {
          const dataUrl = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (dataUrl) {
            const img = await new Promise<HTMLImageElement | null>((resolve) => {
              const i = new Image();
              i.onload = () => resolve(i);
              i.onerror = () => resolve(null);
              i.src = dataUrl;
            });
            if (img && (img.naturalWidth || img.width) > 2) return img;
          }
        }
      }
    } catch {}

    // 3. Image con crossOrigin anonymous y comprobación en micro-canvas de seguridad
    try {
      const img = await new Promise<HTMLImageElement | null>((resolve) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        const timer = setTimeout(() => resolve(null), 3500);
        i.onload = () => {
          clearTimeout(timer);
          resolve(i);
        };
        i.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        i.src = src;
      });

      if (img && (img.naturalWidth || img.width) > 2) {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1;
        testCanvas.height = 1;
        const testCtx = testCanvas.getContext('2d');
        if (testCtx) {
          testCtx.drawImage(img, 0, 0, 1, 1);
          try {
            testCanvas.toDataURL(); // Verifica si se puede exportar sin SecurityError
            return img;
          } catch {
            // Tainted, descartar esta fuente
          }
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Dibuja un libro con portada real, textura artesanal de lomo 3D, cantos de páginas
 * y reflejos satinados idénticos a los mostrados en la estantería de la app.
 */
function drawBookCoverOnCanvas(
  ctx: CanvasRenderingContext2D,
  book: Book,
  coverImg: HTMLImageElement | null,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  isDarkCard: boolean,
  paletteIdx: number = 0
) {
  const clothPalettes = [
    ['#7a2231', '#4a1320'], // burdeos
    ['#24523b', '#12301f'], // bosque
    ['#23406e', '#122241'], // marino
    ['#8a5a22', '#553413'], // ocre
    ['#3b4252', '#1e222c'], // pizarra
    ['#5b2f5e', '#321a35']  // ciruela
  ];

  // 1. Sombra de contacto realista sobre la balda o fondo
  ctx.save();
  ctx.fillStyle = isDarkCard ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(bx + bw / 2, by + bh + 2, bw * 0.44, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Cantos de las páginas asomando a la derecha (estilo encuadernación artesanal)
  ctx.save();
  ctx.fillStyle = '#dccfae';
  ctx.fillRect(bx + bw, by + 3, 2, bh - 6);
  ctx.fillStyle = '#b6a784';
  ctx.fillRect(bx + bw + 2, by + 5, 2, bh - 10);
  ctx.fillStyle = '#d3c5a2';
  ctx.fillRect(bx + bw + 4, by + 7, 2, bh - 14);
  ctx.fillStyle = '#8e8062';
  ctx.fillRect(bx + bw + 6, by + 9, 2, bh - 18);
  ctx.restore();

  // 3. Tapa dura del libro recortada con esquinas exteriores redondeadas
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx, by, bw, bh, [3, 6, 6, 3]);
  } else {
    ctx.rect(bx, by, bw, bh);
  }
  ctx.clip();

  if (coverImg && (coverImg.naturalWidth || coverImg.width) > 2) {
    // Portada real dibujada proporcionalmente con recorte central (object-fit: cover)
    const imgW = coverImg.naturalWidth || coverImg.width;
    const imgH = coverImg.naturalHeight || coverImg.height;
    const scale = Math.max(bw / imgW, bh / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = bx + (bw - drawW) / 2;
    const drawY = by + (bh - drawH) / 2;
    ctx.drawImage(coverImg, drawX, drawY, drawW, drawH);
  } else {
    // Si no tiene imagen de portada, cubierta editorial de tela estampada
    const clothColors = clothPalettes[paletteIdx % clothPalettes.length];
    const bookGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    bookGrad.addColorStop(0, clothColors[0]);
    bookGrad.addColorStop(1, clothColors[1]);
    ctx.fillStyle = bookGrad;
    ctx.fillRect(bx, by, bw, bh);

    // Marco dorado interior grabado
    ctx.strokeStyle = 'rgba(236, 213, 150, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 14, by + 12, bw - 22, bh - 24);
    ctx.strokeStyle = 'rgba(236, 213, 150, 0.2)';
    ctx.strokeRect(bx + 17, by + 15, bw - 28, bh - 30);

    // Título y autor estampados en oro
    ctx.fillStyle = '#fce7b0';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    const shortTitle = book.nombre.length > 24 ? book.nombre.slice(0, 22) + '...' : book.nombre;
    ctx.fillText(shortTitle, bx + bw / 2 + 5, by + bh * 0.35, bw - 28);

    ctx.fillStyle = '#ecd596';
    ctx.font = 'italic 12px Georgia, serif';
    const shortAuthor = (book.autor || '').length > 20 ? (book.autor || '').slice(0, 18) + '...' : (book.autor || '');
    ctx.fillText(shortAuthor, bx + bw / 2 + 5, by + bh * 0.52, bw - 28);
  }

  // 4. Textura 3D del lomo y articulación de bisagra a la izquierda (idéntica a CSS .book-cover::before)
  const spineW = Math.max(18, Math.round(bw * 0.15));
  const spineGrad = ctx.createLinearGradient(bx, by, bx + spineW, by);
  spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
  spineGrad.addColorStop(0.12, 'rgba(0, 0, 0, 0.42)');
  spineGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.24)');
  spineGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.05)');
  spineGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.5)');
  spineGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.14)');
  spineGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(bx, by, spineW, bh);

  // 5. Brillo satinado diagonal (barniz de la cubierta)
  const shineGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  shineGrad.addColorStop(0.35, 'transparent');
  shineGrad.addColorStop(0.7, 'transparent');
  shineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
  ctx.fillStyle = shineGrad;
  ctx.fillRect(bx, by, bw, bh);

  // 6. Oscurecimiento en la parte inferior para dar peso 3D
  const bottomShadow = ctx.createLinearGradient(bx, by + bh * 0.72, bx, by + bh);
  bottomShadow.addColorStop(0, 'transparent');
  bottomShadow.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
  ctx.fillStyle = bottomShadow;
  ctx.fillRect(bx, by + bh * 0.72, bw, bh * 0.28);

  // 7. Borde interior sutil
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);

  ctx.restore();
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
      canvas.height = 1540;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isDarkCard = cardTheme === 'dark';

      // 1. Fondo de la tarjeta (adaptado al tema claro u oscuro)
      if (isDarkCard) {
        const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1540);
        bgGrad.addColorStop(0, '#0c1017');
        bgGrad.addColorStop(0.5, '#141a26');
        bgGrad.addColorStop(1, '#090d14');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 1540);

        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 4;
        ctx.strokeRect(36, 36, 1200 - 72, 1540 - 72);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(46, 46, 1200 - 92, 1540 - 92);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1540);
        bgGrad.addColorStop(0, '#fbf5e8');
        bgGrad.addColorStop(0.5, '#f6ebd4');
        bgGrad.addColorStop(1, '#eee0c4');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 1540);

        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 4;
        ctx.strokeRect(36, 36, 1200 - 72, 1540 - 72);
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(46, 46, 1200 - 92, 1540 - 92);
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

      // Pre-cargar portadas reales de forma segura (sin riesgo de canvas tainting)
      const showcaseBooks = stats.completedBooks.slice(0, 6);
      const [topFavImg, ...showcaseImgs] = await Promise.all([
        topFavorite ? loadSafeCoverImage(topFavorite) : Promise.resolve(null),
        ...showcaseBooks.map((b) => loadSafeCoverImage(b))
      ]);

      // 4. Bloque destacado: Obra más querida y género predilecto
      const blockY = 710;
      const blockW = 1050;
      const blockH = 210;
      ctx.fillStyle = isDarkCard ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.12)';
      ctx.strokeStyle = isDarkCard ? 'rgba(16, 185, 129, 0.3)' : 'rgba(5, 150, 105, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(75, blockY, blockW, blockH, 22);
      } else {
        ctx.rect(75, blockY, blockW, blockH);
      }
      ctx.fill();
      ctx.stroke();

      if (topFavorite) {
        // Portada del libro con textura realista 3D a la izquierda
        const favBookW = 108;
        const favBookH = 162;
        const favBookX = 105;
        const favBookY = blockY + (blockH - favBookH) / 2;
        drawBookCoverOnCanvas(ctx, topFavorite, topFavImg, favBookX, favBookY, favBookW, favBookH, isDarkCard, 0);

        // Textos a la derecha del libro
        const textStartX = favBookX + favBookW + 28;
        ctx.textAlign = 'left';
        ctx.fillStyle = isDarkCard ? '#34d399' : '#047857';
        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('✦ OBRA MÁS DESTACADA DEL AÑO', textStartX, blockY + 48);

        ctx.fillStyle = isDarkCard ? '#ffffff' : '#1c1917';
        ctx.font = 'bold 34px Georgia, serif';
        const favTitle = topFavorite.nombre.length > 28 ? topFavorite.nombre.slice(0, 26) + '...' : topFavorite.nombre;
        ctx.fillText(favTitle, textStartX, blockY + 95);

        ctx.fillStyle = isDarkCard ? '#cbd5e1' : '#44403c';
        ctx.font = 'italic 20px Georgia, serif';
        const favAuthor = `por ${topFavorite.autor || 'Autor anónimo'}`;
        ctx.fillText(favAuthor, textStartX, blockY + 132);

        // Estrellas y badge de género
        let badgeX = textStartX;
        if (topFavorite.puntuacion) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText('⭐'.repeat(topFavorite.puntuacion), badgeX, blockY + 172);
          badgeX += topFavorite.puntuacion * 24 + 14;
        }

        if (topFavorite.genero) {
          ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const genreText = topFavorite.genero;
          const genreMetrics = ctx.measureText(genreText);
          const genreW = genreMetrics.width + 20;
          const genreH = 26;
          const genreY = blockY + 152;

          ctx.fillStyle = isDarkCard ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.15)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(badgeX, genreY, genreW, genreH, 8);
          } else {
            ctx.rect(badgeX, genreY, genreW, genreH);
          }
          ctx.fill();

          ctx.fillStyle = isDarkCard ? '#6ee7b7' : '#047857';
          ctx.fillText(genreText, badgeX + 10, genreY + 18);
        }
      } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = isDarkCard ? '#34d399' : '#047857';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('✦ OBRA MÁS DESTACADA DEL AÑO', 110, blockY + 50);

        ctx.fillStyle = isDarkCard ? '#ffffff' : '#1c1917';
        ctx.font = 'bold 36px Georgia, serif';
        ctx.fillText('Sin lecturas finalizadas', 110, blockY + 105);

        ctx.fillStyle = isDarkCard ? '#cbd5e1' : '#44403c';
        ctx.font = 'italic 22px Georgia, serif';
        ctx.fillText('Añade libros leídos para ver tu top', 110, blockY + 145);
      }

      if (stats.topGenre) {
        ctx.textAlign = 'right';
        ctx.fillStyle = isDarkCard ? '#f59e0b' : '#b45309';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('GÉNERO ESTRELLA', 1080, blockY + 50);
        ctx.fillStyle = isDarkCard ? '#fbbf24' : '#92400e';
        ctx.font = 'bold 32px Georgia, serif';
        ctx.fillText(stats.topGenre, 1080, blockY + 95);
      }

      // 5. Mosaico de libros leídos estilo estantería física con texturas reales
      const shelfTitleY = 965;
      ctx.textAlign = 'left';
      ctx.fillStyle = isDarkCard ? '#f59e0b' : '#b45309';
      ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('ESTANTERÍA DEL AÑO', 75, shelfTitleY);

      const shelfY = 995;
      const bookSlotW = 155;
      const bookSlotH = 225;
      const gap = 24;

      // Balda de madera artesanal bajo los libros
      const plankY = shelfY + bookSlotH;
      const plankW = 1050;
      const plankX = 75;

      // Superficie superior de la balda
      const plankTopGrad = ctx.createLinearGradient(plankX, plankY, plankX, plankY + 14);
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
      ctx.fillRect(plankX, plankY, plankW, 14);

      // Canto frontal de la balda
      const plankFrontGrad = ctx.createLinearGradient(plankX, plankY + 14, plankX, plankY + 30);
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
      ctx.fillRect(plankX, plankY + 14, plankW, 16);

      // Sombra proyectada por la balda debajo del canto frontal
      ctx.fillStyle = isDarkCard ? 'rgba(0, 0, 0, 0.65)' : 'rgba(70, 40, 10, 0.35)';
      ctx.fillRect(plankX, plankY + 30, plankW, 14);

      // Placa central de latón en la balda
      ctx.textAlign = 'center';
      ctx.fillStyle = isDarkCard ? 'rgba(251, 191, 36, 0.75)' : 'rgba(120, 53, 15, 0.8)';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`NEXUS LIBRARY · MEMORIAS ${stats.year}`, plankX + plankW / 2, plankY + 25);

      // Dibujar cada libro con su portada real y acabado 3D
      showcaseBooks.forEach((b, idx) => {
        const bx = 75 + idx * (bookSlotW + gap);
        drawBookCoverOnCanvas(
          ctx,
          b,
          showcaseImgs[idx],
          bx,
          shelfY,
          bookSlotW,
          bookSlotH,
          isDarkCard,
          idx
        );
      });

      // 6. Pie
      ctx.textAlign = 'center';
      ctx.fillStyle = isDarkCard ? '#64748b' : '#78716c';
      ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Biblioteca personal gestionada con NEXUS · nexus-library.app', 600, 1460);

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
