import React, { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { UText } from './Text';
import { sliderPosOf, sliderValueAt } from '../../utils/slider';

export { sliderValueAt, sliderPosOf };

interface Props { label: string; value: number; min: number; max: number; step?: number; format?: (v: number) => string; onChange: (v: number) => void; onComplete?: (v: number) => void }

/**
 * Dependency-free slider (the app has no slider library). Track is forced LTR so min is on the left;
 * the number is always shown next to the label. Large 44dp touch area, tap or drag anywhere on the track.
 */
export function Slider({ label, value, min, max, step = 1, format, onChange, onComplete }: Props) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const wRef = useRef(0); wRef.current = w;
  const live = useRef(value); live.current = value;
  const cb = useRef({ onChange, onComplete, min, max, step }); cb.current = { onChange, onComplete, min, max, step };
  const startX = useRef(0);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { const x = e.nativeEvent.locationX; startX.current = x; const { min: a, max: b, step: s } = cb.current; const v = sliderValueAt(x, wRef.current, a, b, s); live.current = v; cb.current.onChange(v); },
    onPanResponderMove: (_e, g) => { const { min: a, max: b, step: s } = cb.current; const v = sliderValueAt(startX.current + g.dx, wRef.current, a, b, s); if (v !== live.current) { live.current = v; cb.current.onChange(v); } },
    onPanResponderRelease: () => cb.current.onComplete?.(live.current),
  })).current;
  const pos = sliderPosOf(value, w, min, max);
  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => { const nv = Math.max(min, Math.min(max, +(value + (e.nativeEvent.actionName === 'increment' ? step : -step)).toFixed(4))); onChange(nv); onComplete?.(nv); }}
      style={{ gap: 0 }}>
      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
        <UText size={14} color={c.muted} spacing={1.5}>{label}</UText>
        <UText size={14} color={c.primary} spacing={1.5}>{format ? format(value) : String(value)}</UText>
      </View>
      <View style={{ height: 44, justifyContent: 'center', direction: 'ltr' }} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}>
        <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: c.line }}>
          <View style={{ width: pos, height: 6, borderRadius: 3, backgroundColor: c.primary }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: Math.max(0, pos - 13), width: 26, height: 26, borderRadius: 13, backgroundColor: c.surface, borderWidth: 3, borderColor: c.primary }} />
      </View>
    </View>
  );
}
