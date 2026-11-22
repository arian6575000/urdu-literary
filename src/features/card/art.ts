// Pure vector art for the card: everything is described as simple primitives in design units (360 px wide canvas).
// The RN app draws them with react-native-svg (CardArt.tsx); tests/tools turn the same list into SVG text, so what we check is what ships.
import type { BgSpec, CardDesign, DecorId, DividerId, FrameId, MotifId, PatternId, TextureId } from './types';

type Common = { op?: number };
export type Prim =
  | ({ t: 'rect'; x: number; y: number; w: number; h: number; rx?: number; fill?: string; stroke?: string; sw?: number; rot?: [number, number, number] } & Common)
  | ({ t: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number } & Common)
  | ({ t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number } & Common)
  | ({ t: 'path'; d: string; fill?: string; stroke?: string; sw?: number; rot?: [number, number, number] } & Common)
  | ({ t: 'poly'; pts: number[]; fill?: string; stroke?: string; sw?: number } & Common)
  | { t: 'grad'; id: string; x2: number; y2: number; stops: [number, string][] };

const f = (n: number) => +n.toFixed(2);
/** Small deterministic random generator so textures look the same every render and in every export. */
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- shapes ---------- */
export const star4 = (cx: number, cy: number, r: number) => `M${f(cx)},${f(cy - r)} Q${f(cx)},${f(cy)} ${f(cx + r)},${f(cy)} Q${f(cx)},${f(cy)} ${f(cx)},${f(cy + r)} Q${f(cx)},${f(cy)} ${f(cx - r)},${f(cy)} Q${f(cx)},${f(cy)} ${f(cx)},${f(cy - r)} Z`;
export const crescent = (cx: number, cy: number, r: number) => `M${f(cx)},${f(cy - r)} A${f(r)},${f(r)} 0 0 0 ${f(cx)},${f(cy + r)} A${f(r * 1.45)},${f(r * 1.45)} 0 0 1 ${f(cx)},${f(cy - r)} Z`;
const squarePts = (cx: number, cy: number, r: number, off: number) => [0, 1, 2, 3].flatMap((k) => { const a = ((off + k * 90) * Math.PI) / 180; return [f(cx + r * Math.cos(a)), f(cy + r * Math.sin(a))]; });
const petal = (cx: number, cy: number, len: number, wid: number) => `M${f(cx)},${f(cy)} C${f(cx - wid)},${f(cy - len * 0.4)} ${f(cx - wid)},${f(cy - len)} ${f(cx)},${f(cy - len)} C${f(cx + wid)},${f(cy - len)} ${f(cx + wid)},${f(cy - len * 0.4)} ${f(cx)},${f(cy)} Z`;

/* ---------- background ---------- */
/** Content-derived id: identical gradients share one definition, different ones never collide. */
export const gradId = (bg: { from: string; to: string; dir: string }) => `g${bg.from.slice(1)}${bg.to.slice(1)}${bg.dir}`;
export function baseBg(bg: BgSpec, w: number, h: number): Prim[] {
  if (bg.kind === 'solid') return [{ t: 'rect', x: 0, y: 0, w, h, fill: bg.color }];
  const [x2, y2] = bg.dir === 'v' ? [0, 1] : bg.dir === 'h' ? [1, 0] : [1, 1];
  const id = gradId(bg);
  return [{ t: 'grad', id, x2, y2, stops: [[0, bg.from], [1, bg.to]] }, { t: 'rect', x: 0, y: 0, w, h, fill: `url(#${id})` }];
}

