import React from 'react';
import { Platform, StyleProp, Text, TextStyle } from 'react-native';
import { FONT, lineHeightFor } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { DEV_CREDIT } from '../../constants/app';

interface TProps { children?: React.ReactNode; size?: number; color?: string; center?: boolean; style?: StyleProp<TextStyle>; lines?: number; selectable?: boolean; spacing?: number }

/** Numbers use a plain system font (123), not Nastaleeq. */
const DIGIT_FONT = Platform.select({ android: 'sans-serif', ios: 'System', default: 'system-ui, sans-serif' });
const DIGIT_RUN = /(\d+(?:[.,:/]\d+)*)/;

/** Splits strings so every digit run is rendered in the system font; other nodes pass through untouched. */
export function withPlainDigits(children: React.ReactNode, size: number): React.ReactNode {
  return React.Children.map(children, (node) => {
    const s = typeof node === 'number' ? String(node) : node;
    if (typeof s !== 'string' || !/\d/.test(s)) return node;
    return s.split(DIGIT_RUN).map((part, i) => (i % 2 ? <Text key={i} style={{ fontFamily: DIGIT_FONT, fontSize: Math.round(size * 0.92) }}>{` ${part} `}</Text> : part));
  });
}

/** Every piece of Urdu text goes through here: Nastaleeq needs a tall line box, RTL, and no font-weight faking. */
export function UText({ children, size = 16, color, center, style, lines, selectable, spacing = 1.9 }: TProps) {
  const { c } = useTheme();
  // Nastaleeq glyphs overhang their measured advance (tails/ascenders were cut at the edges): a little padding keeps them whole.
  const padH = Math.max(2, Math.round(size * 0.16));
  return (
    <Text selectable={selectable} numberOfLines={lines} style={[{ fontFamily: FONT, fontSize: size, lineHeight: lineHeightFor(size, spacing), color: color ?? c.text, textAlign: center ? 'center' : 'right', writingDirection: 'rtl', includeFontPadding: false, paddingHorizontal: padH }, style]}>
      {withPlainDigits(children, size)}
    </Text>
  );
}
export function Muted(p: TProps) { const { c } = useTheme(); return <UText size={13} color={c.muted} {...p} />; }

/** Small developer credit line ("Developed by Qayyum Bhatti"), shown under posts and on main screens. */
export function DevCredit({ style, align = 'center' }: { style?: StyleProp<TextStyle>; align?: 'center' | 'left' | 'right' }) {
  const { c } = useTheme();
  return <Text accessibilityLabel={DEV_CREDIT} style={[{ fontFamily: DIGIT_FONT, fontSize: 10, color: c.muted, textAlign: align, letterSpacing: 0.3, opacity: 0.9, writingDirection: 'ltr' }, style]}>{DEV_CREDIT}</Text>;
}
