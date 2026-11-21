import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BACK_ICON, COLORS, FONT, RADII, ROW, SHADOW, SIZES, SPACING, lineHeightFor } from '../../constants/theme';
import { S } from '../../constants/strings';
import { useUi } from '../../stores/ui';
import { Icon, type IconName } from './Icon';

export { Icon };
export type { IconName };

/* ---------- Text ---------- */
interface TProps { children?: React.ReactNode; size?: number; color?: string; center?: boolean; style?: StyleProp<TextStyle>; lines?: number; selectable?: boolean; spacing?: number }
/** Every piece of Urdu text goes through here: Nastaleeq needs a tall line box, RTL, and no font-weight faking. */
export function UText({ children, size = 16, color = COLORS.text, center, style, lines, selectable, spacing = 1.9 }: TProps) {
  return (
    <Text selectable={selectable} numberOfLines={lines} style={[{ fontFamily: FONT, fontSize: size, lineHeight: lineHeightFor(size, spacing), color, textAlign: center ? 'center' : 'right', writingDirection: 'rtl', includeFontPadding: false }, style]}>
      {children}
    </Text>
  );
}
export const Muted = (p: TProps) => <UText size={13} color={COLORS.muted} {...p} />;

/* ---------- Layout ---------- */
export function Row({ children, gap = SPACING.sm, style, align = 'center', wrap }: { children?: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; align?: ViewStyle['alignItems']; wrap?: boolean }) {
  return <View style={[{ flexDirection: ROW, alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Card({ children, style, onPress, pad = SPACING.lg }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; pad?: number }) {
  const s: StyleProp<ViewStyle> = [{ backgroundColor: COLORS.surface, borderRadius: RADII.lg, padding: pad, borderWidth: 1, borderColor: COLORS.line, ...SHADOW }, style];
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.85 }]}>{children}</Pressable> : <View style={s}>{children}</View>;
}

export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, small, style }: {
  label: string; onPress?: () => void; icon?: IconName; variant?: 'primary' | 'gold' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'primary' ? COLORS.primary : variant === 'gold' ? COLORS.secondary : variant === 'danger' ? COLORS.danger : 'transparent';
  const fg = variant === 'ghost' ? COLORS.primary : COLORS.white;
  return (
    <Pressable
      accessibilityRole="button" disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [{ minHeight: small ? 40 : SIZES.button, paddingHorizontal: small ? 14 : 20, borderRadius: RADII.pill, backgroundColor: bg, borderWidth: variant === 'ghost' ? 1.5 : 0, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: ROW, gap: 8, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 18 : 22} color={fg} /> : null}
      <UText size={small ? 14 : 17} color={fg} spacing={1.5}>{label}</UText>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color = COLORS.text, size = 22, bg, label, active }: { icon: IconName; onPress?: () => void; color?: string; size?: number; bg?: string; label?: string; active?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} hitSlop={8} style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? COLORS.primarySoft : bg ?? 'transparent', opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={icon} size={size} color={active ? COLORS.primary : color} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: ROW, alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 40, borderRadius: RADII.pill, backgroundColor: active ? COLORS.primary : COLORS.surface, borderWidth: 1, borderColor: active ? COLORS.primary : COLORS.line }}>
      {icon ? <Icon name={icon} size={16} color={active ? COLORS.white : COLORS.muted} /> : null}
      <UText size={14} color={active ? COLORS.white : COLORS.text} spacing={1.5}>{label}</UText>
    </Pressable>
  );
}

/* ---------- Screen scaffold ---------- */
export function Screen({ title, back, right, children, scroll = true, pad = true, footer, bottomSpace = 24 }: {
  title?: string; back?: boolean; right?: React.ReactNode; children?: React.ReactNode; scroll?: boolean; pad?: boolean; footer?: React.ReactNode; bottomSpace?: number;
}) {
  const body = scroll
    ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: pad ? SPACING.lg : 0, paddingBottom: bottomSpace, gap: SPACING.md }}>{children}</ScrollView>
    : <View style={{ flex: 1, padding: pad ? SPACING.lg : 0 }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      {title !== undefined || back ? (
        <Row style={{ height: SIZES.header, paddingHorizontal: SPACING.sm }} gap={4}>
          {back ? <IconButton icon={BACK_ICON} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} label="واپس" /> : <View style={{ width: 8 }} />}
          <View style={{ flex: 1 }}><UText size={22} color={COLORS.primary} lines={1} spacing={1.7}>{title}</UText></View>
          {right}
        </Row>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}</KeyboardAvoidingView>
      {footer}
    </SafeAreaView>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: SPACING.sm }}>
      <UText size={19} color={COLORS.primary} spacing={1.7}>{children}</UText>{right}
    </Row>
  );
}

export function Loading() { return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={COLORS.primary} size="large" /></View>; }

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 6 }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.secondarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Icon name={icon} size={38} color={COLORS.secondary} /></View>
      <UText size={20} color={COLORS.primary} center>{title}</UText>
      {text ? <UText size={14} color={COLORS.muted} center>{text}</UText> : null}
      {action ? <View style={{ marginTop: 12 }}>{action}</View> : null}
    </View>
  );
}

