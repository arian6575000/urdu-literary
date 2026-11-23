import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { FONT, lineHeightFor } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

interface TProps { children?: React.ReactNode; size?: number; color?: string; center?: boolean; style?: StyleProp<TextStyle>; lines?: number; selectable?: boolean; spacing?: number }
/** Every piece of Urdu text goes through here: Nastaleeq needs a tall line box, RTL, and no font-weight faking. */
export function UText({ children, size = 16, color, center, style, lines, selectable, spacing = 1.9 }: TProps) {
  const { c } = useTheme();
  return (
    <Text selectable={selectable} numberOfLines={lines} style={[{ fontFamily: FONT, fontSize: size, lineHeight: lineHeightFor(size, spacing), color: color ?? c.text, textAlign: center ? 'center' : 'right', writingDirection: 'rtl', includeFontPadding: false }, style]}>
      {children}
    </Text>
  );
}
export function Muted(p: TProps) { const { c } = useTheme(); return <UText size={13} color={c.muted} {...p} />; }
