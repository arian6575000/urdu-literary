import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { ROW, RADII } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { getWriting } from '../../database/repositories/writings';
import { getCardDesign, saveCardDesign } from '../../database/repositories/cards';
import { splitCouplets, urduDigits } from '../../utils/text';
import { confirmDialog, toast } from '../../stores/ui';
import { Button, Chip, Icon, IconButton, Muted, Row, Sheet, UText, type IconName } from '../../components/design-system';
import { BASE_DESIGN, newDesign } from '../../features/card/templates';
import { CardCanvas } from '../../features/card/CardCanvas';
import { CardProvider } from '../../features/card/context';
import { createCardStore, isDirty, type CardStore } from '../../features/card/store';
import { EASY_STEPS, EasyBody, BigButton } from '../../features/card/SimplePanel';
import { authorOf, useSettings } from '../../stores/settings';
import { BackgroundPanel, ColorPanel, DecorPanel, DesignPanel, ImagePanel, TextPanel } from '../../features/card/panels';
import { ensureAllCardFonts } from '../../features/card/fontLoader';
import { CS, type CardTab } from '../../features/card/strings';
import { StudioPanel, type StudioTab } from '../../features/card/studio/StudioPanel';
import { ST } from '../../features/card/studio/strings';
import { clampPosition, snapMove } from '../../features/card/elements';
import type { ElementTools } from '../../features/card/ElementLayer';
import { canvasSize, exportPixels, type ElementId } from '../../features/card/types';
import { captureCard, saveCardToGallery, shareCardImage, type ImageFormat } from '../../services/cardExport';

const TABS: { id: CardTab; label: string; icon: IconName }[] = [
  { id: 'text', label: CS.tText, icon: 'text' }, { id: 'design', label: CS.tDesign, icon: 'grid-outline' }, { id: 'color', label: CS.tColor, icon: 'color-palette-outline' },
  { id: 'bg', label: CS.tBg, icon: 'layers-outline' }, { id: 'decor', label: CS.tDecor, icon: 'sparkles-outline' }, { id: 'image', label: CS.tImage, icon: 'image-outline' },
];
type PanelMode = 'closed' | 'half' | 'full';
const TAB_OF: Record<ElementId, CardTab> = { text: 'text', title: 'text', poet: 'text', frame: 'decor', bg: 'bg', image: 'image' };

/**
 * Card / post editor. The preview is ALWAYS on screen: on phones it sits above the tool panel (the panel only changes height,
 * the preview re-fits into what is left); on wide screens the tools move to the side. All tools write to ONE store.
 */
export default function CardEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [store, setStore] = useState<CardStore | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [w, saved] = await Promise.all([getWriting(id), getCardDesign(id), ensureAllCardFonts()]);
        if (!alive) return;
        if (!w) { setFailed(true); return; }
        const first = splitCouplets(w.content).slice(0, 2).map((b) => b.join('\n')).join('\n\n') || w.content.slice(0, 200);
        const init = saved ?? newDesign({ text: first, title: w.title, poet: authorOf(w) });
        setStore(createCardStore({ ...BASE_DESIGN, ...init }));
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; };
  }, [id]);
  const { c } = useTheme();
  if (!store) return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>{failed ? <UText size={18} center>{CS.expFail}</UText> : <ActivityIndicator color={c.primary} size="large" />}</SafeAreaView>;
  return <CardProvider store={store}><Workspace id={id} store={store} /></CardProvider>;
}

