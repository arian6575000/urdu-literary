// Text Studio helpers that are not tied to React: couplet (sher) layout, shadow/glow presets. Pure, so they are unit-tested in node.
import { uid } from '../../utils/text';
import { MIN_LINE } from './fonts';
import { makeText, type TextElement } from './elements';
import type { FontId } from './types';

/** Lines -> couplets. Two lines make one sher; an odd last line stands alone; one long line is split at the word nearest its middle. */
export function splitCouplets(text: string): [string, string][] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  if (lines.length === 1) {
    const words = lines[0].split(/\s+/);
    if (words.length < 2) return [[lines[0], '']];
    const mid = Math.ceil(words.length / 2);
    return [[words.slice(0, mid).join(' '), words.slice(mid).join(' ')]];
  }
  const out: [string, string][] = [];
  for (let i = 0; i < lines.length; i += 2) out.push([lines[i], lines[i + 1] ?? '']);
  return out;
}

export interface SherOptions { cw: number; ch: number; font: FontId; color: string; fontSize?: number }
/**
 * Classic sher layout: the first misra (misra-e-ula) sits upper-right, the second (misra-e-sani) lower-left, so the eye travels
 * right-to-left then down and back, as on a printed ghazal. Returns two grouped text elements, ready to add to the card.
 */
export function makeSherElements([ula, sani]: [string, string], o: SherOptions): TextElement[] {
  let fontSize = o.fontSize ?? 26;
  const lh = Math.max(MIN_LINE[o.font], 1.8);
  const w = Math.round(o.cw * 0.7), margin = Math.round(o.cw * 0.1);
  const dims = (fs: number) => { const h = Math.ceil(fs * lh * 2.1), gap = Math.round(fs * 0.6); return { h, gap, total: sani ? h * 2 + gap : h }; };
  while (fontSize > 12 && dims(fontSize).total > o.ch - 16) fontSize = Math.round(fontSize * 0.9); // short canvases (16:9): shrink until both misras fit
  const { h, gap, total } = dims(fontSize);
  const y0 = Math.max(8, Math.round((o.ch - total) / 2));
  const groupId = uid();
  const common = { font: o.font, color: o.color, fontSize, lineHeight: lh, w, h, groupId, dir: 'rtl' as const, vAlign: 'middle' as const };
  const first = makeText({ ...common, text: ula, name: 'مصرعِ اولیٰ', x: o.cw - margin - w, y: y0, align: 'right' });
  if (!sani) return [first];
  const second = makeText({ ...common, text: sani, name: 'مصرعِ ثانی', x: margin, y: y0 + h + gap, align: 'left' });
  return [first, second];
}

export interface ShadowSpec { color: string; blur: number; x: number; y: number }
/** Presets for the text effect chips. Glow reuses the text colour so it reads as light, not as a shadow. */
export const SHADOW_PRESETS = {
  soft: (): ShadowSpec => ({ color: 'rgba(0,0,0,0.38)', blur: 4, x: 0, y: 1.2 }),
  hard: (): ShadowSpec => ({ color: 'rgba(0,0,0,0.55)', blur: 0, x: 2, y: 2 }),
  glow: (color: string): ShadowSpec => ({ color, blur: 14, x: 0, y: 0 }),
} as const;

/** The shadow a text element actually draws (null when off). */
export const resolveShadow = (e: Pick<TextElement, 'shadow' | 'shadowColor' | 'shadowBlur' | 'shadowX' | 'shadowY'>): ShadowSpec | null =>
  e.shadow ? { color: e.shadowColor, blur: e.shadowBlur, x: e.shadowX, y: e.shadowY } : null;
