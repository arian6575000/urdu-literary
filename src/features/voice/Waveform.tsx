import React from 'react';
import { View } from 'react-native';
import { COLORS } from '../../constants/theme';

/** Live audio bars. `levels` are 0..1, newest last. */
export function Waveform({ levels, active }: { levels: number[]; active: boolean }) {
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      {levels.map((l, i) => (
        <View key={i} style={{ width: 4, borderRadius: 2, height: 6 + Math.round(l * 46), backgroundColor: active ? (i > levels.length - 6 ? COLORS.secondary : COLORS.primary) : COLORS.line, opacity: 0.35 + 0.65 * (i / levels.length) }} />
      ))}
    </View>
  );
}
