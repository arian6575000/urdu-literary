// Generates the app icons (pure Node, no dependencies): emerald background, gold ring, gold calligraphy nib (qalam).
// Writes assets/icon.png, android-icon-{foreground,background,monochrome}.png, splash-icon.png, favicon.png.
// Runs automatically from scripts/copy-font.mjs (CI + `npm start`), so the icons never need uploading as binaries.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const out = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'assets');
mkdirSync(out, { recursive: true });

// ---- PNG encoder ----
const T = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); };
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---- artwork in a 1024 x 1024 design space ----
const GOLD = [193, 154, 91], EMERALD_IN = [31, 98, 74], EMERALD_OUT = [14, 50, 38];
const half = [[512, 226], [560, 260], [606, 340], [632, 440], [618, 520], [580, 610], [540, 700], [512, 790]]; // right side of the nib, top -> tip
const NIB = [...half, ...half.slice(0, -1).reverse().map(([x, y]) => [1024 - x, y])];
function inPoly(x, y) { let inside = false; for (let i = 0, j = NIB.length - 1; i < NIB.length; j = i++) { const [xi, yi] = NIB[i], [xj, yj] = NIB[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; }
function gold(x, y) { // is this design-space point gold?
  const d = Math.hypot(x - 512, y - 512);
  if (d >= 304 && d <= 316) return true; // ring
  if (inPoly(x, y)) {
    if (Math.hypot(x - 512, y - 505) < 24) return false;              // breather hole
    if (Math.abs(x - 512) < 4.5 && y > 505 && y < 800) return false; // slit
    if (y > 372 && y < 380 && Math.abs(x - 512) < 90) return false;   // shoulder line
    return true;
  }
  return false;
}
const bg = (x, y) => { const t = Math.min(1, Math.hypot(x - 512, y - 430) / 720); return EMERALD_IN.map((c, i) => Math.round(c + (EMERALD_OUT[i] - c) * t)); };

function render(size, mode) {
  const buf = Buffer.alloc(size * size * 4), S = 3, k = 1024 / size;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let cov = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) if (gold((px + (sx + 0.5) / S) * k, (py + (sy + 0.5) / S) * k)) cov++;
    cov /= S * S;
    const o = (py * size + px) * 4, b = bg((px + 0.5) * k, (py + 0.5) * k);
    let c, a;
    if (mode === 'full') { c = GOLD.map((g, i) => Math.round(b[i] + (g - b[i]) * cov)); a = 255; }
    else if (mode === 'bg') { c = b; a = 255; }
    else if (mode === 'mono') { c = [255, 255, 255]; a = Math.round(cov * 255); }
    else { c = GOLD; a = Math.round(cov * 255); } // 'fg' transparent gold
    buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = a;
  }
  return png(size, size, buf);
}

const jobs = [['icon.png', 1024, 'full'], ['android-icon-foreground.png', 1024, 'fg'], ['android-icon-background.png', 1024, 'bg'], ['android-icon-monochrome.png', 1024, 'mono'], ['splash-icon.png', 1024, 'fg'], ['favicon.png', 96, 'full']];
for (const [name, size, mode] of jobs) writeFileSync(join(out, name), render(size, mode));
console.log('Icons generated:', jobs.map((j) => j[0]).join(', '));
