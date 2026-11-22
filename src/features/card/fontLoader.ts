import * as Font from 'expo-font';
import { CARD_FONTS } from './fonts';
import type { FontId } from './types';

// The extra fonts are only loaded when the card editor is opened (keeps app start fast and memory low).
const SOURCES: Record<string, () => number> = {
  NotoNastaliqUrdu_400Regular: () => require('@expo-google-fonts/noto-nastaliq-urdu/400Regular/NotoNastaliqUrdu_400Regular.ttf'),
  NotoNaskhArabic_400Regular: () => require('@expo-google-fonts/noto-naskh-arabic/400Regular/NotoNaskhArabic_400Regular.ttf'),
  Amiri_400Regular: () => require('@expo-google-fonts/amiri/400Regular/Amiri_400Regular.ttf'),
};
const pending = new Map<string, Promise<void>>();

export function ensureCardFont(id: FontId): Promise<void> {
  const f = CARD_FONTS.find((x) => x.id === id);
  if (!f || !SOURCES[f.family]) return Promise.resolve();
  if (Font.isLoaded(f.family)) return Promise.resolve();
  let p = pending.get(f.family);
  if (!p) { p = Font.loadAsync({ [f.family]: SOURCES[f.family]() }).catch(() => { pending.delete(f.family); }); pending.set(f.family, p); }
  return p;
}
export const ensureAllCardFonts = () => Promise.all(CARD_FONTS.map((f) => ensureCardFont(f.id)));
