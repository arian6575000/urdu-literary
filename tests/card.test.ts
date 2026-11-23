import assert from 'node:assert/strict';
import { createCardStore, bgMid } from '../src/features/card/store';
import { BASE_DESIGN, TEMPLATES, applyTemplate, newDesign, sanitizeDesign } from '../src/features/card/templates';
import { baseBg, buildLayers, decorPrims, dividerPrims, framePrims, motifPrims, motifReserve, motifSpots, patternPrims, primsToSvg, texturePrims, type Prim } from '../src/features/card/art';
import { RATIOS, canvasSize, exportPixels } from '../src/features/card/types';
import { contrast } from '../src/utils/color';

const sample = { text: 'دلِ ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے', title: 'غزل', poet: 'غالب' };

// ---- templates: 8 real, distinct looks
assert.equal(TEMPLATES.length, 8);
assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, 8);
const looks = new Set<string>();
for (const t of TEMPLATES) {
  const d = applyTemplate(newDesign(sample), t.id);
  assert.equal(d.templateId, t.id); assert.equal(d.text, sample.text); assert.equal(d.poet, 'غالب'); // content survives a template switch
  assert.ok(contrast(bgMid(d.bg), d.textColor) >= 4.5, `${t.id} text contrast ${contrast(bgMid(d.bg), d.textColor).toFixed(2)}`);
  looks.add(JSON.stringify([d.bg, d.textColor, d.frame, d.decor, d.pattern]));
}
assert.equal(looks.size, 8);

// ---- dimensions
assert.deepEqual(canvasSize('1:1'), { w: 360, h: 360 }); assert.deepEqual(canvasSize('4:5'), { w: 360, h: 450 }); assert.deepEqual(canvasSize('9:16'), { w: 360, h: 640 });
assert.deepEqual(exportPixels('1:1'), { w: 1080, h: 1080 }); assert.deepEqual(exportPixels('4:5'), { w: 1080, h: 1350 }); assert.deepEqual(exportPixels('9:16'), { w: 1080, h: 1920 });
assert.equal(RATIOS.length, 4);

// ---- store: single source of truth, undo / redo, coalescing
let clock = 1000;
const st = createCardStore(newDesign(sample), () => clock);
const s0 = st.getState().design;
st.getState().update({ fontSize: 30 }, 'size'); clock += 100; st.getState().update({ fontSize: 31 }, 'size'); clock += 100; st.getState().update({ fontSize: 32 }, 'size');
assert.equal(st.getState().past.length, 1, 'slider drag = one undo step');
assert.equal(st.getState().design.fontSize, 32);
st.getState().undo(); assert.equal(st.getState().design.fontSize, s0.fontSize);
st.getState().redo(); assert.equal(st.getState().design.fontSize, 32);
clock += 5000; st.getState().update({ fontSize: 40 }, 'size'); assert.equal(st.getState().past.length, 2, 'a pause starts a new step');
st.getState().update({ align: 'right' }); st.getState().update({ align: 'left' }); assert.equal(st.getState().past.length, 4, 'un-keyed edits are separate steps');
st.getState().undo(); st.getState().update({ padding: 50 }); assert.equal(st.getState().future.length, 0, 'new edit clears redo');
// dirty tracking + save
assert.notEqual(JSON.stringify(st.getState().design), st.getState().savedJson); st.getState().markSaved(); assert.equal(JSON.stringify(st.getState().design), st.getState().savedJson);
// template + reset keep text
st.getState().setTemplate('royal'); assert.equal(st.getState().design.templateId, 'royal'); assert.equal(st.getState().design.text, sample.text);
st.getState().update({ text: 'نیا متن' }); st.getState().resetDesign(); assert.equal(st.getState().design.templateId, 'classic'); assert.equal(st.getState().design.text, 'نیا متن');
st.getState().undo(); assert.equal(st.getState().design.templateId, 'royal', 'reset is undoable');
// undo on empty history is a no-op
const fresh = createCardStore(newDesign(sample)); fresh.getState().undo(); fresh.getState().redo(); assert.equal(fresh.getState().design.templateId, 'classic');
// background change keeps text readable
const rd = createCardStore(applyTemplate(newDesign(sample), 'minimal')); // dark text on white
rd.getState().setBg({ kind: 'solid', color: '#14111F' }); assert.ok(contrast('#14111F', rd.getState().design.textColor) >= 3, 'text flips to a light colour on a dark background');
rd.getState().setBg({ kind: 'solid', color: '#FFFFFF' }); assert.ok(contrast('#FFFFFF', rd.getState().design.textColor) >= 3);

