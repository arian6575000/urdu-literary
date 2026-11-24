import { create } from 'zustand';
import { getAllSettings, setSetting } from '../database/repositories/settings';

export interface SettingsState {
  loaded: boolean;
  onboarded: boolean;
  engine: 'device' | 'cloud';
  speechLang: 'ur-PK' | 'ur-IN';
  proxyUrl: string;
  defaultAuthor: string;
  autoSave: boolean;
  screenSecurity: boolean;
  themeMode: 'light' | 'dark' | 'system';
  gridView: boolean;
  cardEasy: boolean;
  recentSearches: string[];
  editorSize: number; editorSpacing: number; readerSize: number; readerSpacing: number; readerAlign: 'center' | 'right';
  load(): Promise<void>;
  set<K extends keyof Omit<SettingsState, 'load' | 'set' | 'loaded'>>(key: K, value: SettingsState[K]): Promise<void>;
}

const DEFAULTS = { onboarded: false, engine: 'device' as const, speechLang: 'ur-PK' as const, proxyUrl: '', defaultAuthor: '', autoSave: true, screenSecurity: false, themeMode: 'system' as 'light' | 'dark' | 'system', gridView: false, cardEasy: true, recentSearches: [] as string[], editorSize: 24, editorSpacing: 2.0, readerSize: 26, readerSpacing: 2.1, readerAlign: 'right' as const };

export const useSettings = create<SettingsState>((setState, get) => ({
  loaded: false, ...DEFAULTS,
  async load() {
    const raw = await getAllSettings();
    const next: any = { loaded: true };
    for (const k of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) {
      if (raw[k] !== undefined) { try { next[k] = JSON.parse(raw[k]); } catch { /* keep default */ } }
    }
    setState(next);
  },
  async set(key, value) {
    setState({ [key]: value } as any);
    await setSetting(key as string, JSON.stringify(value));
  },
}));
// `get` kept for future selectors
void ((): void => undefined);

/** A writing's author, falling back to the default author set once in Settings, so the name is filled in everywhere automatically. */
export const authorOf = (w: { author?: string | null }): string => (w.author ?? '').trim() || (useSettings.getState().defaultAuthor ?? '').trim();
