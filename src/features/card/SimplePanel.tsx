import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Field, HScroll, Icon, Row, UText, type IconName } from '../../components/design-system';
import { useTheme } from '../../hooks/useTheme';
import { urduDigits } from '../../utils/text';
import { CardCanvas } from './CardCanvas';
import { useCard, useCardApi } from './context';
import { TEMPLATES, applyTemplate } from './templates';
import type { CardDesign, Ratio } from './types';

/** Easy mode for older / first-time users: 4 big steps, big buttons, big text, very few choices. Uses the same store as the full editor. */
export const EASY_STEPS: { title: string; icon: IconName }[] = [
  { title: 'سانچہ چنیں', icon: 'albums-outline' }, { title: 'متن لکھیں', icon: 'create-outline' },
  { title: 'رنگ چنیں', icon: 'color-palette-outline' }, { title: 'تیار! شیئر کریں', icon: 'share-social-outline' },
];
const BG = ['#FFFFFF', '#F7F0DF', '#FFE3EA', '#E8F7EE', '#FFF1D6', '#0B5D5E', '#1A1B3A', '#6A3DD1'];
const INK = ['#1B1730', '#3B2A1A', '#FFFFFF', '#F6E7B4', '#7A1F3D', '#0B5D5E'];
const SIZES: { id: Ratio; label: string }[] = [{ id: '1:1', label: 'چوکور' }, { id: '4:5', label: 'پوسٹ' }, { id: '9:16', label: 'اسٹوری' }];

export function BigButton({ label, icon, onPress, tone = 'primary', disabled, busy, flex }: { label: string; icon?: IconName; onPress: () => void; tone?: 'primary' | 'teal' | 'soft' | 'ghost'; disabled?: boolean; busy?: boolean; flex?: boolean }) {
  const { c } = useTheme();
  const bg = tone === 'primary' ? c.primary : tone === 'teal' ? c.secondary : tone === 'soft' ? c.primarySoft : 'transparent';
  const fg = tone === 'primary' ? c.onPrimary : tone === 'teal' ? c.onSecondary : c.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label || 'واپس کریں'} disabled={disabled || busy} onPress={onPress}
      style={({ pressed }) => [{ minHeight: 64, borderRadius: 20, paddingHorizontal: 18, backgroundColor: bg, borderWidth: tone === 'ghost' ? 2 : 0, borderColor: c.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, flex ? { flex: 1 } : null]}>
      {icon ? <Icon name={icon} size={28} color={fg} /> : null}
      {label || busy ? <UText size={21} color={fg} center spacing={1.6}>{busy ? '…' : label}</UText> : null}
    </Pressable>
  );
}

function Pick({ on, children, onPress, label }: { on: boolean; children: React.ReactNode; onPress: () => void; label: string }) {
  const { c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: on ? 4 : 1, borderColor: on ? c.primary : c.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{children}</Pressable>;
}

function Thumb({ id, name, base, active, onPress }: { id: string; name: string; base: CardDesign; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const look = useMemo(() => ({ ...applyTemplate({ ...base, ratio: '4:5' }, id), image: { ...base.image, uri: null } }), [id, base.text, base.title, base.poet, base.showTitle, base.showPoet]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: active }} onPress={onPress} style={{ alignItems: 'center', gap: 2 }}>
      <View style={{ borderRadius: 14, borderWidth: active ? 5 : 1, borderColor: active ? c.primary : c.line, overflow: 'hidden' }}><CardCanvas design={look} scale={0.42} /></View>
      <UText size={17} color={active ? c.primary : c.text} center spacing={1.6}>{name}</UText>
    </Pressable>
  );
}

export function EasyBody({ step }: { step: number }) {
  const d = useCard((s) => s.design); const api = useCardApi(); const { c } = useTheme();
  const bgColor = d.bg.kind === 'solid' ? d.bg.color.toLowerCase() : '';
  const size = (delta: number) => api.update({ fontSize: Math.max(16, Math.min(56, d.fontSize + delta)) }, 'size');
  if (step === 0) return (
    <View style={{ gap: 10 }}>
      <UText size={18} color={c.muted} spacing={1.7}>اپنی پسند کے سانچے پر انگلی رکھیں</UText>
      <HScroll gap={14}>{TEMPLATES.map((t) => <Thumb key={t.id} id={t.id} name={t.name} base={d} active={d.templateId === t.id} onPress={() => api.setTemplate(t.id)} />)}</HScroll>
    </View>
  );
  if (step === 1) return (
    <View style={{ gap: 12 }}>
      <Field label="شعر یا تحریر" value={d.text} multiline onChangeText={(t) => api.update({ text: t }, 'text')} style={{ minHeight: 110, fontSize: 22 }} />
      <Field label="شاعر کا نام" value={d.poet} onChangeText={(t) => api.update({ poet: t, showPoet: t.trim().length > 0 }, 'poet')} style={{ fontSize: 22 }} />
      <UText size={18} color={c.muted} spacing={1.7}>لکھائی کا سائز</UText>
      <Row gap={12}>
        <BigButton flex tone="soft" icon="remove" label="چھوٹا" onPress={() => size(-2)} />
        <View style={{ minWidth: 64, alignItems: 'center' }}><UText size={24} color={c.primary} center>{urduDigits(d.fontSize)}</UText></View>
        <BigButton flex tone="soft" icon="add" label="بڑا" onPress={() => size(2)} />
      </Row>
    </View>
  );
  if (step === 2) return (
    <View style={{ gap: 12 }}>
      <UText size={19} color={c.primary} spacing={1.7}>پس منظر کا رنگ</UText>
      <Row wrap gap={12}>{BG.map((x) => <Pick key={x} label={x} on={bgColor === x.toLowerCase()} onPress={() => api.setBg({ kind: 'solid', color: x })}><View style={{ flex: 1, alignSelf: 'stretch', backgroundColor: x, alignItems: 'center', justifyContent: 'center' }}>{bgColor === x.toLowerCase() ? <Icon name="checkmark" size={26} color={x === '#FFFFFF' || x === '#F7F0DF' || x === '#FFE3EA' || x === '#E8F7EE' || x === '#FFF1D6' ? '#1B1730' : '#FFFFFF'} /> : null}</View></Pick>)}</Row>
      <UText size={19} color={c.primary} spacing={1.7}>لکھائی کا رنگ</UText>
      <Row wrap gap={12}>{INK.map((x) => <Pick key={x} label={x} on={d.textColor.toLowerCase() === x.toLowerCase()} onPress={() => api.update({ textColor: x })}><View style={{ flex: 1, alignSelf: 'stretch', backgroundColor: x, alignItems: 'center', justifyContent: 'center' }}>{d.textColor.toLowerCase() === x.toLowerCase() ? <Icon name="checkmark" size={26} color={x === '#1B1730' || x === '#3B2A1A' || x === '#7A1F3D' || x === '#0B5D5E' ? '#FFFFFF' : '#1B1730'} /> : null}</View></Pick>)}</Row>
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
      <UText size={19} color={c.primary} spacing={1.7}>کارڈ کا سائز</UText>
      <Row gap={10}>{SIZES.map((s) => { const on = d.ratio === s.id; return <Pressable key={s.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => api.update({ ratio: s.id })} style={{ flex: 1, minHeight: 60, borderRadius: 18, borderWidth: on ? 4 : 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primarySoft : c.surface, alignItems: 'center', justifyContent: 'center' }}><UText size={19} color={on ? c.primary : c.text} center>{s.label}</UText></Pressable>; })}</Row>
    </View>
  );
}

export { ScrollView };
