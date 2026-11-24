import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DARK, LIGHT, gradients, type Palette } from '../constants/theme';
import { useSettings } from '../stores/settings';

import { resolveDark, type ThemeMode } from '../utils/themeMode';
export type { ThemeMode };
export interface Theme { c: Palette; dark: boolean; g: ReturnType<typeof gradients> }

export function useTheme(): Theme {
  const mode = useSettings((s) => s.themeMode);
  const system = useColorScheme();
  const dark = resolveDark(mode, system);
  return useMemo(() => { const c = dark ? DARK : LIGHT; return { c, dark, g: gradients(c) }; }, [dark]);
}