/* ---------- Inputs ---------- */
export function Field({ label, value, onChangeText, multiline, hint, style, ltr, ...rest }: TextInputProps & { label?: string; hint?: string; ltr?: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      {label ? <UText size={14} color={COLORS.muted} spacing={1.5}>{label}</UText> : null}
      <TextInput
        value={value} onChangeText={onChangeText} multiline={multiline} placeholderTextColor={COLORS.muted} textAlign={ltr ? 'left' : 'right'}
        {...rest}
        style={[{ fontFamily: FONT, fontSize: 18, lineHeight: lineHeightFor(18, 1.9), color: COLORS.text, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: RADII.md, paddingHorizontal: 14, paddingVertical: 8, minHeight: SIZES.input, textAlignVertical: multiline ? 'top' : 'center', writingDirection: ltr ? 'ltr' : 'rtl' }, style]} />
      {hint ? <UText size={12} color={COLORS.muted} spacing={1.5}>{hint}</UText> : null}
    </View>
  );
}

export function SwitchRow({ label, desc, value, onChange, icon }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: ROW, alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      {icon ? <Icon name={icon} size={22} color={COLORS.primary} /> : null}
      <View style={{ flex: 1 }}><UText size={16}>{label}</UText>{desc ? <UText size={12} color={COLORS.muted} spacing={1.5}>{desc}</UText> : null}</View>
      <View style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: value ? COLORS.primary : '#CFC8B8', padding: 3, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white }} />
      </View>
    </Pressable>
  );
}

export function ListRow({ icon, title, sub, onPress, trail, danger }: { icon?: IconName; title: string; sub?: string; onPress?: () => void; trail?: React.ReactNode; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: ROW, alignItems: 'center', gap: 12, paddingVertical: 10, opacity: pressed ? 0.6 : 1 }]}>
      {icon ? <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: danger ? 'rgba(179,55,47,0.1)' : COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={20} color={danger ? COLORS.danger : COLORS.primary} /></View> : null}
      <View style={{ flex: 1 }}><UText size={16} color={danger ? COLORS.danger : COLORS.text} spacing={1.6}>{title}</UText>{sub ? <UText size={12} color={COLORS.muted} spacing={1.5}>{sub}</UText> : null}</View>
      {trail ?? (onPress ? <Icon name="chevron-back" size={18} color={COLORS.muted} /> : null)}
    </Pressable>
  );
}
export const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: COLORS.line }} />;

/* ---------- Sheet / dialog / toast ---------- */
export function Sheet({ visible, onClose, title, children, tall }: { visible: boolean; onClose: () => void; title?: string; children?: React.ReactNode; tall?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,20,18,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: COLORS.bg, borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl, paddingBottom: insets.bottom + 12, maxHeight: '88%', height: tall ? '88%' : undefined }}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}><View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.line }} /></View>
        {title ? <View style={{ paddingHorizontal: SPACING.lg, paddingTop: 6 }}><UText size={21} color={COLORS.primary}>{title}</UText></View> : null}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

/** Mount once at the app root. Driven by confirmDialog() / toast() from stores/ui. */
export function OverlayHost() {
  const dialog = useUi((s) => s.dialog);
  const toast = useUi((s) => s.toast);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: toast ? 1 : 0, duration: 180, useNativeDriver: true }).start(); }, [toast, fade]);
  return (
    <>
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => dialog?.resolve(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(20,20,18,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 380, backgroundColor: COLORS.surface, borderRadius: RADII.xl, padding: 22, gap: 18 }}>
            <UText size={18} center>{dialog?.message}</UText>
            <Row gap={10}>
              <Button label={dialog?.okLabel ?? ''} variant={dialog?.danger ? 'danger' : 'primary'} onPress={() => dialog?.resolve(true)} style={{ flex: 1 }} />
              {dialog?.cancelLabel ? <Button label={dialog.cancelLabel} variant="ghost" onPress={() => dialog?.resolve(false)} style={{ flex: 1 }} /> : null}
            </Row>
          </View>
        </View>
      </Modal>
      {toast ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', bottom: 110, alignSelf: 'center', opacity: fade, maxWidth: '88%', backgroundColor: toast.kind === 'error' ? COLORS.danger : toast.kind === 'ok' ? COLORS.primary : COLORS.ink, borderRadius: RADII.pill, paddingHorizontal: 20, paddingVertical: 6, ...SHADOW }}>
          <UText size={15} color={COLORS.white} center spacing={1.6}>{toast.text}</UText>
        </Animated.View>
      ) : null}
    </>
  );
}

/** Horizontal scroller whose first item sits on the RIGHT (RTL), with or without the native RTL flag. */
export function HScroll({ children, gap = SPACING.sm }: { children?: React.ReactNode; gap?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: ROW, gap, alignItems: 'center', flexGrow: 1 }}>{children}</ScrollView>
  );
}

export const dismissKeyboard = () => Keyboard.dismiss();
export { S };