// ---- saved designs load defensively
assert.equal(sanitizeDesign(null), null); assert.equal(sanitizeDesign('x'), null);
const old = sanitizeDesign({ text: 'abc', fontSize: 9999, lineHeight: NaN, bg: { kind: 'bogus' }, image: { uri: 'file:///a.jpg' }, unknownFutureField: 1 })!;
assert.equal(old.text, 'abc'); assert.equal(old.fontSize, 80); assert.equal(old.lineHeight, BASE_DESIGN.lineHeight); assert.equal(old.bg.kind, 'solid'); assert.equal(old.image.uri, 'file:///a.jpg'); assert.equal(old.image.opacity, 1);
const round = sanitizeDesign(JSON.parse(JSON.stringify(applyTemplate(newDesign(sample), 'geometric'))))!;
assert.deepEqual(round, applyTemplate(newDesign(sample), 'geometric'));

// ---- art: every option really draws something, with valid numbers
const finite = (ps: Prim[]) => !/NaN|Infinity|undefined/.test(primsToSvg(ps));
const W = 360, H = 450;
for (const p of ['dots', 'lines', 'grid', 'diamonds', 'khatam', 'waves'] as const) { const a = patternPrims(p, W, H, '#fff', 0.2); assert.ok(a.length > 10 && finite(a), p); }
for (const t of ['paper', 'linen', 'grain'] as const) { const a = texturePrims(t, W, H, '#000'); assert.ok(a.length > 50 && finite(a), t); }
assert.deepEqual(texturePrims('paper', W, H, '#000'), texturePrims('paper', W, H, '#000'), 'textures are deterministic');
for (const d of ['night', 'dunes', 'arches', 'petals', 'rays'] as const) { const a = decorPrims(d, W, H, '#c00'); assert.ok(a.length > 1 && finite(a), d); }
for (const f of ['single', 'double', 'corners', 'ornate', 'arch'] as const) { const a = framePrims(f, W, H, '#c00'); assert.ok(a.length >= 1 && finite(a), f); }
for (const v of ['line', 'dots', 'diamond', 'flourish'] as const) { const a = dividerPrims(v, 160, '#c00'); assert.ok(a.length >= 1 && finite(a), v); }
for (const m of ['crescent', 'khatam', 'flower', 'leaf', 'moonstars', 'pen'] as const) { const a = motifPrims(m, 52, '#c00'); assert.ok(a.length >= 2 && finite(a), m); }
for (const n of ['none'] as const) { assert.equal(framePrims(n, W, H, '#c00').length, 0); assert.equal(dividerPrims(n, 160, '#c00').length, 0); assert.equal(motifPrims(n, 52, '#c00').length, 0); assert.equal(patternPrims(n, W, H, '#c00', 1).length, 0); }
assert.ok(baseBg({ kind: 'gradient', from: '#111111', to: '#eeeeee', dir: 'd' }, W, H).some((p) => p.t === 'grad'));
// two different gradients never share a definition id
const ids = new Set(TEMPLATES.map((t) => applyTemplate(newDesign(sample), t.id)).filter((d) => d.bg.kind === 'gradient').map((d) => (baseBg(d.bg, W, H)[0] as any).id)); assert.ok(ids.size >= 4);
// motif spots + reserved space
assert.equal(motifSpots({ motif: 'none', motifPos: 'top' }, W, H).length, 0); assert.equal(motifSpots({ motif: 'flower', motifPos: 'corners' }, W, H).length, 4); assert.equal(motifSpots({ motif: 'flower', motifPos: 'top' }, W, H).length, 1);
assert.ok(motifReserve({ motif: 'flower', motifPos: 'top' }) > 0); assert.equal(motifReserve({ motif: 'flower', motifPos: 'corners' }), 0); assert.equal(motifReserve({ motif: 'none', motifPos: 'top' }), 0);
// full composition for every template and every ratio
for (const t of TEMPLATES) for (const r of RATIOS) { const d = { ...applyTemplate(newDesign(sample), t.id), ratio: r.id }; const { w, h } = canvasSize(r.id); const l = buildLayers(d, w, h); assert.ok(l.back.length > 0 && finite(l.back) && finite(l.front), `${t.id}/${r.id}`); }
console.log('card ✓');
