import type { CardDesign } from './types';

export const BASE_DESIGN: CardDesign = {
  v: 1, templateId: 'classic', ratio: '4:5',
  text: '', title: '', poet: '', showTitle: false, showPoet: true,
  font: 'alvi', fontSize: 26, lineHeight: 2.0, letterSpacing: 0, align: 'center', textColor: '#3B2A1A', accent: '#B8860B', textShadow: false,
  bg: { kind: 'solid', color: '#F7F0DF' }, pattern: 'none', patternOpacity: 0.14, texture: 'none', decor: 'none',
  image: { uri: null, mode: 'background', opacity: 1, zoom: 1, x: 0, y: 0, dim: 0.25 },
  frame: 'none', divider: 'none', motif: 'none', motifPos: 'top',
  layout: 'center', padding: 34, radius: 0, offsetX: 0, offsetY: 0,
};

export interface Template { id: string; name: string; patch: Partial<CardDesign> }

/** Eight real starting looks. Applying one keeps the user's text, poet, image and card size. */
export const TEMPLATES: Template[] = [
  { id: 'classic', name: 'کلاسک اردو', patch: { font: 'alvi', textColor: '#3B2A1A', accent: '#B8860B', bg: { kind: 'solid', color: '#F7F0DF' }, texture: 'paper', frame: 'double', divider: 'diamond', pattern: 'none', decor: 'none', motif: 'none', layout: 'center', align: 'center', fontSize: 26 } },
  { id: 'minimal', name: 'جدید سادہ', patch: { font: 'naskh', textColor: '#1B1730', accent: '#6A3DD1', bg: { kind: 'solid', color: '#FFFFFF' }, texture: 'none', frame: 'none', divider: 'line', pattern: 'none', decor: 'none', motif: 'none', layout: 'center', align: 'right', fontSize: 24, padding: 40 } },
  { id: 'royal', name: 'شاہانہ ادبی', patch: { font: 'alvi', textColor: '#F6E7B4', accent: '#D4AF37', bg: { kind: 'gradient', from: '#1A1B3A', to: '#3A1C6B', dir: 'd' }, pattern: 'diamonds', patternOpacity: 0.12, texture: 'none', frame: 'ornate', divider: 'flourish', decor: 'none', motif: 'khatam', motifPos: 'top', layout: 'center', align: 'center', fontSize: 26 } },
  { id: 'colorful', name: 'رنگین تخلیقی', patch: { font: 'nastaliq', textColor: '#FFFFFF', accent: '#FFD166', bg: { kind: 'gradient', from: '#6A3DD1', to: '#E0569D', dir: 'd' }, pattern: 'none', texture: 'none', decor: 'petals', frame: 'none', divider: 'dots', motif: 'none', layout: 'center', align: 'center', fontSize: 22, radius: 18 } },
  { id: 'geometric', name: 'اسلامی جیومیٹرک', patch: { font: 'alvi', textColor: '#FFFFFF', accent: '#F2D58A', bg: { kind: 'solid', color: '#0B5D5E' }, pattern: 'khatam', patternOpacity: 0.16, texture: 'none', decor: 'none', frame: 'corners', divider: 'diamond', motif: 'crescent', motifPos: 'top', layout: 'center', align: 'center', fontSize: 26 } },
  { id: 'romantic', name: 'رومانوی', patch: { font: 'alvi', textColor: '#7A1F3D', accent: '#C2255C', bg: { kind: 'gradient', from: '#FFE3EA', to: '#FFC2D1', dir: 'v' }, pattern: 'none', texture: 'none', decor: 'petals', frame: 'single', divider: 'flourish', motif: 'flower', motifPos: 'top', layout: 'center', align: 'center', fontSize: 26 } },
  { id: 'sad', name: 'اداس شاعری', patch: { font: 'nastaliq', textColor: '#D6DCEB', accent: '#8EA1C7', bg: { kind: 'gradient', from: '#232A3B', to: '#0F1320', dir: 'v' }, pattern: 'lines', patternOpacity: 0.07, texture: 'none', decor: 'night', frame: 'none', divider: 'none', motif: 'none', layout: 'center', align: 'right', fontSize: 22, textShadow: true } },
  { id: 'motivation', name: 'حوصلہ افزا', patch: { font: 'alvi', textColor: '#2B1B00', accent: '#7A2E00', bg: { kind: 'gradient', from: '#FFD166', to: '#FF9F1C', dir: 'v' }, pattern: 'none', texture: 'grain', decor: 'rays', frame: 'single', divider: 'line', motif: 'none', layout: 'center', align: 'center', fontSize: 30 } },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

/** Template look + the content/size/image of `cur`. */
export function applyTemplate(cur: CardDesign, id: string): CardDesign {
  const t = templateById(id);
  if (!t) return cur;
  return { ...BASE_DESIGN, ...t.patch, templateId: id, ratio: cur.ratio, text: cur.text, title: cur.title, poet: cur.poet, showTitle: cur.showTitle, showPoet: cur.showPoet, image: cur.image, v: 1 };
}

/** Fresh design for a writing's text. */
export function newDesign(content: { text: string; title: string; poet: string }): CardDesign {
  return applyTemplate({ ...BASE_DESIGN, ...content, showTitle: !!content.title, showPoet: !!content.poet }, 'classic');
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object';
/** Load a saved design safely: unknown/missing fields fall back to defaults, so old saves keep working after upgrades. */
export function sanitizeDesign(raw: unknown): CardDesign | null {
  if (!isObj(raw)) return null;
  const d = { ...BASE_DESIGN, ...raw } as CardDesign;
  d.image = { ...BASE_DESIGN.image, ...(isObj(raw.image) ? raw.image : {}) } as CardDesign['image'];
  d.bg = isObj(raw.bg) && (raw.bg.kind === 'solid' || raw.bg.kind === 'gradient') ? (raw.bg as CardDesign['bg']) : BASE_DESIGN.bg;
  const num = (v: unknown, lo: number, hi: number, dflt: number) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt);
  d.fontSize = num(d.fontSize, 12, 80, BASE_DESIGN.fontSize); d.lineHeight = num(d.lineHeight, 1.2, 3.6, BASE_DESIGN.lineHeight);
  d.letterSpacing = num(d.letterSpacing, -1, 6, 0); d.padding = num(d.padding, 0, 120, BASE_DESIGN.padding); d.radius = num(d.radius, 0, 80, 0);
  d.offsetX = num(d.offsetX, -200, 200, 0); d.offsetY = num(d.offsetY, -300, 300, 0); d.patternOpacity = num(d.patternOpacity, 0, 1, 0.14);
  d.v = 1;
  return d;
}
