import { I18nManager, Platform } from 'react-native';

export const COLORS = {
  bg: '#F7F3EA',
  primary: '#174C3A',
  primarySoft: 'rgba(23,76,58,0.10)',
  secondary: '#C19A5B',
  secondarySoft: 'rgba(193,154,91,0.18)',
  text: '#292B29',
  muted: '#817D74',
  surface: '#FFFCF5',
  line: 'rgba(41,43,41,0.10)',
  danger: '#B3372F',
  success: '#2E7D5B',
  white: '#FFFFFF',
  ink: '#1B1C1B',
} as const;

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const RADII = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 } as const;

/** One font family (Alvi Nastaleeq, single weight). */
export const FONT = 'AlviNastaleeq';

/** Nastaleeq has very tall ascenders/descenders, so line-height must be generous or glyphs get clipped. */
export const lineHeightFor = (size: number, spacing = 1.9) => Math.round(size * spacing);

export const TYPE = {
  caption: 13,
  body: 16,
  bodyLg: 18,
  title: 22,
  headline: 28,
  display: 38,
} as const;

export const SIZES = { tabBar: 66, header: 64, button: 52, fab: 62, input: 52 } as const;

export const SHADOW = Platform.select({
  android: { shadowColor: '#3B2F12', elevation: 2 },
  default: { shadowColor: '#3B2F12', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
}) as { shadowColor: string; elevation?: number; shadowOpacity?: number; shadowRadius?: number; shadowOffset?: { width: number; height: number } };

/**
 * Layout direction helper. When the OS-level RTL flag is on (forceRTL took effect) a plain 'row'
 * already runs right-to-left; otherwise we reverse it ourselves so the UI is right-to-left either way.
 */
export const ROW = (I18nManager.isRTL ? 'row' : 'row-reverse') as 'row' | 'row-reverse';
export const BACK_ICON = 'chevron-forward' as const; // in RTL, "back" points right (icons are never mirrored)

export const BG_THEMES = [
  { id: 'ivory', name: 'عاجی', bg: '#F7F3EA', fg: '#292B29', accent: '#C19A5B' },
  { id: 'emerald', name: 'زمرد', bg: '#174C3A', fg: '#F7F3EA', accent: '#C19A5B' },
  { id: 'ink', name: 'سیاہی', bg: '#1B1C1B', fg: '#F2E6C9', accent: '#C19A5B' },
  { id: 'rose', name: 'گلاب', bg: '#F3E1DC', fg: '#4A2A2A', accent: '#9C4A4A' },
  { id: 'sky', name: 'آسمانی', bg: '#E4EEF2', fg: '#1F3A48', accent: '#3C7A96' },
] as const;
export type BgTheme = (typeof BG_THEMES)[number];
