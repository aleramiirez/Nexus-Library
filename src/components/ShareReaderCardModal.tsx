import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  X,
  Download,
  Share2,
  Copy,
  Sparkles,
  Check,
  Smartphone,
  CreditCard,
  Award,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { AVATAR_PRESETS, getAvatarPreset } from '../constants/avatarPresets';
import { LibrarySelect } from './LibrarySelect';

export type ReaderCardFormat = 'carnet' | 'story';
export type ReaderCardTheme = 'parchment' | 'dark-academia' | 'imperial' | 'midnight';

export interface ShareReaderCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  memberId?: string | null;
  totalBooks?: number;
  readBooks?: number;
  totalSagas?: number;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function getReaderRank(readCount: number): {
  title: string;
  latinTitle: string;
  badge: string;
} {
  if (readCount >= 50) {
    return {
      title: 'Gran Conservador Bibliotecario',
      latinTitle: 'Magnus Custos Bibliothecae',
      badge: 'Nivel V · Honorífico'
    };
  }
  if (readCount >= 25) {
    return {
      title: 'Erudito de los Archivos',
      latinTitle: 'Archivorum Eruditus',
      badge: 'Nivel IV · Erudito'
    };
  }
  if (readCount >= 10) {
    return {
      title: 'Bibliófilo Consagrado',
      latinTitle: 'Bibliophilus Devotus',
      badge: 'Nivel III · Consagrado'
    };
  }
  if (readCount >= 3) {
    return {
      title: 'Lector Voraz',
      latinTitle: 'Lector Avidissimus',
      badge: 'Nivel II · Devoto'
    };
  }
  return {
    title: 'Custodio del Saber',
    latinTitle: 'Custos Scientiae',
    badge: 'Nivel I · Iniciado'
  };
}

// Micrograno de papel para texturizar el fondo del canvas
function drawPaperGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opacity: number = 0.035
) {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  const step = 4;
  for (let py = y; py < y + h; py += step) {
    for (let px = x; px < x + w; px += step) {
      if ((px * 13 + py * 29) % 7 === 0) {
        ctx.fillRect(px, py, 1.2, 1.2);
      }
    }
  }
  ctx.restore();
}

// Carga segura de imagen para evitar tainted canvas
async function loadSafeImage(src?: string | null): Promise<HTMLImageElement | null> {
  if (!src || !src.trim()) return null;

  // 1. Si es un sello preset oficial: renderizar su SVG de Lucide a imagen vectorial
  if (src.startsWith('preset:')) {
    const preset = getAvatarPreset(src);
    if (preset) {
      try {
        const IconComponent = preset.icon as React.ComponentType<any>;
        const svgString = renderToStaticMarkup(
          React.createElement(IconComponent, {
            color: '#fce49b',
            size: 160,
            strokeWidth: 1.9
          })
        );
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        });
        return img;
      } catch {
        return null;
      }
    }
    return null;
  }

  // 2. Data URLs locales (base64)
  if (src.startsWith('data:image/')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // 2. Intento con fetch CORS como blob
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(src, { mode: 'cors', signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (dataUrl) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = dataUrl;
        });
      }
    }
  } catch {}

  // 3. Intento directo con crossOrigin anonymous
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(null), 3000);
      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = src;
    });
  } catch {
    return null;
  }
}

