import assert from 'node:assert/strict';
import { adjustRunsForEdit, aerabSpans, applyRunStyle, clearRunStyle, restyle, runSegments, sanitizeRuns, wordSpans, MAX_RUNS } from '../src/features/card/runs';
import { SHADOW_PRESETS, makeSherElements, resolveShadow, splitCouplets } from '../src/features/card/textStudio';
import { makeText, sanitizeElement, type TextElement } from '../src/features/card/elements';

const text = 'دل ناداں تجھے ہوا کیا ہے';
const L = text.length;

// ---- words
const words = wordSpans(text);
assert.equal(words.length, 6);
assert.equal(text.slice(...words[0]), 'دل'); assert.equal(text.slice(...words[5]), 'ہے');

// ---- applying styles: colour one word, then size another, underline overlapping both
let runs = applyRunStyle([], L, words[1][0], words[1][1], { color: '#C2255C' });
assert.deepEqual(runs, [{ s: words[1][0], e: words[1][1], color: '#C2255C' }]);
runs = applyRunStyle(runs, L, words[1][0], words[2][1], { underline: true });
// the colour survives, underline is merged on top across two words
const segs = runSegments(text, runs);
assert.equal(segs.map((s) => s.text).join(''), text, 'segments cover the whole text exactly');
assert.equal(segs.find((s) => s.text === 'ناداں')!.color, '#C2255C');
assert.equal(segs.find((s) => s.text === 'ناداں')!.underline, true);
assert.equal(segs.find((s) => s.text.trim() === 'تجھے')!.color, undefined);
assert.equal(segs.find((s) => s.text.trim() === 'تجھے')!.underline, true);
assert.equal(segs[0].color, undefined); assert.equal(segs[0].underline, undefined); // untouched start stays plain
// runs are canonical: sorted, non-overlapping
for (let i = 1; i < runs.length; i++) assert.ok(runs[i].s >= runs[i - 1].e);

// ---- scale clamps, scale 1 / null removes
runs = applyRunStyle([], L, 0, 2, { scale: 9 }); assert.equal(runs[0].scale, 3);
runs = applyRunStyle(runs, L, 0, 2, { scale: 1 }); assert.deepEqual(runs, []);
runs = applyRunStyle([], L, 0, 2, { color: '#fff', underline: true });
runs = applyRunStyle(runs, L, 0, 2, { color: null }); assert.deepEqual(runs, [{ s: 0, e: 2, underline: true }]);
assert.deepEqual(clearRunStyle(runs, L, [[0, L]]), []);

// ---- sanitize: junk, out-of-range, overlap, empty styles
const dirty = sanitizeRuns([{ s: -5, e: 3, color: '#111' }, { s: 2, e: 6, color: '#222' }, { s: 50, e: 40 }, { s: 1, e: 2 }, 'x', null, { s: 0, e: 1e9, scale: 1 }, { s: NaN, e: 3, color: 'red' }], L);
assert.deepEqual(dirty, [{ s: 0, e: 2, color: '#111' }, { s: 2, e: 6, color: '#222' }]);
assert.deepEqual(sanitizeRuns('oops', L), []); assert.deepEqual(sanitizeRuns([{ s: 0, e: 3, color: '#111' }], 0), []);
const many = Array.from({ length: 2000 }, (_, i) => ({ s: i * 2, e: i * 2 + 1, color: i % 2 ? '#111' : '#222' }));
assert.ok(sanitizeRuns(many, 5000).length <= MAX_RUNS);

// ---- editing text keeps styles on the right letters
const base = applyRunStyle([], L, words[1][0], words[1][1], { color: '#C2255C' }); // 'ناداں'
const typedBefore = 'آہ ' + text; // 3 chars typed at the very start: the run shifts by 3
const shifted = adjustRunsForEdit(base, text, typedBefore);
assert.equal(typedBefore.slice(shifted[0].s, shifted[0].e), 'ناداں');
const typedAfter = text + ' !'; assert.deepEqual(adjustRunsForEdit(base, text, typedAfter), base, 'edit after the run leaves it alone');
const typedInside = text.slice(0, words[1][1]) + 'ں' + text.slice(words[1][1]); // typing at the end of a styled word inherits its style
const inherited = adjustRunsForEdit(base, text, typedInside);
assert.equal(typedInside.slice(inherited[0].s, inherited[0].e), 'ناداںں');
const deleted = text.slice(0, words[1][0]) + text.slice(words[1][1]); // whole styled word removed -> run gone
assert.deepEqual(adjustRunsForEdit(base, text, deleted), []);
assert.equal(adjustRunsForEdit(base, text, text), base);
assert.deepEqual(adjustRunsForEdit([], text, 'abc'), []);

