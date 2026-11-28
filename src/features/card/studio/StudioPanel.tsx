import React, { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Chip, Field, HScroll, Icon, IconButton, Muted, Row, Segmented, Slider, SwitchRow, UText, type IconName } from '../../../components/design-system';
import { useTheme } from '../../../hooks/useTheme';
import { pickCardImage } from '../../../services/cardExport';
import { confirmDialog, toast } from '../../../stores/ui';
import { hexToHsv, normalizeHex, withAlpha } from '../../../utils/color';
import { excerpt } from '../../../utils/text';
import { useCard, useCardApi } from '../context';
import { centerH, centerV, makeImage, makeLine, makeShape, makeSvg, makeText, type DesignElement, type ShapeKind } from '../elements';
import { CARD_FONTS } from '../fonts';
import { adjustRunsForEdit, aerabSpans, restyle, runSegments, wordSpans, type RunPatch, type RunStyle } from '../runs';
import { SHADOW_PRESETS, makeSherElements, splitCouplets } from '../textStudio';
import { canvasSize } from '../types';
import { ORNAMENTS, type Ornament } from './assets';
import { ST } from './strings';

export type StudioTab = 'add' | 'edit' | 'layers';
interface Props { tab: StudioTab; setTab: (t: StudioTab) => void; selId: string | null; setSelId: (id: string | null) => void; height: number }

const PALETTE = ['#1B1730', '#3B2A1A', '#FFFFFF', '#F6E7B4', '#D4AF37', '#B8860B', '#C2255C', '#E0569D', '#6A3DD1', '#3D9BE9', '#077A7B', '#35C28F', '#FFB703', '#FF7A59', '#7A1F3D', '#14111F'];
const KIND_ICON: Record<DesignElement['kind'], IconName> = { text: 'text', shape: 'shapes-outline', line: 'remove-outline', svg: 'flower-outline', image: 'image-outline', unknown: 'help-outline' };
const elLabel = (e: DesignElement) => e.name || (e.kind === 'text' ? excerpt(e.text, 22) || ST.kind.text : e.kind === 'shape' ? ST.add[e.shape] : ST.kind[e.kind]);

/** Advanced Studio tools: add elements, edit the selected one, manage layers. Every change goes through the shared undoable store. */
export function StudioPanel({ tab, setTab, selId, setSelId, height }: Props) {
  const { c } = useTheme();
  const tabs: { id: StudioTab; label: string; icon: IconName }[] = [{ id: 'add', label: ST.tabs.add, icon: 'add-circle-outline' }, { id: 'edit', label: ST.tabs.edit, icon: 'options-outline' }, { id: 'layers', label: ST.tabs.layers, icon: 'layers-outline' }];
  return (
    <View>
      <Row gap={4} style={{ paddingHorizontal: 8, justifyContent: 'space-between' }}>
        {tabs.map((t) => { const on = tab === t.id; return (
          <Pressable key={t.id} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => setTab(t.id)} style={{ flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : 'transparent' }}>
            <Icon name={t.icon} size={20} color={on ? c.onPrimary : c.muted} /><UText size={11} color={on ? c.onPrimary : c.muted} center spacing={1.3}>{t.label}</UText>
          </Pressable>); })}
      </Row>
      <ScrollView style={{ height }} keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}>
        {tab === 'add' ? <AddTab setSelId={setSelId} setTab={setTab} /> : tab === 'edit' ? <EditTab selId={selId} setSelId={setSelId} /> : <LayersTab selId={selId} setSelId={setSelId} setTab={setTab} />}
      </ScrollView>
    </View>
  );
}

