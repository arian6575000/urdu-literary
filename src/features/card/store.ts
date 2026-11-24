import { createStore, type StoreApi } from 'zustand/vanilla';
import { mix, readableOn, contrast } from '../../utils/color';
import { BASE_DESIGN, applyTemplate, newDesign } from './templates';
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
      resetDesign: () => { const d = get().design; commit(newDesign({ text: d.text, title: d.title, poet: d.poet })); },
      undo: () => { const s = get(); if (!s.past.length) return; set({ design: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.design, ...s.future], lastKey: null }); },
      redo: () => { const s = get(); if (!s.future.length) return; set({ design: s.future[0], past: [...s.past, s.design], future: s.future.slice(1), lastKey: null }); },
      markSaved: () => set({ savedJson: JSON.stringify(get().design) }),
    };
  });
}
export const isDirty = (s: CardState) => JSON.stringify(s.design) !== s.savedJson;
export { BASE_DESIGN };
