import { I18nManager } from 'react-native';
// Must run before any component renders. On the very first launch the OS flag only takes effect after a restart,
// so layouts also use ROW from constants/theme (explicit row-reverse when the flag is not yet active).
try { I18nManager.allowRTL(true); I18nManager.forceRTL(true); } catch { /* ignore */ }
