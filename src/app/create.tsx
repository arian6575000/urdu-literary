import React from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CATEGORIES } from '../constants/categories';
import { RADII, SHADOW } from '../constants/theme';
import { S } from '../constants/strings';
import { useTheme } from '../hooks/useTheme';
import { Icon, Row, Screen, UText } from '../components/design-system';

// Screen 05 — choose the kind of writing
export default function Create() {
  const { c } = useTheme();
  const { cat } = useLocalSearchParams<{ cat?: string }>();
  const go = (id: string) => router.replace({ pathname: '/writing/edit', params: { cat: id } });
  const tones = [c.primary, c.secondary, c.accent, c.sky];
  const rows = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) rows.push(CATEGORIES.slice(i, i + 2));
  return (
    <Screen title={S.newWriting} back>
      <UText size={18} color={c.muted}>{S.chooseCategory}</UText>
      {rows.map((r, ri) => (
        <Row key={ri} gap={12} align="stretch">
          {r.map((x, k) => { const tone = tones[(ri * 2 + k) % tones.length]; return (
            <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={x.name} onPress={() => go(x.id)} style={({ pressed }) => [{ flex: 1, minHeight: 120, backgroundColor: cat === x.id ? tone : c.surface, borderRadius: RADII.lg, padding: 14, justifyContent: 'space-between', borderWidth: 1, borderColor: c.line, opacity: pressed ? 0.88 : 1, ...SHADOW }]}>
              <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: cat === x.id ? 'rgba(255,255,255,0.22)' : c.tint, alignItems: 'center', justifyContent: 'center' }}><Icon name={x.icon} size={24} color={cat === x.id ? '#FFFFFF' : tone} /></View>
              <UText size={21} color={cat === x.id ? '#FFFFFF' : tone}>{x.name}</UText>
            </Pressable>); })}
          {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </Row>
      ))}
    </Screen>
  );
}