export function patternPrims(id: PatternId, w: number, h: number, color: string, op: number): Prim[] {
  const out: Prim[] = [];
  if (id === 'none') return out;
  if (id === 'dots') { for (let y = 14; y < h; y += 28) for (let x = 14 + ((y / 28) % 2 ? 14 : 0); x < w; x += 28) out.push({ t: 'circle', cx: x, cy: y, r: 1.8, fill: color, op }); }
  if (id === 'lines') { for (let x = -h; x < w; x += 22) out.push({ t: 'line', x1: x, y1: h, x2: x + h, y2: 0, stroke: color, sw: 1, op }); }
  if (id === 'grid') { for (let x = 0; x <= w; x += 30) out.push({ t: 'line', x1: x, y1: 0, x2: x, y2: h, stroke: color, sw: 0.8, op }); for (let y = 0; y <= h; y += 30) out.push({ t: 'line', x1: 0, y1: y, x2: w, y2: y, stroke: color, sw: 0.8, op }); }
  if (id === 'diamonds') { for (let y = 0; y < h + 24; y += 24) for (let x = ((y / 24) % 2 ? 0 : 12); x < w + 24; x += 24) out.push({ t: 'poly', pts: [x, y - 7, x + 7, y, x, y + 7, x - 7, y], stroke: color, sw: 1, op }); }
  if (id === 'khatam') { for (let y = 24; y < h + 24; y += 48) for (let x = 24; x < w + 24; x += 48) { out.push({ t: 'poly', pts: squarePts(x, y, 16, 45), stroke: color, sw: 1.1, op }); out.push({ t: 'poly', pts: squarePts(x, y, 16, 0), stroke: color, sw: 1.1, op }); out.push({ t: 'circle', cx: x, cy: y, r: 2.2, fill: color, op }); } }
  if (id === 'waves') { for (let y = 18; y < h; y += 22) { let d = `M0,${y}`; for (let x = 0; x < w; x += 36) d += ` q9,-8 18,0 t18,0`; out.push({ t: 'path', d, stroke: color, sw: 1, op }); } }
  return out;
}

export function texturePrims(id: TextureId, w: number, h: number, ink: string): Prim[] {
  const out: Prim[] = [];
  if (id === 'none') return out;
  const r = rng(id === 'paper' ? 7 : id === 'grain' ? 13 : 3);
  if (id === 'paper' || id === 'grain') { const n = id === 'paper' ? 150 : 260; for (let i = 0; i < n; i++) out.push({ t: 'circle', cx: f(r() * w), cy: f(r() * h), r: f(0.4 + r() * (id === 'paper' ? 1.1 : 0.7)), fill: ink, op: f(0.05 + r() * 0.1) }); }
  if (id === 'linen') { for (let x = 0; x < w; x += 5) out.push({ t: 'line', x1: x, y1: 0, x2: x, y2: h, stroke: ink, sw: 0.6, op: 0.05 }); for (let y = 0; y < h; y += 5) out.push({ t: 'line', x1: 0, y1: y, x2: w, y2: y, stroke: ink, sw: 0.6, op: 0.05 }); }
  return out;
}

