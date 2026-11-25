// Scene-graph layer of the card document (v2). Pure and serialisable: no React Native imports, so it runs in node tests.
// The legacy single-text fields of CardDesign stay the "base layer" (what Easy Mode edits); `elements` are extra, independent
// objects drawn ABOVE it. ARRAY ORDER IS THE Z-ORDER (first = bottom), so the layers panel always matches the rendered canvas.
import { uid } from '../../utils/text';
import type { Align, FontId } from './types';

export const DOC_VERSION = 2;
export const MAX_ELEMENTS = 200;

interface Base {
  id: string; name?: string;
  x: number; y: number; w: number; h: number; // design px (canvas is 360 wide), top-left corner before rotation
  rotation: number; // degrees, around the element centre
  opacity: number; visible: boolean; locked: boolean;
  groupId?: string | null; meta?: Record<string, unknown>;
}
export interface TextElement extends Base {
  kind: 'text'; text: string; font: FontId; fontSize: number; lineHeight: number; letterSpacing: number;
  align: Align; dir: 'rtl' | 'ltr'; color: string; bgColor: string | null; padding: number; radius: number; shadow: boolean;
}
export type ShapeKind = 'rect' | 'ellipse' | 'triangle' | 'diamond' | 'star';
export interface ShapeElement extends Base { kind: 'shape'; shape: ShapeKind; fill: string | null; stroke: string | null; strokeWidth: number; radius: number }
/** Horizontal line across the box (use rotation for other angles). */
export interface LineElement extends Base { kind: 'line'; stroke: string; strokeWidth: number; dashed: boolean; arrow: boolean }
/** Vector graphic (ornament, sticker, divider...) as SVG path data in a `viewBox` coordinate space; stays recolourable. */
export interface SvgElement extends Base { kind: 'svg'; viewBox: [number, number]; paths: string[]; fill: string | null; stroke: string | null; strokeWidth: number }
export interface ImageElement extends Base { kind: 'image'; uri: string; fit: 'cover' | 'contain'; radius: number }
/** Element written by a newer app version (or damaged): kept verbatim so nothing is silently lost, never rendered. */
export interface UnknownElement extends Base { kind: 'unknown'; raw: unknown }
export type DesignElement = TextElement | ShapeElement | LineElement | SvgElement | ImageElement | UnknownElement;
export type ElementKind = DesignElement['kind'];

// ---------- factories
const base = (w: number, h: number): Base => ({ id: uid(), x: 0, y: 0, w, h, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null });
type Over<T extends DesignElement> = Partial<Omit<T, 'kind'>>;

export const makeText = (o: Over<TextElement> = {}): TextElement => ({
  ...base(240, 80), kind: 'text', text: '', font: 'alvi', fontSize: 24, lineHeight: 2, letterSpacing: 0, align: 'center', dir: 'rtl',
  color: '#3B2A1A', bgColor: null, padding: 0, radius: 0, shadow: false, ...o,
});
export const makeShape = (o: Over<ShapeElement> = {}): ShapeElement => ({
  ...base(120, 120), kind: 'shape', shape: 'rect', fill: '#B8860B', stroke: null, strokeWidth: 0, radius: 0, ...o,
});
export const makeLine = (o: Over<LineElement> = {}): LineElement => ({
  ...base(160, 12), kind: 'line', stroke: '#B8860B', strokeWidth: 2, dashed: false, arrow: false, ...o,
});
export const makeSvg = (o: Over<SvgElement> & Pick<SvgElement, 'paths'>): SvgElement => ({
  ...base(100, 100), kind: 'svg', viewBox: [100, 100], fill: '#B8860B', stroke: null, strokeWidth: 0, ...o,
});
export const makeImage = (o: Over<ImageElement> & Pick<ImageElement, 'uri'>): ImageElement => ({
  ...base(200, 200), kind: 'image', fit: 'cover', radius: 0, ...o,
});

// ---------- validation / migration of stored data
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const color = (v: unknown, d: string | null): string | null => (v === null ? null : typeof v === 'string' && v.length <= 40 ? v : d);
const FONTS: FontId[] = ['alvi', 'nastaliq', 'naskh', 'amiri'];
const SHAPES: ShapeKind[] = ['rect', 'ellipse', 'triangle', 'diamond', 'star'];