/* ---------------------------------------------------------------- add */
function AddTab({ setSelId, setTab }: { setSelId: (id: string) => void; setTab: (t: StudioTab) => void }) {
  const { c } = useTheme();
  const api = useCardApi();
  const ratio = useCard((s) => s.design.ratio);
  const accent = useCard((s) => s.design.accent);
  const textColor = useCard((s) => s.design.textColor);
  const font = useCard((s) => s.design.font);
  const baseText = useCard((s) => s.design.text);
  const cv = canvasSize(ratio);
  const place = (el: DesignElement) => {
    const e = { ...el, x: centerH(el, cv.w), y: centerV(el, cv.h) } as DesignElement;
    api.addElement(e); setSelId(e.id); setTab('edit');
  };
  const sher = () => {
    const [couplet] = splitCouplets(baseText);
    const els = makeSherElements(couplet ?? [ST.add.sherSample[0], ST.add.sherSample[1]], { cw: cv.w, ch: cv.h, font, color: textColor });
    api.addElements(els); setSelId(els[0].id); setTab('edit');
  };
  const shape = (shape: ShapeKind, w = 110, h = 110) => place(makeShape({ shape, w, h, fill: accent }));
  const tiles: { label: string; icon: IconName; run: () => void }[] = [
    { label: ST.add.text, icon: 'text', run: () => place(makeText({ text: ST.add.textSample, font, color: textColor, fontSize: 28, w: 240, h: 80 })) },
    { label: ST.add.sher, icon: 'reorder-two-outline', run: sher },
    { label: ST.add.rect, icon: 'square-outline', run: () => shape('rect', 150, 100) },
    { label: ST.add.ellipse, icon: 'ellipse-outline', run: () => shape('ellipse') },
    { label: ST.add.triangle, icon: 'triangle-outline', run: () => shape('triangle') },
    { label: ST.add.diamond, icon: 'diamond-outline', run: () => shape('diamond') },
    { label: ST.add.star, icon: 'star-outline', run: () => shape('star') },
    { label: ST.add.line, icon: 'remove-outline', run: () => place(makeLine({ stroke: accent, w: 200, h: 14, strokeWidth: 3 })) },
    { label: ST.add.arrow, icon: 'arrow-forward-outline', run: () => place(makeLine({ stroke: accent, w: 200, h: 24, strokeWidth: 3, arrow: true })) },
    { label: ST.add.image, icon: 'image-outline', run: async () => {
      const uri = await pickCardImage().catch(() => null);
      if (!uri) return;
      const size = await new Promise<{ w: number; h: number }>((res) => Image.getSize(uri, (w, h) => res({ w, h }), () => res({ w: 1, h: 1 })));
      const k = Math.min(240 / size.w, 240 / size.h); place(makeImage({ uri, w: Math.round(size.w * k) || 200, h: Math.round(size.h * k) || 200 }));
    } },
  ];
  return (
    <>
      <UText size={15} color={c.primary} spacing={1.6}>{ST.add.basics}</UText>
      <Row wrap gap={10}>
        {tiles.map((t) => (
          <Pressable key={t.label} accessibilityRole="button" accessibilityLabel={t.label} onPress={t.run} style={({ pressed }) => ({ width: 78, height: 78, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', gap: 2, opacity: pressed ? 0.7 : 1 })}>
            <Icon name={t.icon} size={26} color={c.primary} /><UText size={12} color={c.text} center spacing={1.4}>{t.label}</UText>
          </Pressable>
        ))}
      </Row>
      <UText size={15} color={c.primary} spacing={1.6}>{ST.add.ornaments}</UText>
      <Row wrap gap={10}>
        {ORNAMENTS.map((o) => (
          <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={o.name} onPress={() => place(ornamentEl(o, accent))} style={({ pressed }) => ({ width: o.viewBox[0] > o.viewBox[1] * 2 ? 118 : 78, height: 78, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Svg width={o.viewBox[0] > o.viewBox[1] * 2 ? 96 : 44} height={o.viewBox[0] > o.viewBox[1] * 2 ? 24 : 44} viewBox={`0 0 ${o.viewBox[0]} ${o.viewBox[1]}`}>
              {o.paths.map((d, i) => <Path key={i} d={d} fill={o.fill ? c.primary : 'none'} stroke={o.fill ? undefined : c.primary} strokeWidth={o.fill ? 0 : 4} strokeLinecap="round" strokeLinejoin="round" />)}
            </Svg>
            <UText size={11} color={c.muted} center spacing={1.3}>{o.name}</UText>
          </Pressable>
        ))}
      </Row>
      <Muted>{ST.add.tapToAdd}</Muted>
    </>
  );
}
const ornamentEl = (o: Ornament, color: string) => makeSvg({ paths: o.paths, viewBox: o.viewBox, w: o.w, h: o.h, name: o.name, fill: o.fill ? color : null, stroke: o.fill ? null : color, strokeWidth: o.fill ? 0 : 4 });

/* ---------------------------------------------------------------- edit */
type Sec = 'content' | 'style' | 'words' | 'effects' | 'color' | 'transform';

function EditTab({ selId, setSelId }: { selId: string | null; setSelId: (id: string | null) => void }) {
  const { c } = useTheme();
  const api = useCardApi();
  const elements = useCard((s) => s.design.elements);
  const ratio = useCard((s) => s.design.ratio);
  const [sec, setSec] = useState<Sec>('content');
  const el = elements.find((e) => e.id === selId);
  if (!el) return <Muted center>{ST.noSel}</Muted>;
  const cv = canvasSize(ratio);
  const patch = (p: Partial<DesignElement>, key?: string) => api.patchElement(el.id, p, key ? `${el.id}:${key}` : undefined);
  const secs: Sec[] = el.kind === 'text' ? ['content', 'style', 'words', 'effects', 'color', 'transform'] : el.kind === 'image' ? ['content', 'transform'] : ['color', 'transform'];
  const active = secs.includes(sec) ? sec : secs[0];
  const idx = elements.findIndex((e) => e.id === el.id);
  const remove = async () => { if (el.locked) { toast(ST.unlockFirst, 'error'); return; } if (await confirmDialog(ST.deleteAsk, { danger: true, okLabel: ST.act.delete })) { api.removeElement(el.id); setSelId(null); } };
  const sl = (label: string, key: string, min: number, max: number, step = 1, scale = 1, fmt?: (v: number) => string) => (
    <Slider label={label} value={Math.round(((el as any)[key] as number) * scale)} min={min} max={max} step={step} format={fmt} onChange={(v) => patch({ [key]: v / scale } as any, key)} />
  );
  const sw = (key: string, label: string, allowNone = false) => <ColorRow label={label} value={(el as any)[key] ?? null} allowNone={allowNone} onChange={(v) => patch({ [key]: v } as any, key)} />;

  return (
    <>
      <Row gap={0} style={{ justifyContent: 'space-between' }}>
        <Row gap={6}><Icon name={KIND_ICON[el.kind]} size={18} color={c.primary} /><UText size={15} color={c.primary} lines={1} spacing={1.6}>{elLabel(el)}</UText></Row>
        <Row gap={0}>
          <IconButton icon="copy-outline" label={ST.act.duplicate} onPress={() => { const id = api.duplicateElement(el.id); if (id) setSelId(id); }} />
          <IconButton icon={el.locked ? 'lock-closed' : 'lock-open-outline'} active={el.locked} label={el.locked ? ST.act.unlock : ST.act.lock} onPress={() => patch({ locked: !el.locked })} />
          <IconButton icon="eye-off-outline" label={ST.act.hide} onPress={() => patch({ visible: false })} />
          <IconButton icon="trash-outline" color={c.danger} label={ST.act.delete} onPress={remove} />
        </Row>
      </Row>
      {el.locked ? <Muted>{ST.locked}</Muted> : null}
      <Segmented<Sec> value={active} onChange={setSec} options={secs.map((s) => ({ id: s, label: ST.sec[s] }))} />

      {active === 'content' && el.kind === 'text' ? (
        <>
          <Field label={ST.f.text} multiline value={el.text} onChangeText={(t) => patch({ text: t, runs: adjustRunsForEdit(el.runs, el.text, t) }, 'text')} style={{ minHeight: 90 }} />
          <UText size={14} color={c.muted} spacing={1.5}>{ST.f.font}</UText>
          <HScroll>{CARD_FONTS.map((f) => <Chip key={f.id} label={f.name} active={el.font === f.id} onPress={() => patch({ font: f.id })} />)}</HScroll>
        </>
      ) : null}
      {active === 'content' && el.kind === 'image' ? (
        <>
          <Segmented<'cover' | 'contain'> value={el.fit} onChange={(fit) => patch({ fit })} options={[{ id: 'cover', label: ST.f.cover }, { id: 'contain', label: ST.f.contain }]} />
          {sl(ST.f.radius, 'radius', 0, 120)}
          <Chip label={ST.f.replace} icon="image-outline" onPress={async () => { const uri = await pickCardImage().catch(() => null); if (uri) patch({ uri } as any); else toast(ST.imgFail, 'error'); }} />
        </>
      ) : null}

      {active === 'style' && el.kind === 'text' ? (
        <>
          {sl(ST.f.size, 'fontSize', 8, 120)}
          {sl(ST.f.lineH, 'lineHeight', 10, 40, 1, 10, (v) => (v / 10).toFixed(1))}
          {sl(ST.f.letterSp, 'letterSpacing', -2, 20, 1)}
          <Segmented<'right' | 'center' | 'left'> value={el.align} onChange={(align) => patch({ align })} options={[{ id: 'right', label: ST.f.right }, { id: 'center', label: ST.f.center }, { id: 'left', label: ST.f.left }]} />
          <Segmented<'rtl' | 'ltr'> value={el.dir} onChange={(dir) => patch({ dir })} options={[{ id: 'rtl', label: ST.f.rtl }, { id: 'ltr', label: ST.f.ltr }]} />
          <UText size={14} color={c.muted} spacing={1.5}>{ST.tx.vAlign}</UText>
          <Segmented<'top' | 'middle' | 'bottom'> value={el.vAlign} onChange={(vAlign) => patch({ vAlign })} options={[{ id: 'top', label: ST.tx.top }, { id: 'middle', label: ST.tx.middle }, { id: 'bottom', label: ST.tx.bottom }]} />
          {sl(ST.f.padding, 'padding', 0, 60)}
          {sl(ST.f.radius, 'radius', 0, 80)}
        </>
      ) : null}

      {active === 'words' && el.kind === 'text' ? <WordStyler el={el} patch={patch} /> : null}
      {active === 'effects' && el.kind === 'text' ? <EffectsEditor el={el} patch={patch} /> : null}

      {active === 'color' && el.kind === 'text' ? <>{sw('color', ST.f.color)}{sw('bgColor', ST.f.bg, true)}</> : null}
      {active === 'color' && (el.kind === 'shape' || el.kind === 'svg') ? (
        <>{sw('fill', ST.f.fill, true)}{sw('stroke', ST.f.stroke, true)}{sl(ST.f.strokeW, 'strokeWidth', 0, 24)}{el.kind === 'shape' && el.shape === 'rect' ? sl(ST.f.radius, 'radius', 0, 80) : null}</>
      ) : null}
      {active === 'color' && el.kind === 'line' ? (
        <>{sw('stroke', ST.f.stroke)}{sl(ST.f.strokeW, 'strokeWidth', 1, 24)}<SwitchRow label={ST.f.dashed} value={el.dashed} onChange={(dashed) => patch({ dashed })} /><SwitchRow label={ST.f.arrow} value={el.arrow} onChange={(arrow) => patch({ arrow })} /></>
      ) : null}

      {active === 'transform' ? (
        <>
          <Slider label={ST.f.width} value={Math.round(el.w)} min={16} max={cv.w * 2} onChange={(w) => patch({ w }, 'w')} />
          <Slider label={ST.f.height} value={Math.round(el.h)} min={8} max={cv.h * 2} onChange={(h) => patch({ h }, 'h')} />
          <Slider label="X" value={Math.round(el.x)} min={-cv.w} max={cv.w * 2} onChange={(x) => patch({ x }, 'x')} />
          <Slider label="Y" value={Math.round(el.y)} min={-cv.h} max={cv.h * 2} onChange={(y) => patch({ y }, 'y')} />
          <Slider label={ST.f.rotation} value={Math.round(el.rotation)} min={-180} max={180} format={(v) => `${v}°`} onChange={(rotation) => patch({ rotation }, 'rot')} />
          <Slider label={ST.f.opacity} value={Math.round(el.opacity * 100)} min={0} max={100} format={(v) => `${v}%`} onChange={(v) => patch({ opacity: v / 100 }, 'op')} />
          <Row wrap gap={8}>
            <Chip label={ST.f.centerH} icon="swap-horizontal-outline" onPress={() => patch({ x: centerH(el, cv.w) })} />
            <Chip label={ST.f.centerV} icon="swap-vertical-outline" onPress={() => patch({ y: centerV(el, cv.h) })} />
          </Row>
          <Row wrap gap={8}>
            <Chip label={ST.act.forward} icon="chevron-up" onPress={() => api.reorderElement(el.id, 'forward')} />
            <Chip label={ST.act.backward} icon="chevron-down" onPress={() => api.reorderElement(el.id, 'backward')} />
            <Chip label={ST.act.front} icon="arrow-up-circle-outline" onPress={() => api.reorderElement(el.id, 'front')} />
            <Chip label={ST.act.back} icon="arrow-down-circle-outline" onPress={() => api.reorderElement(el.id, 'back')} />
          </Row>
          <Muted>{`${idx + 1} / ${elements.length}`}</Muted>
        </>
      ) : null}
    </>
  );
}

type TextEl = Extract<DesignElement, { kind: 'text' }>;
type PatchFn = (p: Partial<DesignElement>, key?: string) => void;

/** Word-level styling without a text cursor: tap words to select them, then pick colour / size / underline. Styles live in `runs`. */
function WordStyler({ el, patch }: { el: TextEl; patch: PatchFn }) {
  const { c } = useTheme();
  const words = React.useMemo(() => wordSpans(el.text), [el.text]);
  const [sel, setSel] = useState<number[]>([]);
  React.useEffect(() => setSel([]), [el.id, el.text]);
  const len = el.text.length;
  const ranges = sel.map((i) => words[i]).filter(Boolean) as [number, number][];
  const apply = (p: RunPatch) => patch({ runs: restyle(el.runs, len, ranges, p) });
  const style: (RunStyle | undefined)[] = []; { let off = 0; for (const sg of runSegments(el.text, el.runs)) { for (let k = 0; k < sg.text.length; k++) style[off + k] = sg; off += sg.text.length; } }
  const covered = (a: number, b: number, pred: (s: RunStyle | undefined) => boolean) => { for (let i = a; i < b; i++) if (!pred(style[i])) return false; return true; };
  const underlined = ranges.length > 0 && ranges.every(([a, b]) => covered(a, b, (s) => !!s?.underline));
  const scaleNow = ranges.length > 0 && ranges.every(([a, b]) => covered(a, b, (s) => (s?.scale ?? 1) === (style[ranges[0][0]]?.scale ?? 1))) ? style[ranges[0][0]]?.scale ?? 1 : -1;
  const aerab = aerabSpans(el.text);
  if (!words.length) return <Muted>{ST.tx.wordsHint}</Muted>;
  return (
    <>
      <Muted>{ST.tx.wordsHint}</Muted>
      <Row wrap gap={8}>
        {words.map(([a, b], i) => { const on = sel.includes(i); const st = style[a]; return (
          <Pressable key={`${a}-${b}`} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSel((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primarySoft : c.surface, alignItems: 'center', justifyContent: 'center' }}>
            <UText size={16} color={st?.color ?? c.text} spacing={1.6}>{el.text.slice(a, b)}</UText>
          </Pressable>); })}
      </Row>
      <Row wrap gap={8}>
        <Chip label={ST.tx.selAll} icon="checkmark-done-outline" onPress={() => setSel(words.map((_, i) => i))} />
        <Chip label={ST.tx.selNone} icon="close-outline" onPress={() => setSel([])} />
      </Row>
      {ranges.length === 0 ? <Muted>{ST.tx.wordsNone}</Muted> : (
        <>
          <ColorRow label={ST.f.color} value={style[ranges[0][0]]?.color ?? null} onChange={(v) => apply({ color: v })} />
          <UText size={14} color={c.muted} spacing={1.5}>{ST.tx.size}</UText>
          <HScroll>{[0.8, 1, 1.3, 1.6, 2].map((k) => <Chip key={k} label={`×${k}`} active={scaleNow === k} onPress={() => apply({ scale: k })} />)}</HScroll>
          <Row wrap gap={8}>
            <Chip label={ST.tx.underline} icon="remove-outline" active={underlined} onPress={() => apply({ underline: !underlined })} />
            <Chip label={ST.tx.clear} icon="refresh-outline" onPress={() => apply({ color: null, scale: null, underline: null })} />
          </Row>
        </>
      )}
      <UText size={14} color={c.muted} spacing={1.5}>{ST.tx.quick}</UText>
      <Row wrap gap={8}>
        {aerab.length ? <Chip label={ST.tx.aerabDim} onPress={() => patch({ runs: restyle(el.runs, len, aerab, { color: withAlpha(el.color, 0.45) }) })} /> : null}
        {aerab.length ? <Chip label={ST.tx.aerabPlain} onPress={() => patch({ runs: restyle(el.runs, len, aerab, { color: null }) })} /> : null}
        <Chip label={ST.tx.firstBig} onPress={() => patch({ runs: restyle(el.runs, len, [words[0]], { scale: 1.6 }) })} />
      </Row>
    </>
  );
}

/** Shadow / glow presets plus fine controls. Outline and gradient fill need a different renderer and are planned for Phase 6. */
function EffectsEditor({ el, patch }: { el: TextEl; patch: PatchFn }) {
  const { c } = useTheme();
  const preset = (sp: { color: string; blur: number; x: number; y: number }) => patch({ shadow: true, shadowColor: sp.color, shadowBlur: sp.blur, shadowX: sp.x, shadowY: sp.y });
  return (
    <>
      <UText size={15} color={c.primary} spacing={1.6}>{ST.tx.effectsTitle}</UText>
      <HScroll>
        <Chip label={ST.tx.none} active={!el.shadow} onPress={() => patch({ shadow: false })} />
        <Chip label={ST.tx.soft} onPress={() => preset(SHADOW_PRESETS.soft())} />
        <Chip label={ST.tx.hard} onPress={() => preset(SHADOW_PRESETS.hard())} />
        <Chip label={ST.tx.glow} onPress={() => preset(SHADOW_PRESETS.glow(el.color))} />
      </HScroll>
      {el.shadow ? (
        <>
          <ColorRow label={ST.tx.shadowColor} value={el.shadowColor} onChange={(v) => v && patch({ shadowColor: v }, 'shc')} />
          <Slider label={ST.tx.blur} value={Math.round(el.shadowBlur)} min={0} max={40} onChange={(v) => patch({ shadowBlur: v }, 'shb')} />
          <Slider label={ST.tx.offX} value={Math.round(el.shadowX)} min={-20} max={20} onChange={(v) => patch({ shadowX: v }, 'shx')} />
          <Slider label={ST.tx.offY} value={Math.round(el.shadowY)} min={-20} max={20} onChange={(v) => patch({ shadowY: v }, 'shy')} />
        </>
      ) : null}
    </>
  );
}

/** Preset swatches + hex field; `allowNone` adds a "no colour" choice (transparent fill / background). */
function ColorRow({ label, value, onChange, allowNone }: { label: string; value: string | null; onChange: (v: string | null) => void; allowNone?: boolean }) {
  const { c } = useTheme();
  const [hex, setHex] = useState(value ?? '');
  React.useEffect(() => setHex(value ?? ''), [value]);
  return (
    <View style={{ gap: 8 }}>
      <UText size={14} color={c.muted} spacing={1.5}>{label}</UText>
      <Row wrap gap={10}>
        {allowNone ? (
          <Pressable accessibilityRole="button" accessibilityLabel={ST.f.noBg} accessibilityState={{ selected: value === null }} onPress={() => onChange(null)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: value === null ? 3 : 1, borderColor: value === null ? c.primary : c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
            <Icon name="close" size={20} color={c.muted} />
          </Pressable>
        ) : null}
        {PALETTE.map((p) => {
          const on = value?.toLowerCase() === p.toLowerCase(); const light = hexToHsv(p).v > 0.6 && hexToHsv(p).s < 0.5;
          return (
            <Pressable key={p} accessibilityRole="button" accessibilityLabel={p} accessibilityState={{ selected: on }} onPress={() => onChange(p)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p, borderWidth: on ? 3 : 1, borderColor: on ? c.primary : c.line, alignItems: 'center', justifyContent: 'center' }}>
              {on ? <Icon name="checkmark" size={18} color={light ? '#1B1730' : '#FFFFFF'} /> : null}
            </Pressable>
          );
        })}
      </Row>
      <Field ltr label={ST.f.hex} value={hex} autoCapitalize="characters" maxLength={7} onChangeText={(t) => { setHex(t); const n = normalizeHex(t); if (n) onChange(n); }} />
    </View>
  );
}

/* ---------------------------------------------------------------- layers */
function LayersTab({ selId, setSelId, setTab }: { selId: string | null; setSelId: (id: string | null) => void; setTab: (t: StudioTab) => void }) {
  const { c } = useTheme();
  const api = useCardApi();
  const elements = useCard((s) => s.design.elements);
  const rows = elements.slice().reverse(); // top of the list = front of the canvas
  return (
    <>
      {rows.length === 0 ? <Muted center>{ST.layers.empty}</Muted> : <Muted>{ST.layers.hint}</Muted>}
      {rows.map((e) => {
        const on = e.id === selId; const i = elements.findIndex((x) => x.id === e.id);
        return (
          <View key={e.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 2, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primarySoft : c.surface, paddingHorizontal: 6, opacity: e.visible ? 1 : 0.55 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={elLabel(e)} onPress={() => { setSelId(e.id); setTab('edit'); }} style={{ flex: 1, minHeight: 52, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 6 }}>
              <Icon name={KIND_ICON[e.kind]} size={20} color={c.primary} />
              <View style={{ flex: 1 }}><UText size={14} lines={1} spacing={1.6}>{elLabel(e)}</UText></View>
              {e.groupId ? <Icon name="link-outline" size={14} color={c.muted} /> : null}
            </Pressable>
            <IconButton icon={e.visible ? 'eye-outline' : 'eye-off-outline'} size={19} label={e.visible ? ST.act.hide : ST.act.show} onPress={() => api.patchElement(e.id, { visible: !e.visible })} />
            <IconButton icon={e.locked ? 'lock-closed' : 'lock-open-outline'} size={19} active={e.locked} label={e.locked ? ST.act.unlock : ST.act.lock} onPress={() => api.patchElement(e.id, { locked: !e.locked })} />
            <IconButton icon="chevron-up" size={19} disabled={i === elements.length - 1} label={ST.act.forward} onPress={() => api.reorderElement(e.id, 'forward')} />
            <IconButton icon="chevron-down" size={19} disabled={i === 0} label={ST.act.backward} onPress={() => api.reorderElement(e.id, 'backward')} />
          </View>
        );
      })}
      <View style={{ borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <Icon name="albums-outline" size={20} color={c.muted} /><View style={{ flex: 1 }}><UText size={13} color={c.muted} spacing={1.6}>{ST.layers.base}</UText></View>
      </View>
    </>
  );
}
