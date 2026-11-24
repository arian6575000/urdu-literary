import React, { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { CardState, CardStore } from './store';

const Ctx = createContext<CardStore | null>(null);
export const CardProvider = ({ store, children }: { store: CardStore; children: React.ReactNode }) => <Ctx.Provider value={store}>{children}</Ctx.Provider>;
/** Subscribe to a slice of the editor state: only the parts that use it re-render. */
export function useCard<T>(sel: (s: CardState) => T): T { const st = useContext(Ctx); if (!st) throw new Error('CardProvider missing'); return useStore(st, sel); }
export const useCardApi = (): CardState => { const st = useContext(Ctx); if (!st) throw new Error('CardProvider missing'); return st.getState(); };
