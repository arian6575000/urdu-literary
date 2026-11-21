import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput, TextInputSelectionChangeEvent, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CATEGORIES, catById, isPoetry } from '../../constants/categories';
import { COLORS, FONT, RADII, SPACING, lineHeightFor } from '../../constants/theme';
import { S } from '../../constants/strings';
import { createWriting, getWriting, updateWriting } from '../../database/repositories/writings';
import { getSetting, setSetting } from '../../database/repositories/settings';
import { useSettings } from '../../stores/settings';
import { toast, useUi } from '../../stores/ui';
import { countChars, countWords, urduDigits } from '../../utils/text';
import { Chip, Field, HScroll, Icon, IconButton, Muted, Row, Screen, Sheet, UText } from '../../components/design-system';
import { CorrectionSheet } from '../../components/CorrectionSheet';
import { VoiceWriter } from '../../features/voice/VoiceWriter';

type Snap = { title: string; content: string };
type SaveState = 'saved' | 'saving' | 'unsaved';

// Screen 06 — Advanced Urdu Writing Editor
export default function Editor() {
  const params = useLocalSearchParams<{ id?: string; cat?: string }>();
  const st = useSettings();
  const idRef = useRef<string | null>(params.id ?? null);
  const [loaded, setLoaded] = useState(!params.id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState(st.defaultAuthor);
  const [category, setCategory] = useState(params.cat && CATEGORIES.some((c) => c.id === params.cat) ? params.cat : 'free');
  const [original, setOriginal] = useState('');
  const [save, setSave] = useState<SaveState>('saved');
  const [size, setSize] = useState(st.editorSize);
  const [spacing, setSpacing] = useState(st.editorSpacing);
  const [showVoice, setShowVoice] = useState(false);
  const [showFix, setShowFix] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const sel = useRef({ start: 0, end: 0 });
  const bodyRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // ---- undo / redo (own history: coalesced snapshots) ----
  const hist = useRef<Snap[]>([{ title: '', content: '' }]);
  const ptr = useRef(0);
  const histTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Snap>({ title: '', content: '' });
  const [, force] = useState(0);
  const pushHist = useCallback(() => {
    histTimer.current && clearTimeout(histTimer.current); histTimer.current = null;
    const cur = latest.current, top = hist.current[ptr.current];
    if (top.title === cur.title && top.content === cur.content) return;
    hist.current = hist.current.slice(0, ptr.current + 1).concat({ ...cur }).slice(-100);
    ptr.current = hist.current.length - 1; force((n) => n + 1);
  }, []);
  const applySnap = (s: Snap) => { latest.current = { ...s }; setTitle(s.title); setContent(s.content); markDirty(); force((n) => n + 1); };
  const undo = () => { pushHist(); if (ptr.current > 0) { ptr.current--; applySnap(hist.current[ptr.current]); } };
  const redo = () => { if (ptr.current < hist.current.length - 1) { ptr.current++; applySnap(hist.current[ptr.current]); } };

  // ---- load existing ----
  useEffect(() => {
    if (!params.id) return;
    getWriting(params.id).then((w) => {
      if (!w) { toast(S.notFound, 'error'); router.back(); return; }
      setTitle(w.title); setContent(w.content); setCategory(w.category_id); setAuthor(w.author); setOriginal(w.original_transcript);
      latest.current = { title: w.title, content: w.content }; hist.current = [{ title: w.title, content: w.content }]; ptr.current = 0;
      setLoaded(true);
    });
  }, [params.id]);

  // ---- autosave ----
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnap = useRef(0);
  const fields = useRef({ title, content, category, author, original });
  fields.current = { title, content, category, author, original };
  const saving = useRef<Promise<void>>(Promise.resolve());

  const persist = useCallback(async (manual: boolean) => {
    const f = fields.current;
    if (!f.title.trim() && !f.content.trim()) { setSave('saved'); return; }
    setSave('saving');
    const snapshot = manual || Date.now() - lastSnap.current > 5 * 60 * 1000;
    if (!idRef.current) {
      const w = await createWriting({ title: f.title, content: f.content, category_id: f.category, author: f.author, original_transcript: f.original });
      idRef.current = w.id; lastSnap.current = Date.now();
    } else {
      await updateWriting(idRef.current, { title: f.title, content: f.content, category_id: f.category, author: f.author, original_transcript: f.original }, snapshot);
      if (snapshot) lastSnap.current = Date.now();
    }
    await setSetting('open_draft', idRef.current);
    setSave('saved'); useUi.getState().bump();
  }, []);
  const queue = useCallback((manual = false) => { saving.current = saving.current.then(() => persist(manual)).catch(() => setSave('unsaved')); return saving.current; }, [persist]);
  const markDirty = useCallback(() => {
    setSave('unsaved');
    if (!useSettings.getState().autoSave) return;
    timer.current && clearTimeout(timer.current);
    timer.current = setTimeout(() => queue(false), 900);
  }, [queue]);

  // flush on leave; a clean exit clears the crash-recovery marker
  useEffect(() => () => {
    timer.current && clearTimeout(timer.current);
    (async () => { try { await queue(false); const cur = await getSetting('open_draft'); if (cur && cur === idRef.current) await setSetting('open_draft', ''); } catch { /* ignore */ } })();
  }, [queue]);

  const onTitle = (t: string) => { setTitle(t); latest.current.title = t; schedHist(); markDirty(); };
  const onBody = (t: string) => { setContent(t); latest.current.content = t; schedHist(); markDirty(); };
  const schedHist = () => { histTimer.current && clearTimeout(histTimer.current); histTimer.current = setTimeout(pushHist, 600); };

  const insertAtCursor = (text: string) => {
    const { start, end } = sel.current;
    const t = content.slice(0, start) + text + content.slice(end);
    const pos = start + text.length; sel.current = { start: pos, end: pos };
    pushHist(); onBody(t); pushHist();
  };
  const manualSave = async () => { await queue(true); await setSetting('open_draft', ''); toast(S.saved, 'ok'); };
  const adjust = async (kind: 'size' | 'spacing', d: number) => {
    if (kind === 'size') { const v = Math.max(16, Math.min(44, size + d)); setSize(v); st.set('editorSize', v); }
    else { const v = Math.max(1.4, Math.min(3.2, +(spacing + d).toFixed(1))); setSpacing(v); st.set('editorSpacing', v); }
  };
  const onSelection = (e: TextInputSelectionChangeEvent) => { sel.current = e.nativeEvent.selection; };

  if (!loaded) return <Screen title="" back><View /></Screen>;
  const cat = catById(category);
  const canUndo = ptr.current > 0, canRedo = ptr.current < hist.current.length - 1;
  const stLabel = save === 'saved' ? S.saved : save === 'saving' ? S.saving : S.unsaved;

  return (
    <Screen
      title={cat.name} back scroll={false} pad={false}
      right={<Row gap={0}>
        <Row gap={4} style={{ paddingHorizontal: 6 }}><Icon name={save === 'saved' ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color={save === 'saved' ? COLORS.success : COLORS.muted} /><Muted>{stLabel}</Muted></Row>
        <IconButton icon="save-outline" color={COLORS.primary} onPress={manualSave} label={S.save} />
      </Row>}
      footer={
        <View style={{ backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.line }}>
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 4 }}>
            <Muted>{urduDigits(countWords(content))} {S.words} · {urduDigits(countChars(content))} {S.chars}</Muted>
            <Row gap={2}><IconButton icon="remove" size={18} onPress={() => adjust('size', -2)} label={S.fontSize} /><UText size={12} color={COLORS.muted}>{S.fontSize}</UText><IconButton icon="add" size={18} onPress={() => adjust('size', 2)} label={S.fontSize} /></Row>
          </Row>
          <HScroll gap={2}>
            <IconButton icon="mic" color={COLORS.white} bg={COLORS.primary} onPress={() => setShowVoice(true)} label={S.voiceInput} />
            <IconButton icon="arrow-undo-outline" onPress={undo} color={canUndo ? COLORS.text : COLORS.line} label={S.undo} />
            <IconButton icon="arrow-redo-outline" onPress={redo} color={canRedo ? COLORS.text : COLORS.line} label={S.redo} />
            {isPoetry(category) ? <IconButton icon="return-down-back-outline" onPress={() => insertAtCursor('\n\n')} label={S.couplet} /> : null}
            <IconButton icon="color-wand-outline" onPress={() => { pushHist(); setShowFix(true); }} label={S.checkText} />
            <IconButton icon="reorder-three-outline" onPress={() => adjust('spacing', 0.2)} label={S.lineSpacing} />
            <IconButton icon="reorder-two-outline" onPress={() => adjust('spacing', -0.2)} label={S.lineSpacing} />
            <IconButton icon="apps-outline" onPress={() => setShowCat(true)} label={S.category} />
          </HScroll>
        </View>
      }>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SPACING.lg, gap: 6, paddingBottom: 40 }}>
        <TextInput
          value={title} onChangeText={onTitle} placeholder={S.titleHint} placeholderTextColor={COLORS.muted} textAlign="right" returnKeyType="next" onSubmitEditing={() => bodyRef.current?.focus()}
          style={{ fontFamily: FONT, fontSize: 30, lineHeight: lineHeightFor(30, 1.8), color: COLORS.primary, writingDirection: 'rtl', paddingVertical: 4 }} />
        <View style={{ height: 2, backgroundColor: COLORS.secondarySoft, borderRadius: 1 }} />
        <TextInput
          ref={bodyRef} value={content} onChangeText={onBody} onSelectionChange={onSelection} multiline placeholder={S.bodyHint} placeholderTextColor={COLORS.muted} textAlign="right" textAlignVertical="top" scrollEnabled={false}
          style={{ fontFamily: FONT, fontSize: size, lineHeight: lineHeightFor(size, spacing), color: COLORS.text, writingDirection: 'rtl', minHeight: 320, paddingTop: 8 }} />
      </ScrollView>

      <Sheet visible={showVoice} onClose={() => setShowVoice(false)} title={S.voiceTitle} tall>
        <VoiceWriter embedded category={category} onInsert={(text, orig) => { insertAtCursor(text); setOriginal((o) => (o ? o + '\n' : '') + orig); setShowVoice(false); }} />
      </Sheet>
      <CorrectionSheet visible={showFix} text={content} onApply={(t) => { pushHist(); onBody(t); pushHist(); }} onClose={() => setShowFix(false)} />
      <Sheet visible={showCat} onClose={() => setShowCat(false)} title={S.category}>
        <Row wrap gap={8}>{CATEGORIES.map((c) => <Chip key={c.id} label={c.name} icon={c.icon} active={category === c.id} onPress={() => { setCategory(c.id); markDirty(); setShowCat(false); }} />)}</Row>
        <Field label={S.author} value={author} onChangeText={(t) => { setAuthor(t); markDirty(); }} placeholder={S.authorHint} />
      </Sheet>
    </Screen>
  );
}
void RADII;
