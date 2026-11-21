import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, RADII } from '../constants/theme';
import { S } from '../constants/strings';
import { useSettings } from '../stores/settings';
import { Button, Icon, IconName, Row, UText } from '../components/design-system';

const SLIDES: { icon: IconName; t: string; d: string }[] = [
  { icon: 'create-outline', t: S.ob1t, d: S.ob1d },
  { icon: 'mic-outline', t: S.ob2t, d: S.ob2d },
  { icon: 'share-social-outline', t: S.ob3t, d: S.ob3d },
];

// Screen 02 — three short pages. No permission is requested here; the microphone is asked for on first voice use.
export default function Onboarding() {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const finish = async () => { await useSettings.getState().set('onboarded', true); router.replace('/(tabs)'); };
  const s = SLIDES[i];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Row style={{ padding: 16, justifyContent: 'flex-start' }}>{!last ? <Button small variant="ghost" label={S.skip} onPress={finish} /> : null}</Row>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 108, height: 108, borderRadius: 54, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={52} color={COLORS.secondary} /></View>
        </View>
        <UText size={34} color={COLORS.primary} center>{s.t}</UText>
        <UText size={18} color={COLORS.text} center spacing={2.1}>{s.d}</UText>
      </View>
      <View style={{ padding: 24, gap: 20 }}>
        <Row style={{ justifyContent: 'center' }} gap={8}>
          {SLIDES.map((_, k) => <View key={k} style={{ width: k === i ? 26 : 8, height: 8, borderRadius: RADII.pill, backgroundColor: k === i ? COLORS.primary : COLORS.line }} />)}
        </Row>
        <Button label={last ? S.start : S.next} onPress={() => (last ? finish() : setI(i + 1))} />
      </View>
    </SafeAreaView>
  );
}
