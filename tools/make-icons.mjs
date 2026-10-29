#!/usr/bin/env node
// Fabrique les icônes de l'appli installable (PNG) à partir du logo, avec Chromium (Playwright).
//   node tools/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'icons');
fs.mkdirSync(OUT, { recursive: true });

const ACCENT = '#9b6bff';
const INK = '#120b24';

// Le logo : un « Q » dont la queue est un curseur de terminal, sur fond violet.
// scale : part du carré occupée par le dessin (0.62 pour les icônes masquables, dont Android rogne les bords).
function svg(size, scale, rounded) {
  const r = rounded ? size * 0.22 : 0;
  const s = size * scale;
  const o = (size - s) / 2;
  const u = s / 30; // le logo d'origine est dessiné sur 30 unités
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${ACCENT}"/>
  <circle cx="${o + 14 * u}" cy="${o + 14 * u}" r="${7.2 * u}" fill="none" stroke="${INK}" stroke-width="${3 * u}"/>
  <rect x="${o + 18 * u}" y="${o + 19.5 * u}" width="${8 * u}" height="${3.4 * u}" rx="${1.2 * u}" fill="${INK}"/>
</svg>`;
}

const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 0.8, rounded: false },
  { file: 'icon-512.png', size: 512, scale: 0.8, rounded: false },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.62, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.78, rounded: false },
  { file: 'icon-32.png', size: 32, scale: 1, rounded: true }
];

const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const ic of ICONS) {
  await page.setViewportSize({ width: ic.size, height: ic.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(ic.size, ic.scale, ic.rounded)}</body></html>`);
  await page.screenshot({ path: path.join(OUT, ic.file), omitBackground: true, clip: { x: 0, y: 0, width: ic.size, height: ic.size } });
  console.log('icône : icons/' + ic.file);
}
fs.writeFileSync(path.join(OUT, 'icon.svg'), svg(512, 0.8, true));
await browser.close();
