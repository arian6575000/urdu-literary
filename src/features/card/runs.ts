// Rich-text runs (Text Studio). Pure and dependency-free so it runs in node tests and can be imported by the element model.
// A run styles the half-open range [s, e) of a text element's UTF-16 offsets. Only properties that keep Urdu joining intact are
// supported (colour, relative size, underline); changing the FONT mid-word would break the joins, so it stays a whole-box property.

export interface TextRun { s: number; e: number; color?: string; scale?: number; underline?: boolean }
export interface RunStyle { color?: string; scale?: number; underline?: boolean }
/** `null` removes that property from the range; `undefined` leaves it alone. */
export interface RunPatch { color?: string | null; scale?: number | null; underline?: boolean | null }

export const MAX_RUNS = 400;
export const SCALE_MIN = 0.5, SCALE_MAX = 3;

type CS = RunStyle | null;
const clampScale = (v: number) => Math.round(Math.max(SCALE_MIN, Math.min(SCALE_MAX, v)) * 100) / 100;

/** Per-character style table; later runs override earlier ones property by property. */
function charStyles(runs: TextRun[], len: number): CS[] {
  const out: CS[] = new Array(len).fill(null);
  for (const r of runs) {
    for (let i = Math.max(0, r.s); i < Math.min(len, r.e); i++) {
      const cur: RunStyle = { ...(out[i] ?? {}) };
      if (r.color !== undefined) cur.color = r.color;
      if (r.scale !== undefined) cur.scale = r.scale;
      if (r.underline !== undefined) cur.underline = r.underline;
      out[i] = cur;
    }
  }
  return out;
}
const same = (a: CS, b: CS) => a === b || (!!a && !!b && a.color === b.color && a.scale === b.scale && a.underline === b.underline);

/** Run-length encode a style table into minimal, non-overlapping, sorted runs. */
function encode(cs: CS[]): TextRun[] {
  const out: TextRun[] = [];
  let i = 0;
  while (i < cs.length && out.length < MAX_RUNS) {
    const st = cs[i];
    let j = i + 1;
    while (j < cs.length && same(cs[j], st)) j++;
    if (st) out.push({ s: i, e: j, ...st });
    i = j;
  }
  return out;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Validate stored runs against the text length; drops junk, clamps ranges, resolves overlaps. Always returns canonical runs. */
export function sanitizeRuns(raw: unknown, len: number): TextRun[] {
  if (!Array.isArray(raw) || len <= 0) return [];
  const clean: TextRun[] = [];
  for (const r of raw.slice(0, MAX_RUNS * 2)) {
    if (!isObj(r) || typeof r.s !== 'number' || typeof r.e !== 'number' || !isFinite(r.s) || !isFinite(r.e)) continue;
    const s = Math.max(0, Math.min(len, Math.floor(r.s))), e = Math.max(0, Math.min(len, Math.floor(r.e)));
    if (e <= s) continue;
    const run: TextRun = { s, e };
    if (typeof r.color === 'string' && r.color.length <= 40) run.color = r.color;
    if (typeof r.scale === 'number' && isFinite(r.scale) && r.scale !== 1) run.scale = clampScale(r.scale);
    if (r.underline === true) run.underline = true;
    if (run.color === undefined && run.scale === undefined && run.underline === undefined) continue;
    clean.push(run);
  }
  return encode(charStyles(clean, len));
}

/** Apply `patch` to several ranges in one pass. */
export function restyle(runs: TextRun[], len: number, ranges: [number, number][], patch: RunPatch): TextRun[] {
  const cs = charStyles(runs, len);
  for (const [a, b] of ranges) {
    for (let i = Math.max(0, a); i < Math.min(len, b); i++) {
      const cur: RunStyle = { ...(cs[i] ?? {}) };
      if (patch.color === null) delete cur.color; else if (patch.color !== undefined) cur.color = patch.color;
      if (patch.scale === null || patch.scale === 1) delete cur.scale; else if (patch.scale !== undefined) cur.scale = clampScale(patch.scale);
      if (patch.underline === null || patch.underline === false) delete cur.underline; else if (patch.underline === true) cur.underline = true;
      cs[i] = Object.keys(cur).length ? cur : null;
    }
  }
  return encode(cs);
}
export const applyRunStyle = (runs: TextRun[], len: number, s: number, e: number, patch: RunPatch) => restyle(runs, len, [[s, e]], patch);
export const clearRunStyle = (runs: TextRun[], len: number, ranges: [number, number][]) => restyle(runs, len, ranges, { color: null, scale: null, underline: null });

/** Text cut into consecutive pieces that share one style (plain pieces have no style keys). Covers the whole text. */
export function runSegments(text: string, runs: TextRun[]): (RunStyle & { text: string })[] {
  const cs = charStyles(runs, text.length);
  const out: (RunStyle & { text: string })[] = [];
  let i = 0;
  while (i < text.length) {
    const st = cs[i];
    let j = i + 1;
    while (j < text.length && same(cs[j], st)) j++;
    out.push({ ...(st ?? {}), text: text.slice(i, j) });
    i = j;
  }
  return out;
}

/** Keep styles attached to the right letters while the user edits the text. Typing inside a styled stretch inherits its style. */
export function adjustRunsForEdit(runs: TextRun[], oldText: string, newText: string): TextRun[] {
  if (!runs.length || oldText === newText) return runs;
  const m = Math.min(oldText.length, newText.length);
  let p = 0; while (p < m && oldText[p] === newText[p]) p++;
  let q = 0; while (q < oldText.length - p && q < newText.length - p && oldText[oldText.length - 1 - q] === newText[newText.length - 1 - q]) q++;
  const oc = charStyles(runs, oldText.length);
  const out: CS[] = new Array(newText.length).fill(null);
  for (let i = 0; i < p; i++) out[i] = oc[i];
  for (let i = 0; i < q; i++) out[newText.length - 1 - i] = oc[oldText.length - 1 - i];
  const removed = oldText.length - p - q, added = newText.length - p - q;
  if (removed === 0 && added > 0 && p > 0 && oc[p - 1]) for (let i = p; i < p + added; i++) out[i] = oc[p - 1];
  return encode(out);
}

/** Word spans (runs of non-space characters) as [start, end). */
export function wordSpans(text: string): [number, number][] {
  const out: [number, number][] = []; const re = /\S+/g; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push([m.index, m.index + m[0].length]);
  return out;
}

/** Urdu/Arabic short vowels and marks (zer, zabar, pesh, shadd, jazm, tanween, khari zabar, Quranic marks). */
export const AERAB_RE = /[ً-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]/g;
export function aerabSpans(text: string): [number, number][] {
  const out: [number, number][] = []; const re = new RegExp(AERAB_RE.source, 'g'); let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push([m.index, m.index + 1]);
  return out;
}