export function decorPrims(id: DecorId, w: number, h: number, accent: string): Prim[] {
  const out: Prim[] = [];
  if (id === 'night') {
    const r = rng(21);
    for (let i = 0; i < 18; i++) out.push({ t: 'circle', cx: f(r() * w), cy: f(r() * h * 0.5), r: f(0.7 + r() * 1.3), fill: '#FFFFFF', op: f(0.4 + r() * 0.5) });
    out.push({ t: 'path', d: crescent(w * 0.8, h * 0.13, 20), fill: accent, op: 0.9, rot: [-25, w * 0.8, h * 0.13] });
    out.push({ t: 'path', d: `M0,${h * 0.9} C${w * 0.25},${h * 0.82} ${w * 0.5},${h * 0.95} ${w * 0.75},${h * 0.87} S${w},${h * 0.9} ${w},${h * 0.9} V${h} H0 Z`, fill: '#000000', op: 0.3 });
  }
  if (id === 'dunes') {
    out.push({ t: 'path', d: `M0,${h * 0.82} C${w * 0.3},${h * 0.72} ${w * 0.6},${h * 0.9} ${w},${h * 0.78} V${h} H0 Z`, fill: accent, op: 0.2 });
    out.push({ t: 'path', d: `M0,${h * 0.9} C${w * 0.35},${h * 0.82} ${w * 0.65},${h * 0.96} ${w},${h * 0.88} V${h} H0 Z`, fill: accent, op: 0.3 });
  }
  if (id === 'arches') {
    [0.74, 0.62, 0.5].forEach((k, i) => { const rr = (w * k) / 2, x0 = w / 2 - rr, top = h * 0.07 + i * 12; out.push({ t: 'path', d: `M${f(x0)},${h * 0.5} V${f(top + rr)} A${f(rr)},${f(rr)} 0 0 1 ${f(x0 + 2 * rr)},${f(top + rr)} V${h * 0.5}`, stroke: accent, sw: 1.4 - i * 0.3, op: 0.4 - i * 0.08 }); });
  }
  if (id === 'petals') {
    const spots: [number, number, number][] = [[0, 0, 135], [w, h, -45], [w, 0, -135], [0, h, 45]];
    spots.forEach(([cx, cy, base], s) => { for (let k = 0; k < 6; k++) out.push({ t: 'path', d: petal(cx, cy, 70 + (k % 3) * 18, 18 + (k % 2) * 6), fill: accent, op: f(0.16 + (k % 3) * 0.06), rot: [base - 50 + k * 20, cx, cy] }); void s; });
  }
  if (id === 'rays') {
    const cx = w / 2, cy = -10, L = Math.hypot(w, h) * 1.2;
    for (let k = 0; k < 24; k += 2) { const a1 = ((15 + k * 6.25) * Math.PI) / 180, a2 = ((15 + (k + 1) * 6.25) * Math.PI) / 180; out.push({ t: 'poly', pts: [cx, cy, f(cx + L * Math.cos(a1)), f(cy + L * Math.sin(a1)), f(cx + L * Math.cos(a2)), f(cy + L * Math.sin(a2))], fill: accent, op: 0.14 }); }
  }
  return out;
}

/* ---------- frames (drawn above the text layer) ---------- */
export function framePrims(id: FrameId, w: number, h: number, accent: string): Prim[] {
  if (id === 'none') return [];
  if (id === 'single') return [{ t: 'rect', x: 14, y: 14, w: w - 28, h: h - 28, rx: 4, stroke: accent, sw: 1.6 }];
  if (id === 'double') return [{ t: 'rect', x: 12, y: 12, w: w - 24, h: h - 24, rx: 5, stroke: accent, sw: 2.2 }, { t: 'rect', x: 20, y: 20, w: w - 40, h: h - 40, rx: 2, stroke: accent, sw: 0.8, op: 0.8 }];
  if (id === 'corners') {
    const out: Prim[] = [{ t: 'rect', x: 12, y: 12, w: w - 24, h: h - 24, stroke: accent, sw: 0.8, op: 0.35 }];
    ([[12, 12, 1, 1], [w - 12, 12, -1, 1], [12, h - 12, 1, -1], [w - 12, h - 12, -1, -1]] as const).forEach(([x, y, sx, sy]) => {
      out.push({ t: 'path', d: `M${x},${y + sy * 38} V${y} H${x + sx * 38}`, stroke: accent, sw: 3.2 });
      out.push({ t: 'poly', pts: [x + sx * 9, y + sy * 9 - 5, x + sx * 9 + 5, y + sy * 9, x + sx * 9, y + sy * 9 + 5, x + sx * 9 - 5, y + sy * 9], fill: accent });
    });
    return out;
  }
  if (id === 'ornate') {
    const out: Prim[] = [{ t: 'rect', x: 12, y: 12, w: w - 24, h: h - 24, stroke: accent, sw: 2 }, { t: 'rect', x: 19, y: 19, w: w - 38, h: h - 38, stroke: accent, sw: 0.7, op: 0.8 }];
    const L = 26;
    ([[12, 12, 1, 1], [w - 12, 12, -1, 1], [12, h - 12, 1, -1], [w - 12, h - 12, -1, -1]] as const).forEach(([x, y, sx, sy]) => {
      out.push({ t: 'path', d: `M${x},${y + sy * L} A${L},${L} 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * L},${y}`, stroke: accent, sw: 2 });
      out.push({ t: 'circle', cx: x + sx * 7, cy: y + sy * 7, r: 2.6, fill: accent });
    });
    ([[w / 2, 12], [w / 2, h - 12], [12, h / 2], [w - 12, h / 2]] as const).forEach(([x, y]) => out.push({ t: 'poly', pts: [x, y - 6, x + 6, y, x, y + 6, x - 6, y], fill: accent }));
    return out;
  }
  // arch (mihrab)
  const m = 14, R = (w - 2 * m) / 2, arch = (inset: number) => { const r = R - inset; return `M${m + inset},${h - m - inset} V${m + R} A${f(r)},${f(r)} 0 0 1 ${w - m - inset},${m + R} V${h - m - inset} Z`; };
  return [{ t: 'path', d: arch(0), stroke: accent, sw: 2 }, { t: 'path', d: arch(8), stroke: accent, sw: 0.8, op: 0.8 }];
}

