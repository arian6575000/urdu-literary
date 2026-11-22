import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Chip, Field, HScroll, Icon, Muted, Row, Segmented, Slider, SwitchRow, UText } from '../../components/design-system';
import { useTheme } from '../../hooks/useTheme';
import { confirmDialog, toast } from '../../stores/ui';
import { hexToHsv, hsvToHex, normalizeHex } from '../../utils/color';
import { pickCardImage } from '../../services/cardExport';
import { Art } from './CardArt';
import { CardCanvas } from './CardCanvas';
import { dividerPrims, motifPrims } from './art';
import { useCard, useCardApi } from './context';
import { CARD_FONTS } from './fonts';
import { bgMid } from './store';
import { TEMPLATES, applyTemplate } from './templates';
import { CS } from './strings';
import { RATIOS, canvasSize, exportPixels, type Align, type CardDesign, type DecorId, type DividerId, type FrameId, type LayoutId, type MotifId, type MotifPos, type PatternId, type Ratio, type TextureId } from './types';
import { urduDigits } from '../../utils/text';

const TEXT_COLORS = ['#1B1730', '#3B2A1A', '#FFFFFF', '#F6E7B4', '#D4AF37', '#C2255C', '#6A3DD1', '#077A7B', '#7A1F3D', '#D6DCEB', '#2B1B00', '#F2B01E'];
const SOLIDS = ['#FFFFFF', '#FAF5EA', '#F7F0DF', '#FFE3EA', '#E4EEF2', '#E8F7EE', '#EFE6FF', '#FFF1D6', '#FFB703', '#FF7A59', '#E0569D', '#6A3DD1', '#0A8587', '#0B5D5E', '#1A1B3A', '#14111F'];
const GRADS: [string, string][] = [['#6A3DD1', '#E0569D'], ['#1A1B3A', '#3A1C6B'], ['#FFD166', '#FF9F1C'], ['#FFE3EA', '#FFC2D1'], ['#232A3B', '#0F1320'], ['#0B5D5E', '#35C28F'], ['#3D9BE9', '#6A3DD1'], ['#FF7A59', '#F2B01E'], ['#F7F0DF', '#E8D3A5'], ['#14111F', '#6A3DD1']];
const num = (n: number) => urduDigits(n);

const Label = ({ children }: { children: string }) => <UText size={15} color={useTheme().c.primary} spacing={1.6}>{children}</UText>;

function Swatch({ color, active, onPress }: { color: string; active?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={color} accessibilityState={{ selected: !!active }} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color, borderWidth: active ? 3 : 1, borderColor: active ? c.primary : c.line, alignItems: 'center', justifyContent: 'center' }}>{active ? <Icon name="checkmark" size={18} color={hexToHsv(color).v > 0.6 && hexToHsv(color).s < 0.5 ? '#1B1730' : '#FFFFFF'} /> : null}</Pressable>;
}
function Swatches({ list, value, onPick }: { list: string[]; value: string; onPick: (c: string) => void }) {
  return <Row wrap gap={10}>{list.map((x) => <Swatch key={x} color={x} active={x.toLowerCase() === value.toLowerCase()} onPress={() => onPick(x)} />)}</Row>;
}
function Choice<T extends string>({ items, value, onPick }: { items: { id: T; label: string }[]; value: T; onPick: (v: T) => void }) {
  return <Row wrap gap={8}>{items.map((i) => <Chip key={i.id} label={i.label} active={value === i.id} onPress={() => onPick(i.id)} />)}</Row>;
}

/* ---------- custom colour picker (hue / saturation / brightness + hex) ---------- */
function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { c } = useTheme();
  const hsv = useMemo(() => hexToHsv(value), [value]);
  const [hex, setHex] = useState(value);
  React.useEffect(() => setHex(value), [value]);
  const set = (h: number, s: number, v: number) => onChange(hsvToHex(h, s, v));
  return (
    <View style={{ gap: 4 }}>
      <Row gap={12}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: value, borderWidth: 1, borderColor: c.line }} />
        <View style={{ flex: 1 }}><Field ltr label={CS.hex} value={hex} autoCapitalize="characters" maxLength={7} onChangeText={(t) => { setHex(t); const n = normalizeHex(t); if (n) onChange(n); }} /></View>
      </Row>
      <Slider label={CS.hue} value={Math.round(hsv.h)} min={0} max={360} onChange={(h) => set(h, Math.max(hsv.s, 0.05), Math.max(hsv.v, 0.05))} />
      <Slider label={CS.sat} value={Math.round(hsv.s * 100)} min={0} max={100} onChange={(s) => set(hsv.h, s / 100, hsv.v)} />
      <Slider label={CS.val} value={Math.round(hsv.v * 100)} min={0} max={100} onChange={(v) => set(hsv.h, hsv.s, v / 100)} />
    </View>
  );
}