// ---- aerab: finds only the marks, and restyle paints them in one pass
const marked = 'دِلِ نَاداں'; const ae = aerabSpans(marked);
assert.equal(ae.length, 3); for (const [a, b] of ae) assert.ok(/[ً-ْ]/.test(marked.slice(a, b)));
const dim = restyle([], marked.length, ae, { color: 'rgba(0,0,0,0.4)' });
assert.equal(runSegments(marked, dim).filter((s) => s.color).map((s) => s.text).join(''), marked.replace(/[^ً-ْ]/g, ''));
assert.equal(aerabSpans('سادہ متن').length, 0);

// ---- couplets
assert.deepEqual(splitCouplets('الف ب\nج د\n\nه و\nز ح\nط'), [['الف ب', 'ج د'], ['ه و', 'ز ح'], ['ط', '']]);
assert.deepEqual(splitCouplets('اول دوم سوم چہارم'), [['اول دوم', 'سوم چہارم']]);
assert.deepEqual(splitCouplets('تنہا'), [['تنہا', '']]); assert.deepEqual(splitCouplets('  \n '), []);

// ---- sher layout: grouped, first misra upper-right, second lower-left, both inside the canvas
const [m1, m2] = makeSherElements(['دلِ ناداں تجھے ہوا کیا ہے', 'آخر اس درد کی دوا کیا ہے'], { cw: 360, ch: 450, font: 'alvi', color: '#1B1730' });
assert.ok(m1.groupId && m1.groupId === m2.groupId);
assert.ok(m1.x > m2.x && m1.y < m2.y, 'ula is right and above sani');
assert.equal(m1.align, 'right'); assert.equal(m2.align, 'left');
for (const m of [m1, m2]) { assert.ok(m.x >= 0 && m.x + m.w <= 360); assert.ok(m.y >= 0 && m.y + m.h <= 450); }
assert.equal(makeSherElements(['تنہا', ''], { cw: 360, ch: 450, font: 'naskh', color: '#000' }).length, 1);
const wide = makeSherElements(['دلِ ناداں تجھے ہوا کیا ہے', 'آخر اس درد کی دوا کیا ہے'], { cw: 360, ch: 202, font: 'nastaliq', color: '#000' }); // 16:9 canvas
assert.ok(wide[1].y + wide[1].h <= 202 && wide[0].y >= 0, 'both misras fit a short canvas'); assert.ok(wide[0].fontSize < 26, 'font shrinks to fit');

// ---- element model: new fields round-trip, old text elements load with defaults, runs clamp to the text
const el = makeText({ text, runs: base, vAlign: 'bottom', shadow: true, shadowBlur: 12, shadowColor: '#D4AF37' });
const rt = sanitizeElement(JSON.parse(JSON.stringify(el))) as TextElement;
assert.deepEqual(JSON.parse(JSON.stringify(rt)), JSON.parse(JSON.stringify(el)));
const old = sanitizeElement({ kind: 'text', id: 'o', text: 'abc', color: '#111' }) as TextElement;
assert.deepEqual(old.runs, []); assert.equal(old.vAlign, 'middle'); assert.equal(old.shadowBlur, 4);
const clipped = sanitizeElement({ kind: 'text', id: 'c', text: 'abcd', runs: [{ s: 2, e: 99, color: '#111' }], vAlign: 'weird', shadowBlur: 999 }) as TextElement;
assert.deepEqual(clipped.runs, [{ s: 2, e: 4, color: '#111' }]); assert.equal(clipped.vAlign, 'middle'); assert.equal(clipped.shadowBlur, 60);

// ---- shadow resolve
assert.equal(resolveShadow(makeText()), null);
assert.deepEqual(resolveShadow(makeText({ shadow: true, ...{ shadowColor: '#fff', shadowBlur: 9, shadowX: 1, shadowY: 2 } })), { color: '#fff', blur: 9, x: 1, y: 2 });
assert.deepEqual(SHADOW_PRESETS.glow('#D4AF37'), { color: '#D4AF37', blur: 14, x: 0, y: 0 });

console.log('textstudio ✓');
