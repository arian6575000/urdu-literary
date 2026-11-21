// Copies the Urdu font into assets/fonts/AlviNastaleeq.ttf so Metro can bundle it.
// Font lives at assets/fonts/AlviNastaleeq.ttf (bundled). This script only re-copies it from the project root if you place the original there.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(app, 'assets', 'fonts', 'AlviNastaleeq.ttf');
if (existsSync(dest)) { console.log('Urdu font already in place'); process.exit(0); }
const candidates = [join(app, 'Alvi Nastaleeq Regular.ttf'), join(app, 'assets', 'Alvi Nastaleeq Regular.ttf')];
const src = candidates.find(existsSync);
if (!src) { console.error('Alvi Nastaleeq Regular.ttf not found (expected at the repository root).'); process.exit(1); }
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log('Urdu font copied from', src);
