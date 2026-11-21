import { create } from 'zustand';

/** Bumped after any data change so list screens re-query. */
interface UiState {
  dataVersion: number; bump(): void;
  toast: { id: number; text: string; kind: 'info' | 'error' | 'ok' } | null; showToast(text: string, kind?: 'info' | 'error' | 'ok'): void;
  dialog: null | { id: number; message: string; okLabel: string; cancelLabel: string | null; danger: boolean; resolve: (v: boolean) => void };
}
let n = 0;
export const useUi = create<UiState>((set) => ({
  dataVersion: 0, bump: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  toast: null, showToast: (text, kind = 'info') => { const id = ++n; set({ toast: { id, text, kind } }); setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 2600); },
  dialog: null,
}));

export const toast = (t: string, k: 'info' | 'error' | 'ok' = 'info') => useUi.getState().showToast(t, k);
export function confirmDialog(message: string, o: { okLabel?: string; cancelLabel?: string | null; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    useUi.setState({ dialog: { id: ++n, message, okLabel: o.okLabel ?? 'ٹھیک ہے', cancelLabel: o.cancelLabel === undefined ? 'منسوخ' : o.cancelLabel, danger: !!o.danger, resolve: (v) => { useUi.setState({ dialog: null }); resolve(v); } } });
  });
}