/** Returns a safe element, or null when `raw` is not an object with a string `kind`. Unknown kinds are preserved as UnknownElement. */
export function sanitizeElement(raw: unknown): DesignElement | null {
  if (!isObj(raw) || typeof raw.kind !== 'string') return null;
  const common = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    name: typeof raw.name === 'string' ? raw.name.slice(0, 80) : undefined,
    x: num(raw.x, -2000, 4000, 0), y: num(raw.y, -2000, 4000, 0), w: num(raw.w, 1, 4000, 100), h: num(raw.h, 1, 4000, 100),
    rotation: num(raw.rotation, -360, 360, 0), opacity: num(raw.opacity, 0, 1, 1),
    visible: raw.visible !== false, locked: raw.locked === true,
    groupId: typeof raw.groupId === 'string' ? raw.groupId : null,
    meta: isObj(raw.meta) ? (raw.meta as Record<string, unknown>) : undefined,
  };
  switch (raw.kind) {
    case 'text': return {
      ...common, kind: 'text', text: str(raw.text, '').slice(0, 20000), font: FONTS.includes(raw.font as FontId) ? (raw.font as FontId) : 'alvi',
      fontSize: num(raw.fontSize, 6, 400, 24), lineHeight: num(raw.lineHeight, 1, 4, 2), letterSpacing: num(raw.letterSpacing, -5, 30, 0),
      align: raw.align === 'left' || raw.align === 'right' || raw.align === 'center' ? raw.align : 'center', dir: raw.dir === 'ltr' ? 'ltr' : 'rtl',
      color: color(raw.color, '#3B2A1A') ?? '#3B2A1A', bgColor: color(raw.bgColor, null), padding: num(raw.padding, 0, 200, 0), radius: num(raw.radius, 0, 400, 0), shadow: raw.shadow === true,
    };
    case 'shape': return {
      ...common, kind: 'shape', shape: SHAPES.includes(raw.shape as ShapeKind) ? (raw.shape as ShapeKind) : 'rect',
      fill: color(raw.fill, '#B8860B'), stroke: color(raw.stroke, null), strokeWidth: num(raw.strokeWidth, 0, 100, 0), radius: num(raw.radius, 0, 1000, 0),
    };
    case 'line': return {
      ...common, kind: 'line', stroke: color(raw.stroke, '#B8860B') ?? '#B8860B', strokeWidth: num(raw.strokeWidth, 0.5, 100, 2), dashed: raw.dashed === true, arrow: raw.arrow === true,
    };
    case 'svg': {
      const vb = Array.isArray(raw.viewBox) && raw.viewBox.length === 2 ? [num(raw.viewBox[0], 1, 4000, 100), num(raw.viewBox[1], 1, 4000, 100)] as [number, number] : ([100, 100] as [number, number]);
      const paths = Array.isArray(raw.paths) ? raw.paths.filter((p): p is string => typeof p === 'string' && p.length < 20000).slice(0, 50) : [];
      return { ...common, kind: 'svg', viewBox: vb, paths, fill: color(raw.fill, '#B8860B'), stroke: color(raw.stroke, null), strokeWidth: num(raw.strokeWidth, 0, 100, 0) };
    }
    case 'image': return { ...common, kind: 'image', uri: str(raw.uri, ''), fit: raw.fit === 'contain' ? 'contain' : 'cover', radius: num(raw.radius, 0, 1000, 0) };
    case 'unknown': return { ...common, kind: 'unknown', raw: raw.raw }; // already wrapped by an earlier load: do not wrap twice
    default: return { ...common, kind: 'unknown', raw };
  }
}

/** Sanitise a stored list: drops non-objects, makes ids unique, caps the count. Order (= z-order) is preserved. */
export function sanitizeElements(raw: unknown): DesignElement[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>(); const out: DesignElement[] = [];
  for (const r of raw) {
    const e = sanitizeElement(r); if (!e) continue;
    if (seen.has(e.id)) e.id = uid();
    seen.add(e.id); out.push(e);
    if (out.length >= MAX_ELEMENTS) break;
  }
  return out;
}

