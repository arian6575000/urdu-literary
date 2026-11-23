import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BACK_ICON, FONT, RADII, ROW, SHADOW, SIZES, SPACING, lineHeightFor } from '../../constants/theme';
import { S } from '../../constants/strings';
import { useUi } from '../../stores/ui';
import { useTheme } from '../../hooks/useTheme';
import { Icon, type IconName } from './Icon';

export { Icon };
export type { IconName };
export { Slider } from './Slider';

export { UText, Muted } from './Text';
import { UText } from './Text';

/* ---------- Layout ---------- */
export function Row({ children, gap = SPACING.sm, style, align = 'center', wrap }: { children?: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; align?: ViewStyle['alignItems']; wrap?: boolean }) {
  return <View style={[{ flexDirection: ROW, alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Card({ children, style, onPress, pad = SPACING.lg, tinted, label }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; pad?: number; tinted?: boolean; label?: string }) {
  const { c } = useTheme();
  const s: StyleProp<ViewStyle> = [{ backgroundColor: tinted ? c.tint : c.surface, borderRadius: RADII.lg, padding: pad, borderWidth: 1, borderColor: c.line, ...SHADOW }, style];
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] }]}>{children}</Pressable>
    : <View style={s}>{children}</View>;
}

/** Gradient banner / feature tile. Text on it should use `c.white`. */
export function GradientCard({ colors, children, style, onPress, label }: { colors: readonly [string, string, ...string[]]; children?: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const inner = <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: RADII.lg, padding: SPACING.lg, overflow: 'hidden' }, style]}>{children}</LinearGradient>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, SHADOW]}>{inner}</Pressable> : inner;
}

type Variant = 'primary' | 'gold' | 'ghost' | 'danger' | 'teal' | 'accent' | 'soft';
export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, small, style }: {
  label: string; onPress?: () => void; icon?: IconName; variant?: Variant; disabled?: boolean; loading?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = variant === 'primary' ? c.primary : variant === 'gold' ? c.gold : variant === 'danger' ? c.danger : variant === 'teal' ? c.secondary : variant === 'accent' ? c.accent : variant === 'soft' ? c.primarySoft : 'transparent';
  const fg = variant === 'ghost' || variant === 'soft' ? c.primary : variant === 'gold' ? c.ink : variant === 'teal' ? c.onSecondary : variant === 'accent' ? c.onAccent : variant === 'danger' ? '#FFFFFF' : c.onPrimary;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!(disabled || loading) }} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [{ minHeight: small ? 44 : SIZES.button, paddingHorizontal: small ? 16 : 22, borderRadius: RADII.pill, backgroundColor: bg, borderWidth: variant === 'ghost' ? 1.5 : 0, borderColor: c.primary, alignItems: 'center', justifyContent: 'center', flexDirection: ROW, gap: 8, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 18 : 22} color={fg} /> : null}
      <UText size={small ? 14 : 17} color={fg} spacing={1.5}>{label}</UText>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color, size = 22, bg, label, active, disabled }: { icon: IconName; onPress?: () => void; color?: string; size?: number; bg?: string; label?: string; active?: boolean; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, selected: !!active }} disabled={disabled} onPress={onPress} hitSlop={4}
      style={({ pressed }) => [{ width: SIZES.touch, height: SIZES.touch, borderRadius: SIZES.touch / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? c.primarySoft : bg ?? 'transparent', opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
      <Icon name={icon} size={size} color={active ? c.primary : color ?? c.text} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon, tone }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName; tone?: string }) {
  const { c } = useTheme();
  const on = tone ?? c.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress}
      style={{ flexDirection: ROW, alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 44, borderRadius: RADII.pill, backgroundColor: active ? on : c.surface, borderWidth: 1, borderColor: active ? on : c.line }}>
      {icon ? <Icon name={icon} size={16} color={active ? c.white : c.muted} /> : null}
      <UText size={14} color={active ? c.white : c.text} spacing={1.5}>{label}</UText>
    </Pressable>
  );
}

