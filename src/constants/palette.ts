// Pure colour tokens (no React Native imports, so tests can check contrast).
/** Colour tokens. Components read them through `useTheme()` (hooks/useTheme.ts) so light/dark switches live. */
export interface Palette {
  bg: string; surface: string; surfaceAlt: string; tint: string;
  primary: string; primarySoft: string; onPrimary: string;
  secondary: string; secondarySoft: string; onSecondary: string;
  accent: string; accentSoft: string; onAccent: string;
  gold: string; goldSoft: string; sky: string; mint: string;
  text: string; muted: string; line: string; danger: string; success: string; white: string; ink: string; scrim: string;
}

export const LIGHT: Palette = {
  bg: '#F4F2FA', surface: '#FFFFFF', surfaceAlt: '#ECE9F6', tint: '#EDE7FF',
  primary: '#6A3DD1', primarySoft: 'rgba(106,61,209,0.12)', onPrimary: '#FFFFFF',
  secondary: '#077A7B', secondarySoft: 'rgba(7,122,123,0.13)', onSecondary: '#FFFFFF',
  accent: '#C73E0A', accentSoft: 'rgba(199,62,10,0.12)', onAccent: '#FFFFFF',
  gold: '#F2B01E', goldSoft: 'rgba(242,176,30,0.22)', sky: '#3D9BE9', mint: '#35C28F',
  text: '#2B2540', muted: '#6D6785', line: 'rgba(43,37,64,0.13)', danger: '#D13A3A', success: '#17875A', white: '#FFFFFF', ink: '#1B1730', scrim: 'rgba(20,16,36,0.5)',
};

export const DARK: Palette = {
  bg: '#14111F', surface: '#1E1930', surfaceAlt: '#272140', tint: '#2A2150',
  primary: '#B297FF', primarySoft: 'rgba(178,151,255,0.18)', onPrimary: '#14111F',
  secondary: '#3CD2CF', secondarySoft: 'rgba(60,210,207,0.16)', onSecondary: '#0E0B17',
  accent: '#FF8A5C', accentSoft: 'rgba(255,138,92,0.16)', onAccent: '#14111F',
  gold: '#FFC857', goldSoft: 'rgba(255,200,87,0.20)', sky: '#6DB8FF', mint: '#5BE0B3',
  text: '#EEEAF8', muted: '#A9A2C4', line: 'rgba(238,234,248,0.13)', danger: '#FF7B7B', success: '#4ADE9B', white: '#FFFFFF', ink: '#0E0B17', scrim: 'rgba(0,0,0,0.62)',
};

export const gradients = (c: Palette) => ({
  hero: [c.primary, '#9B5DE5', '#E0569D'] as [string, string, string],
  voice: [c.accent, c.gold] as [string, string],
  create: [c.secondary, c.sky] as [string, string],
  card: [c.primary, c.secondary] as [string, string],
});
