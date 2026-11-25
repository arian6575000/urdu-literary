import { createStore, type StoreApi } from 'zustand/vanilla';
import { mix, readableOn, contrast } from '../../utils/color';
import { BASE_DESIGN, applyTemplate, newDesign } from './templates';
import { addEl, duplicateEl, groupEls, moveEl, removeEl, reorderEl, ungroupEls, updateEl, type DesignElement, type Reorder } from './elements';
import type { BgSpec, CardDesign } from './types';

/**
 * The editor's single source of truth. Every tool writes here, the preview/thumbnails/export read from here.
 * History: updates sharing a `key` within 1.5 s collapse into ONE undo step, so dragging a slider is one step, not fifty.
 */
export interface CardState {
  design: CardDesign; past: CardDesign[]; future: CardDesign[]; savedJson: string; lastKey: string | null; lastAt: number;
  update(patch: Partial<CardDesign>, key?: string): void;
  setBg(bg: BgSpec, key?: string): void;
  setTemplate(id: string): void;
  resetDesign(): void;
  /** Scene-graph edits (all undoable; edits sharing a `key` coalesce like sliders). Locked elements ignore everything except lock/visible/name. */
  addElement(el: DesignElement): void;
  patchElement(id: string, patch: Partial<DesignElement>, key?: string): void;
  removeElement(id: string): void;
  duplicateElement(id: string): string | null;
  reorderElement(id: string, op: Reorder): void;
  moveElement(id: string, index: number): void;
  groupElements(ids: string[]): string | null;
  ungroupElements(groupId: string): void;
  undo(): void; redo(): void; markSaved(): void;
}
export type CardStore = StoreApi<CardState>;
const HISTORY = 80, WINDOW = 1500;

/** Mid colour of a background (used to keep text readable). */
export const bgMid = (bg: BgSpec) => (bg.kind === 'solid' ? bg.color : mix(bg.from, bg.to, 0.5));

export function createCardStore(initial: CardDesign, now: () => number = Date.now): CardStore {
  return createStore<CardState>((set, get) => {
    const commit = (next: CardDesign, key?: string) => {
      const s = get(); const t = now();
      const merge = !!key && key === s.lastKey && t - s.lastAt < WINDOW;
      set({ design: next, past: merge ? s.past : [...s.past, s.design].slice(-HISTORY), future: [], lastKey: key ?? null, lastAt: t });
    };
    return {
      design: initial, past: [], future: [], savedJson: JSON.stringify(initial), lastKey: null, lastAt: 0,
      update: (patch, key) => commit({ ...get().design, ...patch }, key),
      setBg: (bg, key) => {
        const d = get().design;
        // keep text readable: only when the new background makes it hard to read (WCAG large-text 3:1)
        const textColor = contrast(bgMid(bg), d.textColor) < 3 ? readableOn(bgMid(bg)) : d.textColor;
        commit({ ...d, bg, textColor }, key);
      },
      setTemplate: (id) => commit(applyTemplate(get().design, id)),
      resetDesign: () => { const d = get().design; commit({ ...newDesign({ text: d.text, title: d.title, poet: d.poet }), elements: d.elements }); }, // the look resets, the user's own elements stay
      addElement: (el) => { const d = get().design; const els = addEl(d.elements, el); if (els !== d.elements) commit({ ...d, elements: els }); },
      patchElement: (id, patch, key) => { const d = get().design; const els = updateEl(d.elements, id, patch); if (els.some((e, i) => e !== d.elements[i])) commit({ ...d, elements: els }, key); },
      removeElement: (id) => { const d = get().design; const e = d.elements.find((x) => x.id === id); if (e && !e.locked) commit({ ...d, elements: removeEl(d.elements, id) }); },
      duplicateElement: (id) => { const d = get().design; const r = duplicateEl(d.elements, id); if (r.id) commit({ ...d, elements: r.list }); return r.id; },
      reorderElement: (id, op) => { const d = get().design; const els = reorderEl(d.elements, id, op); if (els !== d.elements) commit({ ...d, elements: els }); },
      moveElement: (id, index) => { const d = get().design; const els = moveEl(d.elements, id, index); if (els !== d.elements) commit({ ...d, elements: els }); },
      groupElements: (ids) => { const d = get().design; const r = groupEls(d.elements, ids); if (r.groupId) commit({ ...d, elements: r.list }); return r.groupId; },
      ungroupElements: (gid) => { const d = get().design; commit({ ...d, elements: ungroupEls(d.elements, gid) }); },
      undo: () => { const s = get(); if (!s.past.length) return; set({ design: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.design, ...s.future], lastKey: null }); },
      redo: () => { const s = get(); if (!s.future.length) return; set({ design: s.future[0], past: [...s.past, s.design], future: s.future.slice(1), lastKey: null }); },
      markSaved: () => set({ savedJson: JSON.stringify(get().design) }),
    };
  });
}
export const isDirty = (s: CardState) => JSON.stringify(s.design) !== s.savedJson;
export { BASE_DESIGN };
