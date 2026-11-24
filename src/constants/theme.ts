import { I18nManager, Platform } from 'react-native';

export { LIGHT, DARK, gradients, type Palette } from './palette';

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const RADII = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 } as const;

/** Default UI font (Alvi Nastaleeq, single weight). */
export const FONT = 'AlviNastaleeq';

/** Nastaleeq has very tall ascenders/descenders, so line-height must be generous or glyphs get clipped. */
export const lineHeightFor = (size: number, spacing = 1.9) => Math.round(size * spacing);

export const TYPE = { caption: 13, body: 16, bodyLg: 18, title: 22, headline: 28, display: 38 } as const;
export const SIZES = { tabBar: 68, header: 64, button: 52, input: 52, touch: 48 } as const;

export const SHADOW = Platform.select({
  android: { shadowColor: '#2B1B5A', elevation: 3 },
  default: { shadowColor: '#2B1B5A', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
}) as { shadowColor: string; elevation?: number; shadowOpacity?: number; shadowRadius?: number; shadowOffset?: { width: number; height: number } };

/**
 * Layout direction helper. When the OS-level RTL flag is on (forceRTL took effect) a plain 'row'
 * already runs right-to-left; otherwise we reverse it ourselves so the UI is right-to-left either way.
 */
export const ROW = (I18nManager.isRTL ? 'row' : 'row-reverse') as 'row' | 'row-reverse';
export const BACK_ICON = 'chevron-forward' as const; // in RTL, "back" points right (icons are never mirrored)

/** Collection cover colours: [from, to] gradient pairs. */
export const COVER_COLORS: [string, string][] = [
  ['#6A3DD1', '#9B5DE5'], ['#077A7B', '#35C28F'], ['#D9480F', '#F2B01E'], ['#3D9BE9', '#6A3DD1'],
  ['#C2255C', '#F06595'], ['#2B8A3E', '#94D82D'], ['#1B1730', '#6A3DD1'], ['#E67700', '#FF922B'],
];