/* ---------- متن ---------- */
export function TextPanel() {
  const d = useCard((s) => s.design); const api = useCardApi();
  const up = (p: Partial<CardDesign>, k?: string) => api.update(p, k);
  return (
    <View style={{ gap: 12 }}>
      <Field label={CS.body} value={d.text} multiline onChangeText={(t) => up({ text: t }, 'text')} style={{ minHeight: 96 }} />
      <Field label={CS.titleF} value={d.title} onChangeText={(t) => up({ title: t, showTitle: t.trim().length > 0 || d.showTitle }, 'title')} />
      <SwitchRow label={CS.showTitle} value={d.showTitle} onChange={(v) => up({ showTitle: v })} />
      <Field label={CS.poetF} value={d.poet} onChangeText={(t) => up({ poet: t }, 'poet')} />
      <SwitchRow label={CS.showPoet} value={d.showPoet} onChange={(v) => up({ showPoet: v })} />
      <Label>{CS.font}</Label>
      <HScroll gap={8}>{CARD_FONTS.map((f) => <FontChip key={f.id} id={f.id} name={f.name} family={f.family} active={d.font === f.id} onPress={() => up({ font: f.id })} />)}</HScroll>
      <Slider label={CS.size} value={d.fontSize} min={12} max={64} onChange={(v) => up({ fontSize: v }, 'size')} format={num as any} />
      <Slider label={CS.lineH} value={d.lineHeight} min={1.2} max={3.4} step={0.1} onChange={(v) => up({ lineHeight: v }, 'lh')} format={(v) => num(+v.toFixed(1))} />
      <Slider label={CS.letterS} value={d.letterSpacing} min={0} max={3} step={0.25} onChange={(v) => up({ letterSpacing: v }, 'ls')} format={(v) => num(v)} />
      <Muted>{CS.letterHint}</Muted>
      <Label>{CS.align}</Label>
      <Choice<Align> items={[{ id: 'right', label: CS.right }, { id: 'center', label: CS.center }, { id: 'left', label: CS.left }]} value={d.align} onPick={(v) => up({ align: v })} />
      <Label>{CS.textColor}</Label>
      <Swatches list={TEXT_COLORS} value={d.textColor} onPick={(x) => up({ textColor: x })} />
    </View>
  );
}
function FontChip({ name, family, active, onPress }: { id: string; name: string; family: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: active }} onPress={onPress} style={{ minWidth: 92, minHeight: 64, paddingHorizontal: 12, borderRadius: 16, borderWidth: active ? 2.5 : 1, borderColor: active ? c.primary : c.line, backgroundColor: active ? c.primarySoft : c.surface, alignItems: 'center', justifyContent: 'center' }}>
      <UText size={22} center style={{ fontFamily: family, lineHeight: 44 }}>دل کی بات</UText>
      <UText size={12} color={c.muted} center spacing={1.4}>{name}</UText>
    </Pressable>
  );
}