/** Two-to-four way switch (e.g. شاعری / نثر). */
export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: ROW, backgroundColor: c.surfaceAlt, borderRadius: RADII.pill, padding: 4 }}>
      {options.map((o) => (
        <Pressable key={o.id} accessibilityRole="tab" accessibilityState={{ selected: value === o.id }} onPress={() => onChange(o.id)}
          style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADII.pill, backgroundColor: value === o.id ? c.primary : 'transparent' }}>
          <UText size={15} color={value === o.id ? c.onPrimary : c.text} center spacing={1.5}>{o.label}</UText>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------- Screen scaffold ---------- */
export function Screen({ title, back, right, children, scroll = true, pad = true, footer, bottomSpace = 24 }: {
  title?: string; back?: boolean; right?: React.ReactNode; children?: React.ReactNode; scroll?: boolean; pad?: boolean; footer?: React.ReactNode; bottomSpace?: number;
}) {
  const { c } = useTheme();
  const body = scroll
    ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: pad ? SPACING.lg : 0, paddingBottom: bottomSpace, gap: SPACING.md }}>{children}</ScrollView>
    : <View style={{ flex: 1, padding: pad ? SPACING.lg : 0 }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {title !== undefined || back ? (
        <Row style={{ height: SIZES.header, paddingHorizontal: SPACING.sm }} gap={4}>
          {back ? <IconButton icon={BACK_ICON} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} label="واپس" /> : <View style={{ width: 8 }} />}
          <View style={{ flex: 1 }}><UText size={22} color={c.primary} lines={1} spacing={1.7}>{title}</UText></View>
          {right}
        </Row>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}</KeyboardAvoidingView>
      {footer}
    </SafeAreaView>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: SPACING.sm }}>
      <UText size={19} color={c.primary} spacing={1.7}>{children}</UText>{right}
    </Row>
  );
}

export function Loading() { const { c } = useTheme(); return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={c.primary} size="large" /></View>; }

/** Pulsing placeholder block shown while a list loads. */
export function Skeleton({ height = 84, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(a, { toValue: 0.45, duration: 700, useNativeDriver: true })]));
    l.start(); return () => l.stop();
  }, [a]);
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ height, borderRadius: RADII.lg, backgroundColor: c.surfaceAlt, opacity: a }, style]} />;
}
export function SkeletonList({ n = 4, height }: { n?: number; height?: number }) { return <View style={{ gap: SPACING.md, padding: SPACING.lg }}>{Array.from({ length: n }, (_, i) => <Skeleton key={i} height={height} />)}</View>; }

export function Empty({ icon, title, text, action, tone }: { icon: IconName; title: string; text?: string; action?: React.ReactNode; tone?: string }) {
  const { c } = useTheme();
  const t = tone ?? c.primary;
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 6 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', ...SHADOW }}><Icon name={icon} size={34} color={t} /></View>
      </View>
      <UText size={20} color={t} center>{title}</UText>
      {text ? <UText size={14} color={c.muted} center>{text}</UText> : null}
      {action ? <View style={{ marginTop: 12 }}>{action}</View> : null}
    </View>
  );
}

/* ---------- Inputs ---------- */
export function Field({ label, value, onChangeText, multiline, hint, style, ltr, ...rest }: TextInputProps & { label?: string; hint?: string; ltr?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {label ? <UText size={14} color={c.muted} spacing={1.5}>{label}</UText> : null}
      <TextInput
        accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline} placeholderTextColor={c.muted} textAlign={ltr ? 'left' : 'right'} selectionColor={c.primary}
        {...rest}
        style={[{ fontFamily: FONT, fontSize: 18, lineHeight: lineHeightFor(18, 1.9), color: c.text, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: RADII.md, paddingHorizontal: 14, paddingVertical: 8, minHeight: SIZES.input, textAlignVertical: multiline ? 'top' : 'center', writingDirection: ltr ? 'ltr' : 'rtl' }, style]} />
      {hint ? <UText size={12} color={c.muted} spacing={1.5}>{hint}</UText> : null}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder, onSubmit, autoFocus }: { value: string; onChangeText: (t: string) => void; placeholder?: string; onSubmit?: () => void; autoFocus?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: ROW, alignItems: 'center', backgroundColor: c.surface, borderRadius: RADII.pill, borderWidth: 1, borderColor: c.line, paddingHorizontal: 14, minHeight: SIZES.input, gap: 8 }}>
      <Icon name="search" size={20} color={c.primary} />
      <TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.muted} returnKeyType="search" onSubmitEditing={onSubmit} autoFocus={autoFocus} textAlign="right" selectionColor={c.primary}
        style={{ flex: 1, fontFamily: FONT, fontSize: 17, lineHeight: lineHeightFor(17, 1.9), color: c.text, writingDirection: 'rtl', paddingVertical: 4 }} />
      {value ? <Pressable accessibilityLabel="صاف کریں" hitSlop={10} onPress={() => onChangeText('')}><Icon name="close-circle" size={20} color={c.muted} /></Pressable> : null}
    </View>
  );
}

