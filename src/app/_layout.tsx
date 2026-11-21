import '../constants/rtl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SQLite from 'expo-sqlite';
import * as ScreenCapture from 'expo-screen-capture';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { COLORS } from '../constants/theme';
import { DB_NAME } from '../constants/app';
import { S } from '../constants/strings';
import { fromExpo } from '../database/expoAdapter';
import { initDatabase } from '../database/init';
import { useSettings } from '../stores/settings';
import { hasPin } from '../services/privacy/lock';
import { LockScreen } from '../components/LockScreen';
import { OverlayHost } from '../components/design-system';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ AlviNastaleeq: require('../../assets/fonts/AlviNastaleeq.ttf') });
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const screenSecurity = useSettings((s) => s.screenSecurity);

  useEffect(() => {
    (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.execAsync('PRAGMA journal_mode = WAL;');
        await initDatabase(fromExpo(db));
        await useSettings.getState().load();
        setLocked(await hasPin());
        setDbReady(true);
      } catch (e: any) { setDbError(String(e?.message || e)); }
    })();
  }, []);

  useEffect(() => { (screenSecurity ? ScreenCapture.preventScreenCaptureAsync() : ScreenCapture.allowScreenCaptureAsync()).catch(() => {}); }, [screenSecurity]);

  // Re-lock when the app was in the background for over a minute.
  const hiddenAt = useRef(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (s) => {
      if (s === 'background' || s === 'inactive') { if (!hiddenAt.current) hiddenAt.current = Date.now(); return; }
      if (s === 'active' && hiddenAt.current && Date.now() - hiddenAt.current > 60000 && (await hasPin())) setLocked(true);
      hiddenAt.current = 0;
    });
    return () => sub.remove();
  }, []);

  const ready = (fontsLoaded || !!fontError) && dbReady;
  useEffect(() => { if (ready || dbError) SplashScreen.hideAsync().catch(() => {}); }, [ready, dbError]);
  const unlock = useCallback(() => setLocked(false), []);

  if (dbError) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.bg }}><Text style={{ color: COLORS.danger, fontSize: 18, textAlign: 'center' }}>{S.dbOpenFail}</Text><Text style={{ marginTop: 8, color: COLORS.muted, textAlign: 'center' }}>{dbError}</Text></View>;
  }
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}><ActivityIndicator color={COLORS.primary} /></View>;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg }, animation: 'slide_from_right' }} />
        {locked ? <LockScreen onUnlock={unlock} /> : null}
        <OverlayHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
