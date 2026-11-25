import assert from 'node:assert/strict';
import { addEl, centerH, centerV, duplicateEl, groupEls, makeLine, makeShape, makeSvg, makeText, moveEl, removeEl, renderable, reorderEl, sanitizeElement, sanitizeElements, starPoints, ungroupEls, updateEl, withGroup, MAX_ELEMENTS, type DesignElement } from '../src/features/card/elements';
import { createCardStore } from '../src/features/card/store';
import { BASE_DESIGN, applyTemplate, newDesign, sanitizeDesign } from '../src/features/card/templates';

const sample = { text: 'دلِ ناداں تجھے ہوا کیا ہے', title: 'غزل', poet: 'غالب' };

// ---- migration: a v1 save (no elements) loads as v2 with its look untouched
const v1 = { ...BASE_DESIGN, v: 1, text: sample.text, fontSize: 31, templateId: 'royal' } as any; delete v1.elements;
const m = sanitizeDesign(JSON.parse(JSON.stringify(v1)))!;
assert.equal(m.v, 2); assert.deepEqual(m.elements, []); assert.equal(m.fontSize, 31); assert.equal(m.templateId, 'royal'); assert.equal(m.text, sample.text);
assert.equal(sanitizeDesign('junk'), null); assert.equal(sanitizeDesign(null), null);
assert.deepEqual(sanitizeDesign({ ...v1, elements: 'oops' })!.elements, []);

// ---- round trip keeps every element kind
const all: DesignElement[] = [
  makeText({ text: 'سلام Hello', x: 10, y: 20, rotation: 12, name: 'سرخی' }), makeShape({ shape: 'star' }), makeLine({ arrow: true, dashed: true }),
  makeSvg({ paths: ['M0 0 L10 10'], viewBox: [10, 10] }),
];
const rt = sanitizeDesign(JSON.parse(JSON.stringify({ ...newDesign(sample), elements: all })))!;
assert.deepEqual(JSON.parse(JSON.stringify(rt.elements)), JSON.parse(JSON.stringify(all))); // identical after save + load
assert.equal(rt.elements.length, 4);

// ---- no silent loss: unknown kinds survive a save/load/save cycle; garbage is dropped
const future = { id: 'f1', kind: 'hologram', x: 1, y: 2, payload: { a: 1 } };
const list = sanitizeElements([future, 5, null, { nokind: true }, makeShape()]);
assert.equal(list.length, 2); assert.equal(list[0].kind, 'unknown'); assert.deepEqual((list[0] as any).raw, future);
assert.equal(renderable(list).length, 1, 'unknown elements are kept but never drawn');
assert.deepEqual(JSON.parse(JSON.stringify(sanitizeElements(list)))[0].raw, future);

// ---- validation clamps + unique ids
const bad = sanitizeElement({ kind: 'text', id: 'a', x: 1e9, w: -5, fontSize: 9999, opacity: 7, rotation: 900, align: 'weird', font: 'comic', color: 42 })! as any;
assert.equal(bad.x, 4000); assert.equal(bad.w, 1); assert.equal(bad.fontSize, 400); assert.equal(bad.opacity, 1); assert.equal(bad.rotation, 360); assert.equal(bad.align, 'center'); assert.equal(bad.font, 'alvi'); assert.equal(bad.color, '#3B2A1A');
const dup = sanitizeElements([{ kind: 'shape', id: 'x' }, { kind: 'shape', id: 'x' }]); assert.notEqual(dup[0].id, dup[1].id);
assert.equal(sanitizeElements(Array.from({ length: 500 }, () => ({ kind: 'shape' }))).length, MAX_ELEMENTS);

// ---- operations: z-order == array order
const a = makeShape({ name: 'A' }), b = makeShape({ name: 'B' }), c = makeShape({ name: 'C' });
let l: DesignElement[] = [a, b, c];
const names = (x: DesignElement[]) => x.map((e) => e.name).join('');
assert.equal(names(reorderEl(l, a.id, 'forward')), 'BAC'); assert.equal(names(reorderEl(l, a.id, 'front')), 'BCA');
assert.equal(names(reorderEl(l, c.id, 'back')), 'CAB'); assert.equal(names(reorderEl(l, c.id, 'backward')), 'ACB');
assert.equal(reorderEl(l, c.id, 'front'), l, 'already on top = same array'); assert.equal(reorderEl(l, 'nope', 'front'), l);
assert.equal(names(moveEl(l, a.id, 2)), 'BCA'); assert.equal(names(moveEl(l, c.id, -9)), 'CAB');
const d = duplicateEl(l, b.id); assert.equal(d.list.length, 4); assert.equal(d.list[2].id, d.id); assert.notEqual(d.id, b.id); assert.equal(d.list[2].x, b.x + 12); assert.equal(d.list[2].name, 'B +');
assert.equal(names(removeEl(l, b.id)), 'AC');
assert.equal(addEl(Array.from({ length: MAX_ELEMENTS }, () => makeShape()), makeShape()).length, MAX_ELEMENTS);

