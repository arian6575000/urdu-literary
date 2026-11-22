// Pure colour helpers (no React Native imports so they run in node tests).
export type RGB = [number, number, number];
export interface HSV { h: number; s: number; v: number }

/** Accepts "#abc", "abc", "#AABBCC"; returns "#aabbcc" or null. */
export function normalizeHex(input: string): string | null {
  let t = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(t)) t = t.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/.test(t) ? `#${t}` : null;
}
export const hexToRgb = (hex: string): RGB => { const h = normalizeHex(hex) ?? '#000000'; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
export const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');

export function hexToHsv(hex: string): HSV {
  const [r, g, b] = hexToRgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) { h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return { h, s: max ? d / max : 0, v: max };
}
export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Dark or light ink, whichever reads better on `bg`. */
export const readableOn = (bg: string, light = '#FFFFFF', dark = '#1B1730') => (contrast(bg, light) >= contrast(bg, dark) ? light : dark);
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}
export const withAlpha = (hex: string, a: number) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${+a.toFixed(3)})`; };
