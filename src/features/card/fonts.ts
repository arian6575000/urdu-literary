import type { FontId } from './types';

export interface CardFont { id: FontId; name: string; family: string; sample: string }
export const CARD_FONTS: CardFont[] = [
  { id: 'alvi', name: 'الوی نستعلیق', family: 'AlviNastaleeq', sample: 'دل' },
  { id: 'nastaliq', name: 'نوٹو نستعلیق', family: 'NotoNastaliqUrdu_400Regular', sample: 'دل' },
  { id: 'naskh', name: 'نسخ', family: 'NotoNaskhArabic_400Regular', sample: 'دل' },
  { id: 'amiri', name: 'امیری', family: 'Amiri_400Regular', sample: 'دل' },
];
export const fontFamily = (id: FontId) => (CARD_FONTS.find((f) => f.id === id) ?? CARD_FONTS[0]).family;

/** Line-box multiplier floor per font: Nastaleeq needs far more vertical room than Naskh or glyph dots get clipped. */
export const MIN_LINE: Record<FontId, number> = { alvi: 1.6, nastaliq: 2.0, naskh: 1.3, amiri: 1.3 };