// ---- locking: a locked element refuses edits except unlock / hide / rename
l = updateEl(l, a.id, { x: 99 }); assert.equal(l[0].x, 99);
l = updateEl(l, a.id, { locked: true }); l = updateEl(l, a.id, { x: 5, w: 1 }); assert.equal(l[0].x, 99, 'locked: not moved');
l = updateEl(l, a.id, { visible: false, name: 'Z' }); assert.equal(l[0].visible, false); assert.equal(l[0].name, 'Z');
assert.equal(updateEl(l, a.id, { id: 'hack', kind: 'text' } as any)[0].id, a.id, 'id/kind are immutable');
l = updateEl(l, a.id, { locked: false }); assert.equal(l[0].locked, false);
assert.equal(duplicateEl(updateEl([a], a.id, { locked: true }), a.id).list[1].locked, false, 'a copy is never locked');

// ---- grouping
const g = groupEls([a, b, c], [a.id, c.id]); assert.ok(g.groupId); assert.deepEqual(withGroup(g.list, a.id).sort(), [a.id, c.id].sort());
assert.equal(groupEls([a, b], [a.id]).groupId, null, 'a group needs 2+ members');
assert.ok(ungroupEls(g.list, g.groupId!).every((e) => !e.groupId));

// ---- geometry
assert.equal(centerH(makeShape({ w: 100 }), 360), 130); assert.equal(centerV(makeShape({ h: 100 }), 450), 175);
assert.equal(starPoints(100, 100).split(' ').length, 10);

// ---- store: every element edit is undoable, content never lost
let clock = 0; const st = createCardStore(newDesign(sample), () => clock);
const t = makeText({ text: 'نیا متن' }); st.getState().addElement(t); assert.equal(st.getState().design.elements.length, 1);
clock += 5000; st.getState().patchElement(t.id, { x: 20 }, 'drag'); clock += 100; st.getState().patchElement(t.id, { x: 40 }, 'drag'); clock += 100; st.getState().patchElement(t.id, { x: 60 }, 'drag');
assert.equal(st.getState().past.length, 2, 'a drag is one undo step'); assert.equal(st.getState().design.elements[0].x, 60);
st.getState().undo(); assert.equal(st.getState().design.elements[0].x, 0); st.getState().redo(); assert.equal(st.getState().design.elements[0].x, 60);
const id2 = st.getState().duplicateElement(t.id)!; assert.equal(st.getState().design.elements.length, 2);
st.getState().reorderElement(t.id, 'front'); assert.equal(st.getState().design.elements[1].id, t.id);
const gid = st.getState().groupElements([t.id, id2]); assert.ok(gid); st.getState().ungroupElements(gid!);
st.getState().patchElement(t.id, { locked: true }); const before = st.getState().past.length; st.getState().patchElement(t.id, { x: 1 }); assert.equal(st.getState().past.length, before, 'refused edit adds no history');
st.getState().removeElement(t.id); assert.equal(st.getState().design.elements.length, 2, 'locked element cannot be deleted');
st.getState().patchElement(t.id, { locked: false }); st.getState().removeElement(t.id); assert.equal(st.getState().design.elements.length, 1);
st.getState().undo(); assert.equal(st.getState().design.elements.length, 2);

// ---- Easy Mode operations never drop elements
const withEls = { ...newDesign(sample), elements: [makeText({ text: 'keep me' })] };
assert.equal(applyTemplate(withEls, 'royal').elements.length, 1, 'switching template keeps elements');
const st2 = createCardStore(withEls); st2.getState().update({ fontSize: 30 }); st2.getState().setTemplate('minimal'); st2.getState().resetDesign();
assert.equal(st2.getState().design.elements.length, 1, 'template / reset keep elements');
assert.equal(st2.getState().design.v, 2);

console.log('elements ✓');