// Dibuja el avatar en el medallón (soporta preset heráldico con icono SVG, foto o monograma)
function drawAvatarMedallion(
  ctx: CanvasRenderingContext2D,
  avatarCenterX: number,
  avatarCenterY: number,
  avatarRadius: number,
  avatarUrl: string | null | undefined,
  loadedAvatarImg: HTMLImageElement | null,
  cleanName: string,
  fontSize: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
  ctx.clip();

  const isPreset = Boolean(avatarUrl && avatarUrl.startsWith('preset:'));
  const preset = isPreset ? getAvatarPreset(avatarUrl) : undefined;

  if (isPreset && loadedAvatarImg) {
    const grad = ctx.createLinearGradient(
      avatarCenterX - avatarRadius,
      avatarCenterY - avatarRadius,
      avatarCenterX + avatarRadius,
      avatarCenterY + avatarRadius
    );
    if (preset?.id === 'preset:quill') {
      grad.addColorStop(0, '#6e1e2d'); grad.addColorStop(1, '#2b080f');
    } else if (preset?.id === 'preset:owl') {
      grad.addColorStop(0, '#1c2d4f'); grad.addColorStop(1, '#090f1c');
    } else if (preset?.id === 'preset:book') {
      grad.addColorStop(0, '#5a3619'); grad.addColorStop(1, '#241306');
    } else if (preset?.id === 'preset:watch') {
      grad.addColorStop(0, '#4e3c1a'); grad.addColorStop(1, '#1d1607');
    } else if (preset?.id === 'preset:lamp') {
      grad.addColorStop(0, '#18422b'); grad.addColorStop(1, '#08170e');
    } else if (preset?.id === 'preset:bust') {
      grad.addColorStop(0, '#333d50'); grad.addColorStop(1, '#121720');
    } else if (preset?.id === 'preset:candle') {
      grad.addColorStop(0, '#73400d'); grad.addColorStop(1, '#2e1702');
    } else if (preset?.id === 'preset:compass') {
      grad.addColorStop(0, '#1b344d'); grad.addColorStop(1, '#07111c');
    } else if (preset?.id === 'preset:scroll') {
      grad.addColorStop(0, '#6e2229'); grad.addColorStop(1, '#29070a');
    } else if (preset?.id === 'preset:library') {
      grad.addColorStop(0, '#23232b'); grad.addColorStop(1, '#0c0c0f');
    } else {
      grad.addColorStop(0, '#4a2810'); grad.addColorStop(1, '#1e0f05');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(
      avatarCenterX - avatarRadius,
      avatarCenterY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );

    const iconSize = Math.round(avatarRadius * 1.15);
    ctx.drawImage(
      loadedAvatarImg,
      avatarCenterX - iconSize / 2,
      avatarCenterY - iconSize / 2,
      iconSize,
      iconSize
    );
  } else if (loadedAvatarImg) {
    ctx.drawImage(
      loadedAvatarImg,
      avatarCenterX - avatarRadius,
      avatarCenterY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
  } else {
    const grad = ctx.createLinearGradient(
      avatarCenterX - avatarRadius,
      avatarCenterY - avatarRadius,
      avatarCenterX + avatarRadius,
      avatarCenterY + avatarRadius
    );
    grad.addColorStop(0, '#5a3619');
    grad.addColorStop(1, '#241306');
    ctx.fillStyle = grad;
    ctx.fillRect(
      avatarCenterX - avatarRadius,
      avatarCenterY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );

    ctx.fillStyle = '#fce49b';
    ctx.font = `bold ${fontSize}px "Cinzel", "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (cleanName || 'NL').charAt(0).toUpperCase();
    ctx.fillText(initial, avatarCenterX, avatarCenterY);
  }
  ctx.restore();
}

export const ShareReaderCardModal: React.FC<ShareReaderCardModalProps> = ({
  isOpen,
  onClose,
  displayName,
  username,
  avatarUrl,
  bio,
  memberId,
  totalBooks = 0,
  readBooks = 0,
  totalSagas = 0,
  onShowToast
}) => {
  const [format, setFormat] = useState<ReaderCardFormat>('carnet');
  const [theme, setTheme] = useState<ReaderCardTheme>('parchment');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cleanName = displayName?.trim() || 'Lector Nexus';
  const cleanUsername = username?.trim() ? `@${username.trim()}` : '@lector';
  const cleanId = (memberId || 'INVITADO').slice(0, 8).toUpperCase();
  const rank = useMemo(() => getReaderRank(readBooks), [readBooks]);
  const cleanBio = useMemo(
    () =>
      bio?.trim() ||
      'Custodio de volúmenes, páginas devoradas y pasajes memorables en Nexus Library.',
    [bio]
  );

  const isRenderingRef = useRef(false);
  const cachedAvatarUrlRef = useRef<string | null | undefined>(undefined);
  const cachedAvatarImgRef = useRef<HTMLImageElement | null>(null);

  // Generación en Canvas
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRenderingRef.current) return;

    isRenderingRef.current = true;
    setIsGenerating(true);

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isStory = format === 'story';
      const width = isStory ? 1080 : 1200;
      const height = isStory ? 1920 : 750;

      canvas.width = width;
      canvas.height = height;

      let loadedAvatarImg = cachedAvatarImgRef.current;
      if (cachedAvatarUrlRef.current !== avatarUrl) {
        cachedAvatarUrlRef.current = avatarUrl;
        loadedAvatarImg = await loadSafeImage(avatarUrl);
        cachedAvatarImgRef.current = loadedAvatarImg;
      }

    // ── Paletas cromáticas ──
    const palettes = {
      parchment: {
        bgTop: '#fbf7ee',
        bgBot: '#eedec2',
        cardBg: '#f7eedd',
        borderOuter: '#784d1e',
        borderInner: '#ab7a3d',
        textPrimary: '#2d1b09',
        textSecondary: '#66421e',
        textAccent: '#8a531e',
        badgeBg: 'rgba(120, 77, 30, 0.1)',
        badgeBorder: 'rgba(120, 77, 30, 0.25)',
        gold: '#b08133',
        goldLight: '#e4c478',
        boxBg: 'rgba(120, 77, 30, 0.05)',
        boxBorder: 'rgba(120, 77, 30, 0.15)'
      },
      'dark-academia': {
        bgTop: '#171922',
        bgBot: '#0d0f14',
        cardBg: '#13161f',
        borderOuter: '#c89d47',
        borderInner: '#6b5426',
        textPrimary: '#f8f1de',
        textSecondary: '#cbb68d',
        textAccent: '#e5be6b',
        badgeBg: 'rgba(200, 157, 71, 0.15)',
        badgeBorder: 'rgba(200, 157, 71, 0.35)',
        gold: '#d4aa52',
        goldLight: '#fbe29f',
        boxBg: 'rgba(200, 157, 71, 0.06)',
        boxBorder: 'rgba(200, 157, 71, 0.18)'
      },
      imperial: {
        bgTop: '#142c20',
        bgBot: '#0b1912',
        cardBg: '#0f2218',
        borderOuter: '#c89d47',
        borderInner: '#50755a',
        textPrimary: '#f7f5ed',
        textSecondary: '#a5cfb5',
        textAccent: '#e5be6b',
        badgeBg: 'rgba(200, 157, 71, 0.15)',
        badgeBorder: 'rgba(200, 157, 71, 0.35)',
        gold: '#d4aa52',
        goldLight: '#fbe29f',
        boxBg: 'rgba(200, 157, 71, 0.07)',
        boxBorder: 'rgba(200, 157, 71, 0.2)'
      },
      midnight: {
        bgTop: '#152136',
        bgBot: '#0a101b',
        cardBg: '#0e1624',
        borderOuter: '#8ea6cb',
        borderInner: '#3e5270',
        textPrimary: '#f2f6fc',
        textSecondary: '#a8bede',
        textAccent: '#7eb1f7',
        badgeBg: 'rgba(142, 166, 203, 0.15)',
        badgeBorder: 'rgba(142, 166, 203, 0.35)',
        gold: '#9cb5dd',
        goldLight: '#d2e2fa',
        boxBg: 'rgba(142, 166, 203, 0.06)',
        boxBorder: 'rgba(142, 166, 203, 0.18)'
      }
    };

    const p = palettes[theme];

    // Fondo base con gradiente suave
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, p.bgTop);
    bgGrad.addColorStop(1, p.bgBot);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Microtextura de papel
    drawPaperGrain(ctx, 0, 0, width, height, theme === 'parchment' ? 0.04 : 0.025);

    // ── Dimensiones del carnet según formato ──
    let cardX = 40;
    let cardY = 40;
    let cardW = width - 80;
    let cardH = height - 80;

    if (isStory) {
      // En modo historia, centramos un carnet majestuoso
      cardW = 980;
      cardH = 1380;
      cardX = (width - cardW) / 2;
      cardY = (height - cardH) / 2;

      // Encabezado decorativo de historia
      ctx.fillStyle = p.textSecondary;
      ctx.font = '600 24px "Cinzel", "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '6px';
      ctx.fillText('• REPÚBLICA DE LAS LETRAS •', width / 2, cardY - 60);

      // Pie decorativo de historia
      ctx.fillStyle = p.textSecondary;
      ctx.font = '500 20px "Cormorant Garamond", Georgia, serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('NEXUS ARCHIVVM · CARNET DE LECTOR', width / 2, cardY + cardH + 70);
    }

    // Fondo del carnet
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = p.cardBg;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.restore();

    // Bordes concéntricos heráldicos
    ctx.strokeStyle = p.borderOuter;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 24);
    ctx.stroke();

    // Borde interior fino con esquinas grabadas
    ctx.strokeStyle = p.borderInner;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(cardX + 16, cardY + 16, cardW - 32, cardH - 32, 16);
    ctx.stroke();

    // Placa de latón superior grabada
    const tabW = Math.min(cardW - 120, 520);
    const tabH = 34;
    const tabX = cardX + (cardW - tabW) / 2;
    const tabY = cardY - 14;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    const brassGrad = ctx.createLinearGradient(tabX, tabY, tabX, tabY + tabH);
    brassGrad.addColorStop(0, '#f9e8a8');
    brassGrad.addColorStop(0.5, '#d5aa48');
    brassGrad.addColorStop(1, '#a67d26');
    ctx.fillStyle = brassGrad;
    ctx.beginPath();
    ctx.roundRect(tabX, tabY, tabW, tabH, [8, 8, 4, 4]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Remaches de latón
    ctx.fillStyle = '#6d4c13';
    ctx.beginPath();
    ctx.arc(tabX + 16, tabY + tabH / 2, 3, 0, Math.PI * 2);
    ctx.arc(tabX + tabW - 16, tabY + tabH / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Texto de la placa
    ctx.fillStyle = '#3a2609';
    ctx.font = 'bold 15px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1.5px';
    ctx.fillText('REPÚBLICA DE LAS LETRAS · ARCHIVO NEXUS', tabX + tabW / 2, tabY + 22);

    // ── CONTENIDO PRINCIPAL SEGÚN FORMATO ──
    if (!isStory) {
      // ══════════════════════════════════════════════════
      // FORMATO HORIZONTAL: CARNET BIBLIOTECARIO (1200x750)
      // ══════════════════════════════════════════════════

      // Encabezado superior interior
      const headerY = cardY + 68;
      ctx.textAlign = 'left';
      ctx.fillStyle = p.textAccent;
      ctx.font = 'bold 13px "Cinzel", "Cormorant Garamond", serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('CARNET OFICIAL DE SOCIO BIBLIOTECARIO', cardX + 48, headerY);

      // Número de socio a la derecha
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = p.gold;
      ctx.fillText(`№ NL-${cleanId}`, cardX + cardW - 48, headerY);

      // Línea divisoria superior
      ctx.strokeStyle = p.boxBorder;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cardX + 48, headerY + 16);
      ctx.lineTo(cardX + cardW - 48, headerY + 16);
      ctx.stroke();

      // Columna Izquierda: Medallón de Sello / Avatar (diámetro 170px)
      const avatarCenterX = cardX + 145;
      const avatarCenterY = cardY + 245;
      const avatarRadius = 82;

      // Anillo de oro exterior
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 6, 0, Math.PI * 2);
      const ringGrad = ctx.createLinearGradient(
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarCenterX + avatarRadius,
        avatarCenterY + avatarRadius
      );
      ringGrad.addColorStop(0, p.goldLight);
      ringGrad.addColorStop(0.5, p.gold);
      ringGrad.addColorStop(1, p.borderOuter);
      ctx.fillStyle = ringGrad;
      ctx.fill();
      ctx.restore();

      // Relleno avatar (imagen, preset heráldico o iniciales)
      drawAvatarMedallion(
        ctx,
        avatarCenterX,
        avatarCenterY,
        avatarRadius,
        avatarUrl,
        loadedAvatarImg,
        cleanName,
        44
      );

      // Badge de rango bajo el avatar
      const rankBadgeY = avatarCenterY + avatarRadius + 32;
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = p.textAccent;
      ctx.fillText(rank.badge.toUpperCase(), avatarCenterX, rankBadgeY);

      // Columna Central & Derecha: Información del Lector
      const infoX = cardX + 270;
      let curY = cardY + 130;

      // Nombre del lector
      ctx.textAlign = 'left';
      ctx.fillStyle = p.textPrimary;
      ctx.font = 'bold 36px "Cinzel", "Cormorant Garamond", Georgia, serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(cleanName, infoX, curY);

      // @username + Rango honorífico
      curY += 34;
      ctx.fillStyle = p.gold;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(cleanUsername, infoX, curY);

      ctx.fillStyle = p.textSecondary;
      ctx.font = 'italic 17px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(`— ${rank.title} (${rank.latinTitle})`, infoX + 160, curY - 1);

      // Biografía o lema del lector
      curY += 34;
      ctx.fillStyle = p.textSecondary;
      ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
      const quoteText = `“${cleanBio}”`;
      // Acortar si es muy larga
      const displayQuote = quoteText.length > 110 ? quoteText.slice(0, 107) + '...”' : quoteText;
      ctx.fillText(displayQuote, infoX, curY);

      // Cajas de Estadísticas de Biblioteca
      curY += 46;
      const stats = [
        { label: 'OBRAS EN CATÁLOGO', value: String(totalBooks) },
        { label: 'VOLÚMENES LEÍDOS', value: String(readBooks) },
        { label: 'SAGAS ATESORADAS', value: String(totalSagas) }
      ];

      const boxW = 240;
      const boxH = 90;
      const boxGap = 18;

      stats.forEach((s, idx) => {
        const bx = infoX + idx * (boxW + boxGap);
        const by = curY;

        ctx.fillStyle = p.boxBg;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 12);
        ctx.fill();

        ctx.strokeStyle = p.boxBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = p.gold;
        ctx.font = 'bold 34px "Cinzel", "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.value, bx + boxW / 2, by + 46);

        ctx.fillStyle = p.textSecondary;
        ctx.font = 'bold 11px monospace';
        ctx.letterSpacing = '1.5px';
        ctx.fillText(s.label, bx + boxW / 2, by + 74);
      });

      // Pie del carnet: Fecha de emisión, sello de lacre y firma
      const footerY = cardY + cardH - 65;

      // Línea divisoria inferior
      ctx.strokeStyle = p.boxBorder;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cardX + 48, footerY - 24);
      ctx.lineTo(cardX + cardW - 48, footerY - 24);
      ctx.stroke();

      // Sello en latín
      ctx.textAlign = 'left';
      ctx.fillStyle = p.textSecondary;
      ctx.font = '600 13px "Cinzel", "Cormorant Garamond", Georgia, serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('EX LIBRIS · VERITAS IN LIBRIS · ARCHIVUM NEXUS', cardX + 48, footerY + 8);

      // Fecha de expedición
      const todayStr = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      ctx.font = '12px "Cormorant Garamond", Georgia, serif';
      ctx.fillStyle = p.textSecondary;
      ctx.fillText(`Expedido formalmente el ${todayStr}`, cardX + 48, footerY + 28);

      // Línea de firma a la derecha
      const sigX = cardX + cardW - 320;
      ctx.strokeStyle = p.borderOuter;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sigX, footerY + 6);
      ctx.lineTo(sigX + 270, footerY + 6);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = p.textAccent;
      ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(cleanName, sigX + 135, footerY - 2);

      ctx.fillStyle = p.textSecondary;
      ctx.font = '10px monospace';
      ctx.letterSpacing = '1px';
      ctx.fillText('FIRMA DEL LECTOR REGISTRADO', sigX + 135, footerY + 22);
    } else {
      // ══════════════════════════════════════════════════
      // FORMATO VERTICAL: STORY / REEL (1080x1920)
      // ══════════════════════════════════════════════════

      let curY = cardY + 90;

      // Subtítulo superior
      ctx.textAlign = 'center';
      ctx.fillStyle = p.textAccent;
      ctx.font = 'bold 15px "Cinzel", "Cormorant Garamond", serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('CARNET OFICIAL DE SOCIO BIBLIOTECARIO', cardX + cardW / 2, curY);

      curY += 28;
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = p.gold;
      ctx.fillText(`№ NL-${cleanId}`, cardX + cardW / 2, curY);

      // Línea divisoria
      curY += 24;
      ctx.strokeStyle = p.boxBorder;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cardX + 80, curY);
      ctx.lineTo(cardX + cardW - 80, curY);
      ctx.stroke();

      // Avatar centrado prominente (diámetro 220px)
      curY += 150;
      const avatarCenterX = cardX + cardW / 2;
      const avatarCenterY = curY;
      const avatarRadius = 110;

      // Anillo dorado
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 8, 0, Math.PI * 2);
      const ringGrad = ctx.createLinearGradient(
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarCenterX + avatarRadius,
        avatarCenterY + avatarRadius
      );
      ringGrad.addColorStop(0, p.goldLight);
      ringGrad.addColorStop(0.5, p.gold);
      ringGrad.addColorStop(1, p.borderOuter);
      ctx.fillStyle = ringGrad;
      ctx.fill();
      ctx.restore();

      drawAvatarMedallion(
        ctx,
        avatarCenterX,
        avatarCenterY,
        avatarRadius,
        avatarUrl,
        loadedAvatarImg,
        cleanName,
        64
      );

      // Badge de nivel
      curY += avatarRadius + 45;
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = p.textAccent;
      ctx.fillText(rank.badge.toUpperCase(), avatarCenterX, curY);

      // Nombre del lector
      curY += 50;
      ctx.fillStyle = p.textPrimary;
      ctx.font = 'bold 44px "Cinzel", "Cormorant Garamond", Georgia, serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(cleanName, avatarCenterX, curY);

      // @username
      curY += 40;
      ctx.fillStyle = p.gold;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(cleanUsername, avatarCenterX, curY);

      // Rango honorífico y lema latino
      curY += 42;
      ctx.fillStyle = p.textSecondary;
      ctx.font = 'italic 22px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(`${rank.title} · ${rank.latinTitle}`, avatarCenterX, curY);

      // Cita o biografía
      curY += 55;
      ctx.fillStyle = p.textSecondary;
      ctx.font = 'italic 19px "Cormorant Garamond", Georgia, serif';
      const quoteText = `“${cleanBio}”`;
      const displayQuote = quoteText.length > 120 ? quoteText.slice(0, 117) + '...”' : quoteText;
      ctx.fillText(displayQuote, avatarCenterX, curY);

      // Estadísticas verticales (3 bloques apilados)
      curY += 75;
      const stats = [
        { label: 'OBRAS EN CATÁLOGO', value: String(totalBooks) },
        { label: 'VOLÚMENES LEÍDOS', value: String(readBooks) },
        { label: 'SAGAS ATESORADAS', value: String(totalSagas) }
      ];

      const boxW = 820;
      const boxH = 80;
      const boxGap = 16;
      const boxX = cardX + (cardW - boxW) / 2;

      stats.forEach((s) => {
        ctx.fillStyle = p.boxBg;
        ctx.beginPath();
        ctx.roundRect(boxX, curY, boxW, boxH, 14);
        ctx.fill();

        ctx.strokeStyle = p.boxBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = p.textSecondary;
        ctx.font = 'bold 14px monospace';
        ctx.letterSpacing = '2px';
        ctx.fillText(s.label, boxX + 32, curY + 46);

        ctx.textAlign = 'right';
        ctx.fillStyle = p.gold;
        ctx.font = 'bold 36px "Cinzel", "Cormorant Garamond", Georgia, serif';
        ctx.fillText(s.value, boxX + boxW - 32, curY + 52);

        curY += boxH + boxGap;
      });

      // Pie decorativo
      curY = cardY + cardH - 85;
      ctx.strokeStyle = p.boxBorder;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cardX + 80, curY);
      ctx.lineTo(cardX + cardW - 80, curY);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = p.textSecondary;
      ctx.font = '600 14px "Cinzel", "Cormorant Garamond", Georgia, serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('EX LIBRIS · VERITAS IN LIBRIS · NEXUS MCMXCIV', cardX + cardW / 2, curY + 40);
    }
    } finally {
      setIsGenerating(false);
      isRenderingRef.current = false;
    }
  }, [
    format,
    theme,
    avatarUrl,
    cleanName,
    cleanUsername,
    cleanId,
    rank,
    cleanBio,
    totalBooks,
    readBooks,
    totalSagas
  ]);

  useEffect(() => {
    if (isOpen) {
      // Breve retraso para asegurar que canvas esté en el DOM
      const timer = setTimeout(() => {
        renderCanvas();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, renderCanvas]);

  const getCanvasBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const blob = await getCanvasBlob();
      if (!blob) throw new Error('No se pudo generar la imagen');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carnet-lector-${cleanUsername.replace('@', '')}-${format}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast?.('¡Carnet Oficial descargado en alta resolución!', 'success');
    } catch {
      onShowToast?.('Error al descargar el carnet.', 'error');
    }
  }, [getCanvasBlob, cleanUsername, format, onShowToast]);

  const handleCopyImage = useCallback(async () => {
    try {
      const blob = await getCanvasBlob();
      if (!blob) throw new Error('No blob');
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2400);
        onShowToast?.('¡Carnet copiado al portapapeles!', 'success');
      } else {
        await handleDownload();
      }
    } catch {
      await handleDownload();
    }
  }, [getCanvasBlob, handleDownload, onShowToast]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const blob = await getCanvasBlob();
      if (!blob) throw new Error('No se pudo generar imagen');

      const file = new File([blob], `carnet-${cleanUsername.replace('@', '')}.png`, {
        type: 'image/png'
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Carnet Oficial de Lector · ${cleanName}`,
          text: `Mi carnet bibliotecario oficial en Nexus Library como ${rank.title}.`,
          files: [file]
        });
        onShowToast?.('¡Compartido con éxito!', 'success');
      } else if (navigator.share) {
        await navigator.share({
          title: `Carnet Oficial de Lector · ${cleanName}`,
          text: `Mi carnet bibliotecario oficial en Nexus Library como ${rank.title}.`
        });
      } else {
        await handleCopyImage();
      }
    } catch {
      // Ignorar cancelaciones de usuario en Web Share
    } finally {
      setIsSharing(false);
    }
  }, [getCanvasBlob, cleanName, cleanUsername, rank.title, handleCopyImage, onShowToast]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pt-8 sm:pt-10 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="catalog-card-panel relative w-full max-w-4xl max-h-[90vh] flex flex-col p-0 shadow-2xl mt-3 sm:mt-4">
        <div className="catalog-brass-tab">
          Expedición de Carnet · República de las Letras
        </div>

        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-amber-900/15 dark:border-[#242f42] bg-[#f7eedc]/80 dark:bg-[#141b27]/80 rounded-t-[14px]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 leading-tight">
                Exportar Carnet de Lector Oficial
              </h2>
              <p className="text-[11px] text-stone-600 dark:text-slate-400">
                Credencial bibliotecaria de alta resolución lista para guardar, imprimir o compartir en redes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido: Preview + Controles */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 p-4 sm:p-6 rounded-b-[14px]">
          {/* Panel Izquierdo: Vista previa en vivo del Canvas */}
          <div className="md:col-span-7 flex flex-col items-center justify-center rounded-xl border border-amber-900/15 dark:border-[#20293a] bg-[#efe4cc]/40 dark:bg-[#090d14]/70 p-4 relative min-h-[380px]">
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs rounded-xl z-10">
                <div className="flex items-center gap-2 text-xs font-serif text-amber-200 bg-stone-900/90 px-3.5 py-1.5 rounded-full border border-amber-400/30">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  Caligrafiando carnet oficial...
                </div>
              </div>
            )}

            <div
              className={
                'relative transition-all duration-300 shadow-2xl rounded-xl overflow-hidden border border-amber-900/20 dark:border-amber-400/20 ' +
                (format === 'carnet'
                  ? 'w-full max-w-[480px] aspect-[1200/750]'
                  : 'w-[230px] sm:w-[260px] aspect-[9/16]')
              }
            >
              <canvas ref={canvasRef} className="w-full h-full object-contain block" />
            </div>

            <p className="text-[11px] text-stone-500 dark:text-slate-400 text-center mt-3 font-serif italic">
              Vista preliminar a escala · Se exportará en ultra-alta resolución PNG
            </p>
          </div>

          {/* Panel Derecho: Personalización y Acciones */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Formato */}
              <div>
                <label className="block text-xs font-semibold text-stone-800 dark:text-slate-200 mb-1.5">
                  Formato de Credencial
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('carnet')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      format === 'carnet'
                        ? 'border-amber-600 bg-amber-500/15 text-amber-950 dark:text-amber-300 font-bold shadow-xs'
                        : 'border-stone-200 dark:border-[#222b3c] bg-white dark:bg-[#121824] text-stone-700 dark:text-slate-300 hover:border-amber-500/40'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>Carnet Físico (3:2)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('story')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      format === 'story'
                        ? 'border-amber-600 bg-amber-500/15 text-amber-950 dark:text-amber-300 font-bold shadow-xs'
                        : 'border-stone-200 dark:border-[#222b3c] bg-white dark:bg-[#121824] text-stone-700 dark:text-slate-300 hover:border-amber-500/40'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    <span>Story / Reel (9:16)</span>
                  </button>
                </div>
              </div>

              {/* Paleta / Estilo */}
              <div>
                <label className="block text-xs font-semibold text-stone-800 dark:text-slate-200 mb-1.5">
                  Estilo de Encuadernación
                </label>
                <LibrarySelect
                  value={theme}
                  onChange={(val) => setTheme(val as ReaderCardTheme)}
                  options={[
                    { value: 'parchment', label: '📜 Papiro & Sepia Clásico' },
                    { value: 'dark-academia', label: '🏛️ Dark Academia & Oro' },
                    { value: 'imperial', label: '🌲 Verde Archivo Imperial' },
                    { value: 'midnight', label: '🌌 Azul Medianoche & Plata' }
                  ]}
                  ariaLabel="Estilo de encuadernación del carnet"
                />
              </div>

              {/* Resumen de Datos que se certificarán */}
              <div className="rounded-xl border border-amber-900/15 dark:border-[#253046] bg-[#fffcf5] dark:bg-[#101623] p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-stone-600 dark:text-slate-400">
                  <span>Rango honorífico:</span>
                  <span className="font-serif font-bold text-amber-800 dark:text-amber-300">
                    {rank.title}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600 dark:text-slate-400">
                  <span>ID de Miembro:</span>
                  <span className="font-mono font-bold text-stone-800 dark:text-slate-200">
                    № NL-{cleanId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600 dark:text-slate-400">
                  <span>Volúmenes leídos:</span>
                  <span className="font-semibold text-stone-800 dark:text-slate-200">{readBooks}</span>
                </div>
              </div>
            </div>

            {/* Acciones principales */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-amber-900/10 dark:border-[#20293c]">
              <button
                type="button"
                onClick={handleShare}
                disabled={isSharing || isGenerating}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {isSharing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>Compartir Carnet</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#161c28] hover:bg-amber-500/10 text-stone-800 dark:text-slate-200 font-semibold text-xs transition active:scale-98"
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span>Descargar PNG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                disabled={isGenerating}
                title="Copiar imagen directamente"
                className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-stone-300 dark:border-[#283246] hover:bg-black/5 dark:hover:bg-white/5 text-stone-700 dark:text-slate-300 text-xs transition active:scale-98"
              >
                {copiedImage ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="sm:hidden">Copiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
