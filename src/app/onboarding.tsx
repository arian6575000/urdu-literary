import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RADII } from '../constants/theme';
import { S } from '../constants/strings';
import { useSettings } from '../stores/settings';
import { useTheme } from '../hooks/useTheme';
import { Button, Icon, IconName, Row, UText } from '../components/design-system';

const SLIDES: { icon: IconName; t: string; d: string; tone: 'primary' | 'accent' | 'secondary' | 'danger' }[] = [
  { icon: 'create-outline', t: S.ob1t, d: S.ob1d, tone: 'primary' },
  { icon: 'mic-outline', t: S.ob2t, d: S.ob2d, tone: 'accent' },
  { icon: 'share-social-outline', t: S.ob3t, d: S.ob3d, tone: 'secondary' },
  { icon: 'albums-outline', t: S.ob4t, d: S.ob4d, tone: 'danger' },
];

// Screen 02 — four short pages, always skippable. No permission is requested here; the microphone is asked for on first voice use.
export default function Onboarding() {
  const { c } = useTheme();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const finish = async () => { await useSettings.getState().set('onboarded', true); router.replace('/(tabs)'); };
  const s = SLIDES[i];
  const tone = c[s.tone];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Row style={{ padding: 16, justifyContent: 'flex-start', minHeight: 72 }}>{!last ? <Button small variant="ghost" label={S.skip} onPress={finish} /> : null}</Row>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient colors={[tone, c.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 114, height: 114, borderRadius: 57, alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={54} color="#FFFFFF" /></LinearGradient>
        </View>
        <UText size={34} color={tone} center>{s.t}</UText>
        <UText size={18} center spacing={2.1}>{s.d}</UText>
      </View>
      <View style={{ padding: 24, gap: 20 }}>
        <Row style={{ justifyContent: 'center' }} gap={8}>{SLIDES.map((_, k) => <View key={k} style={{ width: k === i ? 28 : 8, height: 8, borderRadius: RADII.pill, backgroundColor: k === i ? tone : c.line }} />)}</Row>
        <Button label={last ? S.start : S.next} onPress={() => (last ? finish() : setI(i + 1))} />
      </View>
    </SafeAreaView>
  );
}
