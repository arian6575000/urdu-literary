// Vector ornaments for the Studio (pure data → SvgElement). Every one is plain path data, so it stays crisp at any size and recolours.
export interface Ornament { id: string; name: string; viewBox: [number, number]; paths: string[]; fill: boolean; w: number; h: number }

const f = (n: number) => +n.toFixed(2);
/** n-point star as one closed path inside a 100×100 box. */
export function starPath(points: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 ? inner : 1) * 48, a = -Math.PI / 2 + (i * Math.PI) / points;
    pts.push(`${f(50 + Math.cos(a) * r)} ${f(50 + Math.sin(a) * r)}`);
  }
  return `M${pts.join(' L')} Z`;
}
/** Flower: n petals (teardrops) around the centre, plus a centre dot. */
export function flowerPaths(petals: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < petals; i++) {
    const a = (i * 2 * Math.PI) / petals, c = Math.cos(a), s = Math.sin(a);
    const pt = (x: number, y: number) => `${f(50 + x * c - y * s)} ${f(50 + x * s + y * c)}`; // local (x right, y down) rotated about the centre
    out.push(`M50 50 C${pt(-22, -14)} ${pt(-16, -44)} ${pt(0, -46)} C${pt(16, -44)} ${pt(22, -14)} 50 50 Z`);
  }
  out.push('M50 44 A6 6 0 1 1 49.99 44 Z');
  return out;
}

export const ORNAMENTS: Ornament[] = [
  { id: 'crescent', name: 'ہلال', viewBox: [100, 100], fill: true, w: 80, h: 80, paths: ['M62 8 A44 44 0 1 0 62 92 A34 34 0 1 1 62 8 Z'] },
  { id: 'khatam', name: 'ختم', viewBox: [100, 100], fill: true, w: 90, h: 90, paths: [starPath(8, 0.62)] },
  { id: 'star5', name: 'ستارہ', viewBox: [100, 100], fill: true, w: 70, h: 70, paths: [starPath(5, 0.45)] },
  { id: 'flower', name: 'پھول', viewBox: [100, 100], fill: true, w: 90, h: 90, paths: flowerPaths(6) },
  { id: 'leaf', name: 'پتی', viewBox: [100, 100], fill: true, w: 70, h: 70, paths: ['M10 90 C10 40 50 10 90 10 C90 60 50 90 10 90 Z'] },
  { id: 'heart', name: 'دل', viewBox: [100, 100], fill: true, w: 70, h: 70, paths: ['M50 90 C8 56 4 30 24 17 C38 8 48 17 50 28 C52 17 62 8 76 17 C96 30 92 56 50 90 Z'] },
  { id: 'flourish', name: 'آرائشی لکیر', viewBox: [200, 30], fill: false, w: 220, h: 34, paths: ['M4 15 C40 -6 62 36 100 15 C138 -6 160 36 196 15', 'M100 8 L107 15 L100 22 L93 15 Z'] },
  { id: 'arch', name: 'محراب', viewBox: [100, 120], fill: false, w: 70, h: 84, paths: ['M10 116 L10 50 C10 20 30 6 50 4 C70 6 90 20 90 50 L90 116'] },
  { id: 'lotus', name: 'کنول', viewBox: [100, 100], fill: true, w: 90, h: 80, paths: ['M50 12 C62 30 62 60 50 84 C38 60 38 30 50 12 Z', 'M50 84 C20 80 4 56 6 34 C26 38 44 56 50 84 Z', 'M50 84 C80 80 96 56 94 34 C74 38 56 56 50 84 Z'] },
];
export const ornamentById = (id: string) => ORNAMENTS.find((o) => o.id === id);