// ---------- pure operations (each returns a NEW array; unknown ids are no-ops)
export const findEl = (list: DesignElement[], id: string) => list.find((e) => e.id === id);
export const addEl = (list: DesignElement[], el: DesignElement): DesignElement[] => (list.length >= MAX_ELEMENTS ? list : [...list, el]);
export const removeEl = (list: DesignElement[], id: string): DesignElement[] => list.filter((e) => e.id !== id);

/** Keys that may still change on a locked element (so it can be unlocked / hidden / renamed). Everything else is ignored while locked. */
const LOCK_SAFE = new Set(['locked', 'visible', 'name']);
export function updateEl(list: DesignElement[], id: string, patch: Partial<DesignElement>): DesignElement[] {
  return list.map((e) => {
    if (e.id !== id) return e;
    const p = e.locked ? Object.fromEntries(Object.entries(patch).filter(([k]) => LOCK_SAFE.has(k))) : patch;
    return Object.keys(p).length ? ({ ...e, ...p, id: e.id, kind: e.kind } as DesignElement) : e;
  });
}

/** Copy placed just above the original (and slightly offset), outside any group, never locked. */
export function duplicateEl(list: DesignElement[], id: string): { list: DesignElement[]; id: string | null } {
  const i = list.findIndex((e) => e.id === id);
  if (i < 0 || list.length >= MAX_ELEMENTS) return { list, id: null };
  const src = list[i]; const copy = { ...src, id: uid(), x: src.x + 12, y: src.y + 12, locked: false, groupId: null, name: src.name ? `${src.name} +` : undefined } as DesignElement;
  return { list: [...list.slice(0, i + 1), copy, ...list.slice(i + 1)], id: copy.id };
}

export type Reorder = 'forward' | 'backward' | 'front' | 'back';
export function reorderEl(list: DesignElement[], id: string, op: Reorder): DesignElement[] {
  const i = list.findIndex((e) => e.id === id); if (i < 0) return list;
  const to = op === 'front' ? list.length - 1 : op === 'back' ? 0 : op === 'forward' ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1);
  if (to === i) return list;
  const next = list.slice(); const [el] = next.splice(i, 1); next.splice(to, 0, el);
  return next;
}
/** Drag-to-reorder: move element to an absolute index. */
export function moveEl(list: DesignElement[], id: string, index: number): DesignElement[] {
  const i = list.findIndex((e) => e.id === id); if (i < 0) return list;
  const to = Math.max(0, Math.min(list.length - 1, index)); if (to === i) return list;
  const next = list.slice(); const [el] = next.splice(i, 1); next.splice(to, 0, el);
  return next;
}

export function groupEls(list: DesignElement[], ids: string[]): { list: DesignElement[]; groupId: string | null } {
  const set = new Set(ids); if (list.filter((e) => set.has(e.id)).length < 2) return { list, groupId: null };
  const groupId = uid();
  return { list: list.map((e) => (set.has(e.id) ? ({ ...e, groupId } as DesignElement) : e)), groupId };
}
export const ungroupEls = (list: DesignElement[], groupId: string): DesignElement[] => list.map((e) => (e.groupId === groupId ? ({ ...e, groupId: null } as DesignElement) : e));
/** All ids that belong with `id` (its whole group, or just itself). */
export const withGroup = (list: DesignElement[], id: string): string[] => { const e = findEl(list, id); return e?.groupId ? list.filter((x) => x.groupId === e.groupId).map((x) => x.id) : e ? [id] : []; };

// ---------- geometry helpers
export const centerH = (e: DesignElement, canvasW: number) => Math.round((canvasW - e.w) / 2);
export const centerV = (e: DesignElement, canvasH: number) => Math.round((canvasH - e.h) / 2);
export const renderable = (list: DesignElement[]) => list.filter((e) => e.visible && e.kind !== 'unknown');

/** Star polygon points inside a w×h box (5 points). */
export function starPoints(w: number, h: number, inner = 0.45): string {
  const cx = w / 2, cy = h / 2, pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : 1; const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + Math.cos(a) * r * cx).toFixed(2)},${(cy + Math.sin(a) * r * cy).toFixed(2)}`);
  }
  return pts.join(' ');
}