/* ---------- inline divider (box w × 18) ---------- */
export function dividerPrims(id: DividerId, w: number, accent: string): Prim[] {
  const c = w / 2, y = 9;
  if (id === 'none') return [];
  if (id === 'line') return [{ t: 'line', x1: c - 36, y1: y, x2: c + 36, y2: y, stroke: accent, sw: 2 }];
  if (id === 'dots') return [-14, 0, 14].map((dx) => ({ t: 'circle' as const, cx: c + dx, cy: y, r: 2.6, fill: accent }));
  if (id === 'diamond') return [{ t: 'line', x1: c - 64, y1: y, x2: c - 11, y2: y, stroke: accent, sw: 1.4 }, { t: 'line', x1: c + 11, y1: y, x2: c + 64, y2: y, stroke: accent, sw: 1.4 }, { t: 'poly', pts: [c, y - 6, c + 6, y, c, y + 6, c - 6, y], fill: accent }];
  const s = (m: number): Prim => ({ t: 'path', d: `M${c + m * 8},${y} C${c + m * 22},${y - 9} ${c + m * 38},${y + 9} ${c + m * 56},${y - 2} S${c + m * 70},${y - 5} ${c + m * 76},${y}`, stroke: accent, sw: 1.6 });
  return [s(1), s(-1), { t: 'circle', cx: c, cy: y, r: 3.2, fill: accent }];
}

/* ---------- motifs (box size × size) ---------- */
export function motifPrims(id: MotifId, size: number, accent: string): Prim[] {
  const c = size / 2, r = size * 0.42;
  if (id === 'none') return [];
  if (id === 'crescent') return [{ t: 'path', d: crescent(c - r * 0.1, c, r), fill: accent, rot: [-30, c, c] }, { t: 'path', d: star4(c + r * 0.62, c - r * 0.35, r * 0.34), fill: accent }];
  if (id === 'khatam') return [{ t: 'poly', pts: squarePts(c, c, r, 45), stroke: accent, sw: 2 }, { t: 'poly', pts: squarePts(c, c, r, 0), stroke: accent, sw: 2 }, { t: 'poly', pts: squarePts(c, c, r * 0.55, 0), fill: accent, op: 0.35 }, { t: 'circle', cx: c, cy: c, r: r * 0.16, fill: accent }];
  if (id === 'flower') { const out: Prim[] = [0, 90, 180, 270].map((a) => ({ t: 'path' as const, d: petal(c, c, r, r * 0.42), fill: accent, op: 0.9, rot: [a, c, c] as [number, number, number] })); [45, 135, 225, 315].forEach((a) => out.push({ t: 'path', d: petal(c, c, r * 0.62, r * 0.26), fill: accent, op: 0.5, rot: [a, c, c] })); out.push({ t: 'circle', cx: c, cy: c, r: r * 0.17, fill: '#FFFFFF', op: 0.9 }); return out; }
  if (id === 'leaf') return [{ t: 'path', d: `M${c},${c + r} C${c - r},${c} ${c - r * 0.6},${c - r} ${c},${c - r} C${c + r * 0.6},${c - r} ${c + r},${c} ${c},${c + r} Z`, fill: accent, op: 0.9, rot: [35, c, c] }, { t: 'line', x1: c, y1: c + r * 0.9, x2: c, y2: c - r * 0.6, stroke: '#FFFFFF', sw: 1.4, op: 0.7 }];
  if (id === 'moonstars') return [{ t: 'path', d: crescent(c, c, r), fill: accent, rot: [-20, c, c] }, { t: 'path', d: star4(c + r * 0.7, c - r * 0.4, r * 0.28), fill: accent }, { t: 'path', d: star4(c + r * 0.55, c + r * 0.55, r * 0.18), fill: accent }];
  return [{ t: 'path', d: `M${c},${c - r} L${c + r * 0.38},${c} L${c + r * 0.2},${c + r * 0.55} L${c},${c + r} L${c - r * 0.2},${c + r * 0.55} L${c - r * 0.38},${c} Z`, fill: accent, rot: [28, c, c] }, { t: 'circle', cx: c, cy: c - r * 0.05, r: r * 0.1, fill: '#FFFFFF', op: 0.9 }];
}

