const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function createOgImage() {
  const root = path.resolve(__dirname, '..');
  const heroPath = path.join(root, 'public', 'hero-library.jpg');
  const logoPath = path.join(root, 'public', 'logo.png');
  const outputPath = path.join(root, 'public', 'og-image.png');

  const bg = await sharp(heroPath)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.45, saturation: 1.15 })
    .toBuffer();

  const logoBuf = await sharp(logoPath)
    .resize(130, 130)
    .toBuffer();

  const svgOverlay = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#d97706" stop-opacity="0.25" />
          <stop offset="60%" stop-color="#05070a" stop-opacity="0.65" />
          <stop offset="100%" stop-color="#020407" stop-opacity="0.95" />
        </radialGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef3c7" />
          <stop offset="40%" stop-color="#f5d580" />
          <stop offset="80%" stop-color="#d4af37" />
          <stop offset="100%" stop-color="#9a7018" />
        </linearGradient>
        <linearGradient id="subgold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f5e6c8" />
          <stop offset="100%" stop-color="#d8c19d" />
        </linearGradient>
      </defs>

      <!-- Vignette / Sombra radial -->
      <rect width="1200" height="630" fill="url(#glow)" />

      <!-- Marco clásico de biblioteca de doble línea -->
      <rect x="28" y="28" width="1144" height="574" rx="16" fill="none" stroke="rgba(212, 175, 55, 0.42)" stroke-width="2" />
      <rect x="36" y="36" width="1128" height="558" rx="12" fill="none" stroke="rgba(212, 175, 55, 0.22)" stroke-width="1" stroke-dasharray="6 4" />

      <!-- Esquinas ornamentadas con remaches de latón -->
      <circle cx="28" cy="28" r="4.5" fill="#d4af37" />
      <circle cx="1172" cy="28" r="4.5" fill="#d4af37" />
      <circle cx="28" cy="602" r="4.5" fill="#d4af37" />
      <circle cx="1172" cy="602" r="4.5" fill="#d4af37" />

      <!-- Chapa superior grabada "Santuario Literario" -->
      <g transform="translate(470, 18)">
        <rect x="0" y="0" width="260" height="26" rx="5" fill="#20170e" stroke="#856024" stroke-width="1.2" />
        <circle cx="12" cy="13" r="2.5" fill="#d4af37" />
        <circle cx="248" cy="13" r="2.5" fill="#d4af37" />
        <text x="130" y="17.5" font-family="Georgia, serif" font-size="11.5" font-weight="bold" fill="#f3dec0" text-anchor="middle" letter-spacing="3.5">BIBLIOTECA PERSONAL</text>
      </g>

      <!-- Título principal -->
      <text x="600" y="295" font-family="Georgia, 'Cormorant Garamond', serif" font-size="60" font-weight="bold" fill="url(#gold)" text-anchor="middle" letter-spacing="7">NEXUS LIBRARY</text>
      
      <!-- Subtítulo -->
      <text x="600" y="348" font-family="Georgia, serif" font-size="23" fill="url(#subgold)" text-anchor="middle" font-style="italic" letter-spacing="1.2">Tu Santuario de Lectura Personal</text>

      <!-- Divisor con diamante clásico -->
      <line x1="360" y1="384" x2="560" y2="384" stroke="rgba(212, 175, 55, 0.4)" stroke-width="1" />
      <polygon points="600,378 607,384 600,390 593,384" fill="#d4af37" />
      <line x1="640" y1="384" x2="840" y2="384" stroke="rgba(212, 175, 55, 0.4)" stroke-width="1" />

      <!-- Etiquetas de características (Chips) -->
      <g transform="translate(230, 426)">
        <!-- Chip 1 -->
        <rect x="0" y="0" width="220" height="40" rx="20" fill="rgba(26, 20, 14, 0.88)" stroke="rgba(212, 175, 55, 0.38)" stroke-width="1" />
        <text x="110" y="25" font-family="Arial, Helvetica, sans-serif" font-size="13.5" font-weight="600" fill="#fef3c7" text-anchor="middle">🪵 Estanterías 3D de Roble</text>

        <!-- Chip 2 -->
        <rect x="250" y="0" width="240" height="40" rx="20" fill="rgba(26, 20, 14, 0.88)" stroke="rgba(212, 175, 55, 0.38)" stroke-width="1" />
        <text x="370" y="25" font-family="Arial, Helvetica, sans-serif" font-size="13.5" font-weight="600" fill="#fef3c7" text-anchor="middle">⚔️ Seguimiento de Sagas</text>

        <!-- Chip 3 -->
        <rect x="520" y="0" width="220" height="40" rx="20" fill="rgba(26, 20, 14, 0.88)" stroke="rgba(212, 175, 55, 0.38)" stroke-width="1" />
        <text x="630" y="25" font-family="Arial, Helvetica, sans-serif" font-size="13.5" font-weight="600" fill="#fef3c7" text-anchor="middle">🏆 Retos &amp; Estadísticas</text>
      </g>

      <!-- Pie con dominio y atributos -->
      <text x="600" y="546" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="600" fill="rgba(212, 175, 55, 0.85)" text-anchor="middle" letter-spacing="2.5">ESTÉTICA DARK ACADEMIA • LOCAL-FIRST &amp; CLOUD SYNC • NEXUS-LIBRARY.VERCEL.APP</text>
    </svg>
  `);

  await sharp(bg)
    .composite([
      { input: logoBuf, top: 72, left: 535 },
      { input: svgOverlay, top: 0, left: 0 }
    ])
    .png({ quality: 95 })
    .toFile(outputPath);

  console.log('OG image created successfully at ' + outputPath);
}

createOgImage().catch((err) => {
  console.error('Error creating OG image:', err);
  process.exit(1);
});
