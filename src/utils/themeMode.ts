export type ThemeMode = 'light' | 'dark' | 'system';
/** Resolve the active palette from the saved mode (light / dark / follow the phone). */
export const resolveDark = (mode: ThemeMode, system: string | null | undefined): boolean => mode === 'dark' || (mode === 'system' && system === 'dark');