/** Space the text column must keep free for a top/bottom motif. */
export const MOTIF_SIZE = 52;
export const motifReserve = (d: Pick<CardDesign, 'motif' | 'motifPos'>) => (d.motif !== 'none' && d.motifPos !== 'corners' ? MOTIF_SIZE + 6 : 0);

/** Layers drawn under the text (back) and over it (front: frame + corner motifs). */
export function buildLayers(d: CardDesign, w: number, h: number): { back: Prim[]; front: Prim[] } {
  const back = [...baseBg(d.bg, w, h)];
  back.push(...patternPrims(d.pattern, w, h, d.accent, d.patternOpacity));
  back.push(...texturePrims(d.texture, w, h, d.textColor));
  back.push(...decorPrims(d.decor, w, h, d.accent));
  const front = [...framePrims(d.frame, w, h, d.accent)];
  return { back, front };
}

/** Where the top/bottom/corner motif boxes sit: [x, y, size, rotation]. */
export function motifSpots(d: Pick<CardDesign, 'motif' | 'motifPos'>, w: number, h: number): [number, number, number, number][] {
  if (d.motif === 'none') return [];
  if (d.motifPos === 'top') return [[(w - MOTIF_SIZE) / 2, 28, MOTIF_SIZE, 0]];
  if (d.motifPos === 'bottom') return [[(w - MOTIF_SIZE) / 2, h - 28 - MOTIF_SIZE, MOTIF_SIZE, 0]];
  const s = 34, m = 26;
  return [[m, m, s, 0], [w - m - s, m, s, 90], [m, h - m - s, s, 270], [w - m - s, h - m - s, s, 180]];
}

/* ---------- SVG text (tests / preview tooling) ---------- */
const attrs = (p: { fill?: string; stroke?: string; sw?: number; op?: number }) => `fill="${p.fill ?? 'none'}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.sw ?? 1}" stroke-linecap="round" stroke-linejoin="round"` : ''}${p.op !== undefined ? ` opacity="${p.op}"` : ''}`;
const rot = (r?: [number, number, number]) => (r ? ` transform="rotate(${r[0]} ${f(r[1])} ${f(r[2])})"` : '');
export function primsToSvg(prims: Prim[]): string {
  return prims.map((p) => {
    switch (p.t) {
      case 'grad': return `<defs><linearGradient id="${p.id}" x1="0" y1="0" x2="${p.x2}" y2="${p.y2}">${p.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`;
      case 'rect': return `<rect x="${f(p.x)}" y="${f(p.y)}" width="${f(p.w)}" height="${f(p.h)}"${p.rx ? ` rx="${p.rx}"` : ''} ${attrs(p)}${rot(p.rot)}/>`;
      case 'circle': return `<circle cx="${f(p.cx)}" cy="${f(p.cy)}" r="${f(p.r)}" ${attrs(p)}/>`;
      case 'line': return `<line x1="${f(p.x1)}" y1="${f(p.y1)}" x2="${f(p.x2)}" y2="${f(p.y2)}" ${attrs({ stroke: p.stroke, sw: p.sw, op: p.op })}/>`;
      case 'path': return `<path d="${p.d}" ${attrs(p)}${rot(p.rot)}/>`;
      case 'poly': return `<polygon points="${p.pts.join(' ')}" ${attrs(p)}/>`;
    }
  }).join('');
}