/* ---------- ڈیزائن ---------- */
export function DesignPanel() {
  const d = useCard((s) => s.design); const api = useCardApi(); const { c } = useTheme();
  const up = (p: Partial<CardDesign>, k?: string) => api.update(p, k);
  return (
    <View style={{ gap: 12 }}>
      <Label>{CS.templates}</Label>
      <HScroll gap={10}>
        {TEMPLATES.map((t) => <TemplateThumb key={t.id} id={t.id} name={t.name} base={d} active={d.templateId === t.id} onPress={() => api.setTemplate(t.id)} />)}
      </HScroll>
      <Label>{CS.layout}</Label>
      <Choice<LayoutId> items={[{ id: 'center', label: CS.lCenter }, { id: 'top', label: CS.lTop }, { id: 'bottom', label: CS.lBottom }, { id: 'spread', label: CS.lSpread }]} value={d.layout} onPick={(v) => up({ layout: v })} />
      <Label>{CS.dims}</Label>
      <HScroll gap={8}>
        {RATIOS.map((r) => { const px = exportPixels(r.id); const on = d.ratio === r.id; return (
          <Pressable key={r.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => up({ ratio: r.id as Ratio })} style={{ minWidth: 88, minHeight: 76, borderRadius: 16, borderWidth: on ? 2.5 : 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primarySoft : c.surface, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <View style={{ width: 30 * (r.w >= r.h ? 1 : r.w / r.h), height: 30 * (r.h >= r.w ? 1 : r.h / r.w), borderWidth: 2, borderColor: on ? c.primary : c.muted, borderRadius: 3 }} />
            <UText size={13} center spacing={1.4}>{r.label}</UText>
            <UText size={10} color={c.muted} center spacing={1.2}>{`${px.w}×${px.h}`}</UText>
          </Pressable>); })}
      </HScroll>
      <Slider label={CS.padding} value={d.padding} min={8} max={90} onChange={(v) => up({ padding: v }, 'pad')} format={num as any} />
      <Slider label={CS.radius} value={d.radius} min={0} max={48} onChange={(v) => up({ radius: v }, 'rad')} format={num as any} />
      <Slider label={CS.offY} value={d.offsetY} min={-120} max={120} onChange={(v) => up({ offsetY: v }, 'oy')} format={num as any} />
      <Slider label={CS.offX} value={d.offsetX} min={-80} max={80} onChange={(v) => up({ offsetX: v }, 'ox')} format={num as any} />
      <SwitchRow icon="contrast-outline" label={CS.shadow} value={d.textShadow} onChange={(v) => up({ textShadow: v })} />
      <Button small variant="ghost" icon="refresh" label={CS.reset} onPress={async () => { if (await confirmDialog(CS.confirmReset, { danger: true, okLabel: CS.reset })) api.resetDesign(); }} />
    </View>
  );
}
function TemplateThumb({ id, name, base, active, onPress }: { id: string; name: string; base: CardDesign; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const look = useMemo(() => ({ ...applyTemplate({ ...base, ratio: '4:5' }, id), image: { ...base.image, uri: null } }), [id, base.text, base.title, base.poet, base.showTitle, base.showPoet]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: active }} onPress={onPress} style={{ alignItems: 'center', gap: 2 }}>
      <View style={{ borderRadius: 10, borderWidth: active ? 3 : 1, borderColor: active ? c.primary : c.line, overflow: 'hidden' }}><CardCanvas design={look} scale={0.3} /></View>
      <UText size={12} color={active ? c.primary : c.muted} center spacing={1.4}>{name}</UText>
    </Pressable>
  );
}

/* ---------- رنگ ---------- */
type Tgt = 'text' | 'bg' | 'accent' | 'from' | 'to';
export function ColorPanel() {
  const d = useCard((s) => s.design); const api = useCardApi(); const { c } = useTheme();
  const [tgt, setTgt] = useState<Tgt>('bg');
  const grad = d.bg.kind === 'gradient';
  const cur = tgt === 'text' ? d.textColor : tgt === 'accent' ? d.accent : tgt === 'from' ? (grad ? (d.bg as any).from : bgMid(d.bg)) : tgt === 'to' ? (grad ? (d.bg as any).to : bgMid(d.bg)) : bgMid(d.bg);
  const apply = (hex: string, k = 'color') => {
    if (tgt === 'text') api.update({ textColor: hex }, k);
    else if (tgt === 'accent') api.update({ accent: hex }, k);
    else if (tgt === 'bg') api.setBg({ kind: 'solid', color: hex }, k);
    else api.setBg(grad ? { ...(d.bg as any), [tgt === 'from' ? 'from' : 'to']: hex } : { kind: 'gradient', from: tgt === 'from' ? hex : (d.bg as any).color, to: tgt === 'to' ? hex : (d.bg as any).color, dir: 'd' }, k);
  };
  const list = tgt === 'text' || tgt === 'accent' ? TEXT_COLORS : SOLIDS;
  const tgts: { id: Tgt; label: string }[] = [{ id: 'bg', label: CS.tgBg }, { id: 'text', label: CS.tgText }, { id: 'accent', label: CS.tgAccent }, { id: 'from', label: CS.tgFrom }, { id: 'to', label: CS.tgTo }];
  return (
    <View style={{ gap: 12 }}>
      <Label>{CS.target}</Label>
      <HScroll gap={8}>{tgts.map((t) => <Chip key={t.id} label={t.label} active={tgt === t.id} onPress={() => setTgt(t.id)} />)}</HScroll>
      <Label>{CS.presets}</Label>
      <Swatches list={list} value={cur} onPick={(x) => apply(x, 'pre')} />
      {tgt === 'bg' || tgt === 'from' || tgt === 'to' ? (
        <>
          <Label>{CS.gradients}</Label>
          <HScroll gap={10}>
            {GRADS.map(([a, b]) => { const on = d.bg.kind === 'gradient' && d.bg.from === a && d.bg.to === b; return (
              <Pressable key={a + b} accessibilityRole="button" accessibilityLabel={`${a} ${b}`} onPress={() => api.setBg({ kind: 'gradient', from: a, to: b, dir: 'd' })} style={{ width: 64, height: 64, borderRadius: 16, borderWidth: on ? 3 : 1, borderColor: on ? c.primary : c.line, overflow: 'hidden', flexDirection: 'column' }}>
                <View style={{ flex: 1, backgroundColor: a }} /><View style={{ flex: 1, backgroundColor: b }} />
              </Pressable>); })}
          </HScroll>
          {grad ? <Choice<'v' | 'd' | 'h'> items={[{ id: 'v', label: 'عمودی' }, { id: 'd', label: 'ترچھا' }, { id: 'h', label: 'افقی' }]} value={(d.bg as any).dir} onPick={(v) => api.setBg({ ...(d.bg as any), dir: v })} /> : null}
        </>
      ) : null}
      <Label>{CS.custom}</Label>
      <ColorPicker value={cur} onChange={(h) => apply(h, 'pick')} />
    </View>
  );
}

/* ---------- پس منظر ---------- */
export function BackgroundPanel({ goImage }: { goImage: () => void }) {
  const d = useCard((s) => s.design); const api = useCardApi();
  const up = (p: Partial<CardDesign>, k?: string) => api.update(p, k);
  const pats: { id: PatternId; label: string }[] = [{ id: 'none', label: CS.none }, { id: 'dots', label: CS.pDots }, { id: 'lines', label: CS.pLines }, { id: 'grid', label: CS.pGrid }, { id: 'diamonds', label: CS.pDiamonds }, { id: 'khatam', label: CS.pKhatam }, { id: 'waves', label: CS.pWaves }];
  const texs: { id: TextureId; label: string }[] = [{ id: 'none', label: CS.none }, { id: 'paper', label: CS.xPaper }, { id: 'linen', label: CS.xLinen }, { id: 'grain', label: CS.xGrain }];
  const decs: { id: DecorId; label: string }[] = [{ id: 'none', label: CS.none }, { id: 'night', label: CS.dNight }, { id: 'dunes', label: CS.dDunes }, { id: 'arches', label: CS.dArches }, { id: 'petals', label: CS.dPetals }, { id: 'rays', label: CS.dRays }];
  return (
    <View style={{ gap: 12 }}>
      <Label>{CS.patterns}</Label>
      <Choice<PatternId> items={pats} value={d.pattern} onPick={(v) => up({ pattern: v })} />
      {d.pattern !== 'none' ? <Slider label={CS.patOpacity} value={Math.round(d.patternOpacity * 100)} min={4} max={60} onChange={(v) => up({ patternOpacity: v / 100 }, 'po')} format={num as any} /> : null}
      <Label>{CS.textures}</Label>
      <Choice<TextureId> items={texs} value={d.texture} onPick={(v) => up({ texture: v })} />
      <Label>{CS.decors}</Label>
      <Choice<DecorId> items={decs} value={d.decor} onPick={(v) => up({ decor: v })} />
      <Button small variant="soft" icon="image-outline" label={CS.imgPick} onPress={goImage} />
    </View>
  );
}

/* ---------- سجاوٹ ---------- */
function ArtChip({ label, active, onPress, prims, w, h }: { label: string; active: boolean; onPress: () => void; prims: any[]; w: number; h: number }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={{ minWidth: 76, minHeight: 72, paddingHorizontal: 8, borderRadius: 14, borderWidth: active ? 2.5 : 1, borderColor: active ? c.primary : c.line, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      {prims.length ? <Art prims={prims} w={w} h={h} scale={0.45} /> : <Icon name="ban-outline" size={20} color={c.muted} />}
      <UText size={12} center spacing={1.4}>{label}</UText>
    </Pressable>
  );
}
export function DecorPanel() {
  const d = useCard((s) => s.design); const api = useCardApi();
  const up = (p: Partial<CardDesign>) => api.update(p);
  const acc = '#6A3DD1';
  const frames: { id: FrameId; label: string }[] = [{ id: 'none', label: CS.none }, { id: 'single', label: CS.fSingle }, { id: 'double', label: CS.fDouble }, { id: 'corners', label: CS.fCorners }, { id: 'ornate', label: CS.fOrnate }, { id: 'arch', label: CS.fArch }];
  const divs: { id: DividerId; label: string }[] = [{ id: 'none', label: CS.none }, { id: 'line', label: CS.dvLine }, { id: 'dots', label: CS.dvDots }, { id: 'diamond', label: CS.dvDiamond }, { id: 'flourish', label: CS.dvFlourish }];
  const mots: { id: MotifId; label: string }[] = [{ id: 'none', label: CS.none }, { id: 'crescent', label: CS.mCrescent }, { id: 'khatam', label: CS.mKhatam }, { id: 'flower', label: CS.mFlower }, { id: 'leaf', label: CS.mLeaf }, { id: 'moonstars', label: CS.mMoon }, { id: 'pen', label: CS.mPen }];
  return (
    <View style={{ gap: 12 }}>
      <Label>{CS.frames}</Label>
      <Choice<FrameId> items={frames} value={d.frame} onPick={(v) => up({ frame: v })} />
      <Label>{CS.dividers}</Label>
      <HScroll gap={8}>{divs.map((x) => <ArtChip key={x.id} label={x.label} active={d.divider === x.id} onPress={() => up({ divider: x.id })} prims={dividerPrims(x.id, 160, acc)} w={160} h={18} />)}</HScroll>
      <Label>{CS.motifs}</Label>
      <HScroll gap={8}>{mots.map((x) => <ArtChip key={x.id} label={x.label} active={d.motif === x.id} onPress={() => up({ motif: x.id })} prims={motifPrims(x.id, 52, acc)} w={52} h={52} />)}</HScroll>
      {d.motif !== 'none' ? <Choice<MotifPos> items={[{ id: 'top', label: CS.pTop }, { id: 'bottom', label: CS.pBottom }, { id: 'corners', label: CS.pCorners }]} value={d.motifPos} onPick={(v) => up({ motifPos: v })} /> : null}
    </View>
  );
}

/* ---------- تصویر ---------- */
export function ImagePanel() {
  const d = useCard((s) => s.design); const api = useCardApi();
  const img = d.image;
  const set = (p: Partial<CardDesign['image']>, k?: string) => api.update({ image: { ...img, ...p } }, k);
  const pick = async () => { try { const uri = await pickCardImage(); if (uri) set({ uri }); } catch { toast(CS.imgFail, 'error'); } };
  return (
    <View style={{ gap: 12 }}>
      {!img.uri ? <><Muted>{CS.imgHint}</Muted><Button icon="image-outline" label={CS.imgPick} onPress={pick} /></> : (
        <>
          <Row gap={8}><Button small variant="soft" icon="swap-horizontal" label={CS.imgReplace} onPress={pick} style={{ flex: 1 }} /><Button small variant="ghost" icon="trash-outline" label={CS.imgRemove} onPress={async () => { if (await confirmDialog(CS.confirmRemoveImg, { danger: true, okLabel: CS.imgRemove })) set({ uri: null }); }} style={{ flex: 1 }} /></Row>
          <Label>{CS.imgMode}</Label>
          <Choice<'background' | 'inset'> items={[{ id: 'background', label: CS.imBg }, { id: 'inset', label: CS.imInset }]} value={img.mode} onPick={(v) => set({ mode: v })} />
          <Slider label={CS.opacity} value={Math.round(img.opacity * 100)} min={10} max={100} onChange={(v) => set({ opacity: v / 100 }, 'io')} format={(v) => `${num(v)}٪`} />
          <Slider label={CS.zoomS} value={img.zoom} min={1} max={3} step={0.05} onChange={(v) => set({ zoom: v }, 'iz')} format={(v) => num(+v.toFixed(2))} />
          <Slider label={CS.posX} value={img.x} min={-50} max={50} onChange={(v) => set({ x: v }, 'ix')} format={num as any} />
          <Slider label={CS.posY} value={img.y} min={-50} max={50} onChange={(v) => set({ y: v }, 'iy')} format={num as any} />
          {img.mode === 'background' ? <Slider label={CS.dim} value={Math.round(img.dim * 100)} min={0} max={80} onChange={(v) => set({ dim: v / 100 }, 'id')} format={(v) => `${num(v)}٪`} /> : null}
        </>
      )}
    </View>
  );
}
void canvasSize;