export function SwitchRow({ label, desc, value, onChange, icon }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={{ flexDirection: ROW, alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: SIZES.touch }}>
      {icon ? <Icon name={icon} size={22} color={c.primary} /> : null}
      <View style={{ flex: 1 }}><UText size={16}>{label}</UText>{desc ? <UText size={12} color={c.muted} spacing={1.5}>{desc}</UText> : null}</View>
      <View style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: value ? c.primary : c.line, padding: 3, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.white }} />
      </View>
    </Pressable>
  );
}

export function ListRow({ icon, title, sub, onPress, trail, danger, tone }: { icon?: IconName; title: string; sub?: string; onPress?: () => void; trail?: React.ReactNode; danger?: boolean; tone?: string }) {
  const { c } = useTheme();
  const t = danger ? c.danger : tone ?? c.primary;
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [{ flexDirection: ROW, alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: SIZES.touch, opacity: pressed ? 0.6 : 1 }]}>
      {icon ? <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: danger ? c.accentSoft : c.tint, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={21} color={t} /></View> : null}
      <View style={{ flex: 1 }}><UText size={16} color={danger ? c.danger : c.text} spacing={1.6}>{title}</UText>{sub ? <UText size={12} color={c.muted} spacing={1.5}>{sub}</UText> : null}</View>
      {trail ?? (onPress ? <Icon name="chevron-back" size={18} color={c.muted} /> : null)}
    </Pressable>
  );
}
export function Divider() { const { c } = useTheme(); return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />; }

/* ---------- Sheet / dialog / toast ---------- */
export function Sheet({ visible, onClose, title, children, tall }: { visible: boolean; onClose: () => void; title?: string; children?: React.ReactNode; tall?: boolean }) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={S.close} style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <View style={{ backgroundColor: c.bg, borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl, paddingBottom: insets.bottom + 12, maxHeight: '88%', height: tall ? '88%' : undefined }}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}><View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: c.line }} /></View>
        {title ? <View style={{ paddingHorizontal: SPACING.lg, paddingTop: 6 }}><UText size={21} color={c.primary}>{title}</UText></View> : null}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

/** Mount once at the app root. Driven by confirmDialog() / toast() from stores/ui. */
export function OverlayHost() {
  const { c } = useTheme();
  const dialog = useUi((s) => s.dialog);
  const toast = useUi((s) => s.toast);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: toast ? 1 : 0, duration: 180, useNativeDriver: true }).start(); }, [toast, fade]);
  const tone = toast?.kind === 'error' ? c.danger : toast?.kind === 'ok' ? c.success : c.ink;
  return (
    <>
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => dialog?.resolve(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 380, backgroundColor: c.surface, borderRadius: RADII.xl, padding: 22, gap: 18 }}>
            <UText size={18} center>{dialog?.message}</UText>
            <Row gap={10}>
              <Button label={dialog?.okLabel ?? ''} variant={dialog?.danger ? 'danger' : 'primary'} onPress={() => dialog?.resolve(true)} style={{ flex: 1 }} />
              {dialog?.cancelLabel ? <Button label={dialog.cancelLabel} variant="ghost" onPress={() => dialog?.resolve(false)} style={{ flex: 1 }} /> : null}
            </Row>
          </View>
        </View>
      </Modal>
      {toast ? (
        <Animated.View accessibilityLiveRegion="polite" pointerEvents="none" style={{ position: 'absolute', bottom: 112, alignSelf: 'center', opacity: fade, maxWidth: '90%', flexDirection: ROW, alignItems: 'center', gap: 8, backgroundColor: tone, borderRadius: RADII.pill, paddingHorizontal: 18, paddingVertical: 6, ...SHADOW }}>
          <Icon name={toast.kind === 'error' ? 'alert-circle' : toast.kind === 'ok' ? 'checkmark-circle' : 'information-circle'} size={20} color="#FFFFFF" />
          <UText size={15} color="#FFFFFF" center spacing={1.6}>{toast.text}</UText>
        </Animated.View>
      ) : null}
    </>
  );
}

/** Horizontal scroller whose first item sits on the RIGHT (RTL), with or without the native RTL flag. */
export function HScroll({ children, gap = SPACING.sm, padH = 0 }: { children?: React.ReactNode; gap?: number; padH?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexDirection: ROW, gap, alignItems: 'center', flexGrow: 1, paddingHorizontal: padH }}>{children}</ScrollView>
  );
}

export const dismissKeyboard = () => Keyboard.dismiss();
export { S };
