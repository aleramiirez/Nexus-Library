const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// Leer el SVG base para extraer las coordenadas vectoriales exactas
const svgRaw = fs.readFileSync(path.join(publicDir, 'logo.svg'), 'utf8');
const dMatch = svgRaw.match(/\sd="([^"]+)"/);
if (!dMatch) {
  console.error('No se encontró el atributo d en logo.svg');
  process.exit(1);
}
const d = dMatch[1];
const subpaths = d.split(/(?=M\s*)/);

// SVG con fondo transparente para escritorio y relleno cálido de pergamino en el interior del libro y estrella
const desktopSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="170 172 684 684" width="100%" height="100%">
  <defs>
    <linearGradient id="nexusGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5e09f" />
      <stop offset="25%" stop-color="#ddb35b" />
      <stop offset="65%" stop-color="#b8832a" />
      <stop offset="100%" stop-color="#e3be64" />
    </linearGradient>
    <linearGradient id="nexusParchment" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fcf8ed" />
      <stop offset="100%" stop-color="#f3e9d7" />
    </linearGradient>
    <filter id="nexusShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3.5" flood-color="#3a250a" flood-opacity="0.22" />
    </filter>
  </defs>

  <!-- Relleno interior cálido de pergamino para la estrella superior (subpath 0) -->
  <path d="${subpaths[0]}" fill="url(#nexusParchment)" />

  <!-- Relleno interior cálido de pergamino para las páginas del libro (subpath 2) -->
  <path d="${subpaths[2]}" fill="url(#nexusParchment)" />

  <!-- Trazos, filigranas y relieves dorados con sombreado de profundidad -->
  <path d="${d}" fill="url(#nexusGold)" filter="url(#nexusShadow)" fill-rule="evenodd" />
</svg>`;

async function main() {
  console.log('1. Escribiendo nuevo public/logo.svg...');
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), desktopSvg);

  console.log('2. Generando public/logo.png (512x512 transparente)...');
  await sharp(Buffer.from(desktopSvg))
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'logo.png'));

  console.log('3. Generando public/logo-192.png (192x192 transparente)...');
  await sharp(Buffer.from(desktopSvg))
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'logo-192.png'));

  console.log('¡Iconos de escritorio generados con éxito!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
