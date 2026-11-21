import React from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CATEGORIES } from '../constants/categories';
import { COLORS, RADII, SHADOW } from '../constants/theme';
import { S } from '../constants/strings';
import { Icon, Row, Screen, UText } from '../components/design-system';

// Screen 05 — choose the kind of writing
export default function Create() {
  const { cat } = useLocalSearchParams<{ cat?: string }>();
  const go = (id: string) => router.replace({ pathname: '/writing/edit', params: { cat: id } });
  const rows = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) rows.push(CATEGORIES.slice(i, i + 2));
  return (
    <Screen title={S.newWriting} back>
      <UText size={18} color={COLORS.muted}>{S.chooseCategory}</UText>
      {rows.map((r, i) => (
        <Row key={i} gap={12} align="stretch">
          {r.map((c) => (
            <Pressable key={c.id} onPress={() => go(c.id)} style={({ pressed }) => [{ flex: 1, minHeight: 130, backgroundColor: cat === c.id ? COLORS.primary : COLORS.surface, borderRadius: RADII.lg, padding: 16, justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.line, opacity: pressed ? 0.85 : 1, ...SHADOW }]}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: cat === c.id ? 'rgba(255,255,255,0.15)' : COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={c.icon} size={24} color={cat === c.id ? COLORS.secondary : COLORS.primary} /></View>
              <UText size={22} color={cat === c.id ? '#F7F3EA' : COLORS.primary}>{c.name}</UText>
            </Pressable>
          ))}
          {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </Row>
      ))}
    </Screen>
  );
}