function Workspace({ id, store }: { id: string; store: CardStore }) {
  const { c } = useTheme();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const wide = W >= 720;
  const design = useStore(store, (s) => s.design);
  const canUndo = useStore(store, (s) => s.past.length > 0);
  const canRedo = useStore(store, (s) => s.future.length > 0);
  const dirty = useStore(store, isDirty);
  const [tab, setTab] = useState<CardTab>('text');
  const [mode, setMode] = useState<PanelMode>('half');
  const [zoom, setZoom] = useState(false);
  const [sel, setSel] = useState<ElementId | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [showExport, setShowExport] = useState(false);
  const [fmt, setFmt] = useState<ImageFormat>('png');
  const [busy, setBusy] = useState<null | 'share' | 'gallery'>(null);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<React.ComponentRef<typeof View>>(null);
  const readyRes = useRef<(() => void) | null>(null);
  const bypass = useRef(false);
  const easy = useSettings((x) => x.cardEasy);
  const [step, setStep] = useState(0);
  const [studioOn, setStudioOn] = useState(false);
  const studio = !easy && studioOn;
  const [stTab, setStTab] = useState<StudioTab>('add');
  const [selEl, setSelEl] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean } | undefined>(undefined);
  const touched = useRef(0); // web emits a click after a drag/tap on an element; it must not clear the selection
  const pickEl = useCallback((eid: string) => { touched.current = Date.now(); setSelEl(eid); setStTab('edit'); setMode((m) => (m === 'closed' ? 'half' : m)); }, []);
  const elementTools = useMemo<ElementTools | undefined>(() => {
    if (!studio) return undefined;
    const cv = canvasSize(store.getState().design.ratio);
    const el = (id: string) => store.getState().design.elements.find((x) => x.id === id);
    return {
      guides,
      onMove: (id, x, y) => { const e = el(id); if (!e) return; const sn = snapMove(e, x, y, cv.w, cv.h); const p = clampPosition(e, sn.x, sn.y, cv.w, cv.h); setGuides(sn.guides); store.getState().patchElement(id, { x: p.x, y: p.y }, `${id}:move`); },
      onResize: (id, b) => store.getState().patchElement(id, b, `${id}:resize`),
      onRotate: (id, deg) => store.getState().patchElement(id, { rotation: deg }, `${id}:rotate`),
      onGestureEnd: () => { touched.current = Date.now(); setGuides(undefined); },
    };
  }, [studio, store, guides]);
  const selElExists = useStore(store, (s) => !!selEl && s.design.elements.some((e) => e.id === selEl));
  useEffect(() => { if (selEl && !selElExists) setSelEl(null); }, [selEl, selElExists]);

  // never lose unsaved work by accident (back button, gesture, header arrow)
  useEffect(() => (nav as any).addListener('beforeRemove', (e: any) => {
    if (bypass.current || !isDirty(store.getState())) return;
    e.preventDefault();
    confirmDialog(CS.discard, { danger: true, okLabel: CS.leave }).then((ok) => { if (ok) { bypass.current = true; nav.dispatch(e.data.action); } });
  }), [nav, store]);

  const save = useCallback(async () => { await saveCardDesign(id, store.getState().design); store.getState().markSaved(); toast(CS.saved, 'ok'); }, [id, store]);

  const { w: cw, h: ch } = canvasSize(design.ratio);
  const pad = 16;
  const fit = box.w > 0 ? Math.max(0.2, Math.min((box.w - pad * 2) / cw, (box.h - pad * 2) / ch, 2.4)) : 1;
  const scale = zoom ? Math.min(fit * 1.8, 3.2) : fit;

  const panelH = mode === 'closed' ? 0 : mode === 'half' ? Math.max(200, Math.min(0.36 * H, 330)) : Math.max(300, 0.62 * H);
  const onSelect = useCallback((e: ElementId) => { if (easy) { setStep(e === 'bg' ? 2 : 1); return; } setSel(e); setTab(TAB_OF[e]); setMode((m) => (m === 'closed' ? 'half' : m)); }, [easy]);
  const pickTab = (t: CardTab) => { if (t === tab) setMode((m) => (m === 'closed' ? 'half' : 'closed')); else { setTab(t); setMode((m) => (m === 'closed' ? 'half' : m)); } };

  const run = async (kind: 'share' | 'gallery') => {
    setBusy(kind);
    try {
      await new Promise<void>((res) => { readyRes.current = res; setExporting(true); setTimeout(res, 4000); });
      await new Promise((r) => setTimeout(r, 250));
      const uri = await captureCard(exportRef, design.ratio, fmt);
      if (kind === 'share') await shareCardImage(uri, fmt);
      else { const r = await saveCardToGallery(uri); toast(r === 'ok' ? CS.galleryOk : CS.galleryDenied, r === 'ok' ? 'ok' : 'error'); }
    } catch (e: any) { toast(e?.message === 'sharing-unavailable' ? 'اس فون پر شیئرنگ دستیاب نہیں' : CS.expFail, 'error'); }
    finally { setExporting(false); setBusy(null); }
  };

  const preview = (
    <View style={{ flex: 1, backgroundColor: c.surfaceAlt }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 ? (
        zoom ? (
          <ScrollView contentContainerStyle={{ padding: pad, alignItems: 'center', justifyContent: 'center', minHeight: box.h }} showsVerticalScrollIndicator={false}>
            <ScrollView horizontal contentContainerStyle={{ minWidth: box.w - pad * 2, alignItems: 'center', justifyContent: 'center' }} showsHorizontalScrollIndicator={false}>
              <CardCanvas design={design} scale={scale} selected={studio ? null : sel} onSelect={studio ? undefined : onSelect} selectedElement={studio ? selEl : null} onSelectElement={studio ? pickEl : undefined} elementTools={elementTools} />
            </ScrollView>
          </ScrollView>
        ) : (
          <Pressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={() => { if (Date.now() - touched.current < 400) return; setSel(null); setSelEl(null); }} accessibilityLabel={CS.editHint}>
            <View style={{ shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6, borderRadius: design.radius * scale }}>
              <CardCanvas design={design} scale={scale} selected={studio ? null : sel} onSelect={studio ? undefined : onSelect} selectedElement={studio ? selEl : null} onSelectElement={studio ? pickEl : undefined} elementTools={elementTools} />
            </View>
          </Pressable>
        )
      ) : null}
      {easy || studio ? null : <View style={{ position: 'absolute', bottom: 8, alignSelf: 'center', backgroundColor: c.scrim, borderRadius: RADII.pill, paddingHorizontal: 12 }}><UText size={11} color="#FFFFFF" spacing={1.5}>{studio || sel ? '' : CS.editHint}</UText></View>}
      {easy ? null : <View style={{ position: 'absolute', top: 6, left: 8 }}><IconButton icon={zoom ? 'contract-outline' : 'expand-outline'} bg={c.surface} onPress={() => setZoom((z) => !z)} label={zoom ? CS.fit : CS.zoom} /></View>}
      <View style={{ position: 'absolute', top: 8, right: 8 }}>
        <Row gap={6}>
          <Chip label={ST.mode.easy} icon="happy-outline" active={easy} onPress={() => useSettings.getState().set('cardEasy', true)} />
          <Chip label={ST.mode.more} icon="options-outline" active={!easy && !studioOn} onPress={() => { useSettings.getState().set('cardEasy', false); setStudioOn(false); }} />
          <Chip label={ST.mode.studio} icon="color-wand-outline" active={studio} onPress={() => { useSettings.getState().set('cardEasy', false); setStudioOn(true); setMode((m) => (m === 'closed' ? 'half' : m)); }} />
        </Row>
      </View>
    </View>
  );

  const body = useMemo(() => {
    switch (tab) {
      case 'text': return <TextPanel />; case 'design': return <DesignPanel />; case 'color': return <ColorPanel />;
      case 'bg': return <BackgroundPanel goImage={() => setTab('image')} />; case 'decor': return <DecorPanel />; default: return <ImagePanel />;
    }
  }, [tab]);

  const last = step === EASY_STEPS.length - 1;
  const easyTools = (
    <View style={{ backgroundColor: c.bg, borderTopLeftRadius: wide ? 0 : RADII.xl, borderTopRightRadius: wide ? 0 : RADII.xl, borderTopWidth: 1, borderColor: c.line, paddingBottom: insets.bottom + 8, ...(wide ? { width: 420, borderTopWidth: 0, borderLeftWidth: 1 } : null) }}>
      <Row gap={8} style={{ paddingHorizontal: 16, paddingTop: 12, justifyContent: 'space-between' }}>
        <UText size={22} color={c.primary} spacing={1.7}>{`مرحلہ ${urduDigits(step + 1)} از ${urduDigits(EASY_STEPS.length)}: ${EASY_STEPS[step].title}`}</UText>
      </Row>
      <Row gap={6} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>{EASY_STEPS.map((_, i) => <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i <= step ? c.primary : c.line }} />)}</Row>
      <ScrollView style={{ height: wide ? undefined : Math.max(170, Math.min(0.3 * H, 280)), flex: wide ? 1 : undefined }} keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <EasyBody step={step} />
        {last ? (
          <View style={{ gap: 10, marginTop: 12 }}>
            <BigButton icon="share-social" label="دوستوں کو بھیجیں" busy={busy === 'share'} disabled={!!busy} onPress={() => run('share')} />
            <BigButton tone="teal" icon="download" label="گیلری میں رکھیں" busy={busy === 'gallery'} disabled={!!busy} onPress={() => run('gallery')} />
            <BigButton tone="soft" icon={dirty ? 'save' : 'checkmark-circle'} label={dirty ? 'ڈیزائن محفوظ کریں' : 'ڈیزائن محفوظ ہے'} onPress={save} />
          </View>
        ) : null}
      </ScrollView>
      <Row gap={10} style={{ paddingHorizontal: 16, paddingTop: 6 }}>
        <BigButton flex tone="ghost" icon="chevron-forward" label="پیچھے" disabled={step === 0} onPress={() => setStep((x) => Math.max(0, x - 1))} />
        <BigButton tone="soft" icon="arrow-undo" label="" disabled={!canUndo} onPress={() => store.getState().undo()} />
        <BigButton flex icon="chevron-back" label="اگلا" disabled={last} onPress={() => setStep((x) => Math.min(EASY_STEPS.length - 1, x + 1))} />
      </Row>
    </View>
  );

  const studioTools = (
    <View style={{ backgroundColor: c.bg, borderTopLeftRadius: wide ? 0 : RADII.xl, borderTopRightRadius: wide ? 0 : RADII.xl, borderTopWidth: 1, borderColor: c.line, paddingBottom: insets.bottom, ...(wide ? { width: 400, borderTopWidth: 0, borderLeftWidth: 1 } : null) }}>
      {!wide ? <Pressable accessibilityRole="button" accessibilityLabel="پینل" onPress={() => setMode((m) => (m === 'full' ? 'half' : 'full'))} style={{ alignItems: 'center', paddingVertical: 6 }}><View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: c.line }} /></Pressable> : null}
      <StudioPanel tab={stTab} setTab={setStTab} selId={selEl} setSelId={setSelEl} height={wide ? Math.max(300, H - 200) : Math.max(180, panelH || 200)} />
    </View>
  );

  const tools = (
    <View style={{ backgroundColor: c.bg, borderTopLeftRadius: wide ? 0 : RADII.xl, borderTopRightRadius: wide ? 0 : RADII.xl, borderTopWidth: 1, borderColor: c.line, paddingBottom: insets.bottom, ...(wide ? { width: 400, borderTopWidth: 0, borderLeftWidth: 1, flex: undefined } : null) }}>
      {!wide ? <Pressable accessibilityRole="button" accessibilityLabel="پینل" onPress={() => setMode((m) => (m === 'full' ? 'half' : 'full'))} style={{ alignItems: 'center', paddingVertical: 6 }}><View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: c.line }} /></Pressable> : null}
      <View style={{ paddingHorizontal: 8 }}>
        <Row gap={4} style={{ justifyContent: 'space-between' }}>
          {TABS.map((t) => { const on = tab === t.id && mode !== 'closed'; return (
            <Pressable key={t.id} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => pickTab(t.id)} style={{ flex: 1, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : 'transparent' }}>
              <Icon name={t.icon} size={21} color={on ? c.onPrimary : c.muted} /><UText size={11} color={on ? c.onPrimary : c.muted} center spacing={1.3}>{t.label}</UText>
            </Pressable>); })}
        </Row>
      </View>
      {wide || mode !== 'closed' ? (
        <ScrollView style={{ height: wide ? undefined : panelH, flex: wide ? 1 : undefined }} keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>{body}</ScrollView>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <Row gap={0} style={{ height: 52, paddingHorizontal: 4 }}>
        <IconButton icon="chevron-forward" label="واپس" onPress={() => nav.goBack()} />
        <View style={{ flex: 1 }}><UText size={17} color={c.primary} lines={1} spacing={1.6}>{CS.title}</UText></View>
        <IconButton icon="arrow-undo" label={CS.undo} disabled={!canUndo} onPress={() => store.getState().undo()} />
        <IconButton icon="arrow-redo" label={CS.redo} disabled={!canRedo} onPress={() => store.getState().redo()} />
        <IconButton icon={dirty ? 'save' : 'save-outline'} color={dirty ? c.accent : c.text} label={CS.save} onPress={save} />
        <IconButton icon="share-outline" bg={c.primary} color={c.onPrimary} label={CS.export} onPress={() => setShowExport(true)} />
      </Row>
      <View style={{ flex: 1, flexDirection: wide ? ROW : 'column' }}>
        {wide ? (easy ? easyTools : studio ? studioTools : tools) : null}
        {preview}
        {wide ? null : (easy ? easyTools : studio ? studioTools : tools)}
      </View>

      <Sheet visible={showExport} onClose={() => !busy && setShowExport(false)} title={CS.export}>
        <Muted>{CS.format}</Muted>
        <Row gap={8}><Chip label="PNG" active={fmt === 'png'} onPress={() => setFmt('png')} /><Chip label="JPG" active={fmt === 'jpg'} onPress={() => setFmt('jpg')} /></Row>
        <Muted>{`${CS.resolution}: ${urduDigits(exportPixels(design.ratio).w)} × ${urduDigits(exportPixels(design.ratio).h)}`}</Muted>
        <Button icon="share-social-outline" label={CS.share} loading={busy === 'share'} disabled={!!busy} onPress={() => run('share')} />
        <Button variant="teal" icon="download-outline" label={CS.gallery} loading={busy === 'gallery'} disabled={!!busy} onPress={() => run('gallery')} />
        {busy ? <Muted center>{CS.exporting}</Muted> : null}
      </Sheet>

      {exporting ? (
        <View ref={exportRef} collapsable={false} pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0 }}>
          <CardCanvas design={design} scale={1} onReady={() => readyRes.current?.()} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
