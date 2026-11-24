import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { FONT, RADII, SHADOW, lineHeightFor } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { urduDigits } from '../../utils/text';
import { S } from '../../constants/strings';
import { VoiceSessionController, type Snapshot } from '../../services/speech/sessionController';
import { createProvider } from '../../services/speech/factory';
import type { SpeechError } from '../../services/speech/types';
import { listDictionary } from '../../database/repositories/dictionary';
import { createWriting } from '../../database/repositories/writings';
import { endVoiceSession, lastUnlinkedTranscript, linkSessionToWriting, saveTranscript, startVoiceSession } from '../../database/repositories/voice';
import { getProxyToken } from '../../services/privacy/lock';
import { useSettings } from '../../stores/settings';
import { logEvent } from '../../services/diagnostics';
import { toast, useUi } from '../../stores/ui';
import { Button, Card, Chip, Icon, IconButton, Muted, Row, UText } from '../../components/design-system';
import { CorrectionSheet } from '../../components/CorrectionSheet';
import { Waveform } from './Waveform';

const BARS = 30;
const errText = (e: SpeechError): string =>
  e.code === 'permission' ? S.micDenied : e.code === 'network' ? S.noInternet : e.code === 'unsupported' ? S.voiceUnavailable : e.code === 'no-speech' ? S.noSpeech : S.voiceError;

interface Props { embedded?: boolean; category?: string; onInsert?: (text: string, original: string) => void }

/**
 * Screen 07 — live Urdu voice writing. UI only: all engine work is behind UrduSpeechProvider + VoiceSessionController.
 * Confirmed text is solid, tentative (unstable) text is shown lighter and replaced — never appended — on each update.
 */
export function VoiceWriter({ embedded, category = 'free', onInsert }: Props) {
  const { c } = useTheme();
  const engine = useSettings((s) => s.engine);
  const proxyUrl = useSettings((s) => s.proxyUrl);
  const author = useSettings((s) => s.defaultAuthor);
  const speechLang = useSettings((s) => s.speechLang);
  const langRef = useRef(speechLang); langRef.current = speechLang;
  const tokenRef = useRef('');
  const proxyRef = useRef(proxyUrl); proxyRef.current = proxyUrl;
  const ctrl = useMemo(() => new VoiceSessionController(createProvider(engine, () => ({ baseUrl: proxyRef.current, token: tokenRef.current }), () => langRef.current), { log: (m) => logEvent('voice', m) }), [engine]);
  const [snap, setSnap] = useState<Snapshot>(ctrl.snapshot());
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const [edited, setEdited] = useState('');           // text after stop (user-editable)
  const [origParts, setOrigParts] = useState<string[]>([]); // raw engine output, never edited
  const [showFix, setShowFix] = useState(false);
  const [recovered, setRecovered] = useState<{ session_id: string; edited_text: string; original_text: string } | null>(null);
  const sessionId = useRef<string | null>(null);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const prevState = useRef(snap.state);
  const [secs, setSecs] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(pulse, { toValue: snap.state === 'listening' ? Math.min(1, snap.level * 1.6) : 0, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, [snap.level, snap.state, pulse]);
  useEffect(() => { if (snap.state !== 'listening') return; const id = setInterval(() => setSecs((x) => x + 1), 1000); return () => clearInterval(id); }, [snap.state]);
  const mmss = `${urduDigits(String(Math.floor(secs / 60)).padStart(2, '0'))}:${urduDigits(String(secs % 60).padStart(2, '0'))}`;

  useEffect(() => { getProxyToken().then((t) => { tokenRef.current = t; }); }, [engine]);
  useEffect(() => { if (!embedded) lastUnlinkedTranscript().then((t) => t && setRecovered(t as any)).catch(() => {}); }, [embedded]);

  // controller -> UI
  useEffect(() => {
    const un = ctrl.subscribe((s) => { setSnap(s); });
    return () => { un(); ctrl.dispose(); };
  }, [ctrl]);
  useEffect(() => { // waveform history
    setLevels((l) => [...l.slice(1), snap.state === 'listening' ? snap.level : 0]);
  }, [snap.level, snap.state]);

  // persist while speaking (throttled) so an interruption never loses text
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sessionId.current || !snap.full) return;
    saveTimer.current && clearTimeout(saveTimer.current);
    const sid = sessionId.current;
    saveTimer.current = setTimeout(() => { saveTranscript(sid, [...origParts, snap.full].join(' '), [edited, snap.full].filter(Boolean).join(' ')).catch(() => {}); }, 800);
  }, [snap.full, origParts, edited]);

  // on stop: merge this session's text into the editable text, keep the raw original apart
  useEffect(() => {
    if (prevState.current !== 'stopped' && snap.state === 'stopped') {
      const raw = snap.full.trim();
      if (raw) { setOrigParts((p) => [...p, raw]); setEdited((e) => [e, raw].filter(Boolean).join(' ')); }
      if (sessionId.current) endVoiceSession(sessionId.current).catch(() => {});
    }
    if (snap.state === 'error' && snap.full.trim() && prevState.current !== 'error') toast(S.voiceError, 'error');
    prevState.current = snap.state;
  }, [snap.state, snap.full]);
  useEffect(() => { if (snap.state === 'stopped' || snap.state === 'error') { const raw = snap.full.trim(); if (raw && sessionId.current) saveTranscript(sessionId.current, [...origParts].join(' '), edited).catch(() => {}); } }, [edited, origParts, snap.state]); // eslint-disable-line

  const begin = useCallback(async () => {
    if (!sessionId.current || snap.state === 'stopped') { sessionId.current = await startVoiceSession(engine); setSecs(0); }
    const vocab = (await listDictionary().catch(() => [])).flatMap((d) => [d.word]);
    await ctrl.start(vocab);
  }, [ctrl, engine, snap.state]);

  const live = snap.state === 'listening' || snap.state === 'starting' || snap.state === 'paused' || snap.state === 'stopping';
  const finished = !live && (!!edited || origParts.length > 0);
  const full = [edited, snap.full].filter(Boolean).join(live ? ' ' : '');

  const makeWriting = async () => {
    const text = edited.trim();
    if (!text) return;
    const w = await createWriting({ title: '', content: text, category_id: category, author, original_transcript: origParts.join('\n') });
    if (sessionId.current) await linkSessionToWriting(sessionId.current, w.id);
    useUi.getState().bump();
    router.push({ pathname: '/writing/edit', params: { id: w.id } });
    setEdited(''); setOrigParts([]); sessionId.current = null;
  };

  const status = snap.state === 'listening' ? S.listening : snap.state === 'paused' ? S.paused : snap.state === 'stopping' || snap.state === 'starting' ? S.processing : S.tapToSpeak;

  return (
    <View style={{ flex: embedded ? undefined : 1, gap: 14, padding: embedded ? 0 : 16 }}>
      {recovered && !live && !finished ? (
        <Card style={{ backgroundColor: c.secondarySoft, borderColor: c.secondary, gap: 8 }}>
          <UText size={15}>{S.draftRecovered}</UText>
          <Row gap={8}>
            <Button small label={S.apply} onPress={() => { setEdited(recovered.edited_text); setOrigParts(recovered.original_text ? [recovered.original_text] : []); sessionId.current = recovered.session_id; setRecovered(null); }} />
            <Button small variant="ghost" label={S.ignore} onPress={() => setRecovered(null)} />
          </Row>
        </Card>
      ) : null}

      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}>
          <Chip label={S.engineDevice} icon="phone-portrait-outline" active={engine === 'device'} onPress={() => { if (!live) useSettings.getState().set('engine', 'device'); }} />
          <Chip label={S.engineCloud} icon="cloud-outline" active={engine === 'cloud'} onPress={() => { if (!live) useSettings.getState().set('engine', 'cloud'); }} />
        </Row>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: live ? c.accentSoft : c.tint, borderRadius: RADII.pill, paddingHorizontal: 12 }}>{live ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: snap.state === 'paused' ? c.gold : c.danger }} /> : null}<Muted>{live ? `${status} · ${mmss}` : status}</Muted></View>
      </Row>

      {engine === 'cloud' ? <Muted>{S.cloudNote}</Muted> : null}
      <Waveform levels={levels} active={snap.state === 'listening'} />

      {/* transcript */}
      <View style={{ flex: embedded ? undefined : 1, minHeight: embedded ? 220 : 160, backgroundColor: c.surface, borderRadius: RADII.lg, borderWidth: 1, borderColor: c.line, padding: 14, ...SHADOW }}>
        {live || !finished ? (
          <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ flexGrow: 1 }}>
            {full ? (
              <Text2 confirmed={[edited, snap.confirmed].filter(Boolean).join(' ')} tentative={snap.tentative} />
            ) : <UText size={20} color={c.muted} center style={{ marginTop: 40 }}>{S.tapToSpeak}</UText>}
          </ScrollView>
        ) : (
          <TextInput value={edited} onChangeText={setEdited} multiline textAlign="right" textAlignVertical="top" style={{ flex: 1, minHeight: 200, fontFamily: FONT, fontSize: 26, lineHeight: lineHeightFor(26, 2.0), color: c.text, writingDirection: 'rtl' }} />
        )}
        {finished && !live ? <Muted style={{ marginTop: 4 }}>{S.edited} · {S.original}: {origParts.join(' ').length > 0 ? '✓' : '—'}</Muted> : null}
      </View>

      {snap.error ? (
        <Card style={{ backgroundColor: 'rgba(179,55,47,0.08)', borderColor: c.danger, gap: 8 }}>
          <UText size={15} color={c.danger}>{errText(snap.error)}</UText>
          <Muted>({snap.error.code}{snap.error.message ? ` · ${snap.error.message.slice(0, 80)}` : ''})</Muted>
          <Row gap={8}>
            <Button small label={S.retry} onPress={begin} />
            {snap.error.code === 'permission' ? <Button small variant="ghost" label={S.openSettings} onPress={() => Linking.openSettings()} /> : null}
            {snap.error.code === 'unsupported' || snap.error.code === 'network' ? <Button small variant="ghost" label={S.voiceSettings} onPress={() => router.push('/voice-settings')} /> : null}
          </Row>
        </Card>
      ) : null}

      {/* controls */}
      <Row style={{ justifyContent: 'center' }} gap={22}>
        {live ? (
          <>
            <RoundBtn icon="stop" color={c.danger} label={S.stop} onPress={() => ctrl.stop()} />
            <Pressable accessibilityLabel={snap.state === 'paused' ? S.resume : S.pause} onPress={() => (snap.state === 'paused' ? ctrl.resume() : ctrl.pause())}
              style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: snap.state === 'paused' ? c.primary : c.secondary, alignItems: 'center', justifyContent: 'center', ...SHADOW }}>
              <Icon name={snap.state === 'paused' ? 'mic' : 'pause'} size={38} color={c.white} />
            </Pressable>
            <View style={{ width: 56 }} />
          </>
        ) : (
          <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: c.accentSoft, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.0, 0.9] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }] }} />
            <Pressable accessibilityRole="button" accessibilityLabel={S.tapToSpeak} onPress={begin} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: c.accentSoft, ...SHADOW }}>
              <Icon name="mic" size={44} color={c.onAccent} />
            </Pressable>
          </View>
        )}
      </Row>
      <Row style={{ justifyContent: 'center' }}><Muted>{live ? (snap.state === 'paused' ? S.resume : S.pause) : finished ? S.editTranscript : S.startHint}</Muted></Row>

      {finished && !live ? (
        <Row wrap gap={8} style={{ justifyContent: 'center' }}>
          <Button small icon="color-wand-outline" variant="ghost" label={S.checkText} onPress={() => setShowFix(true)} />
          {embedded ? <Button icon="download-outline" label={S.insertInto} onPress={() => onInsert?.(edited.trim(), origParts.join('\n'))} />
            : <Button icon="document-text-outline" label={S.saveAsWriting} onPress={makeWriting} />}
          <IconButton icon="close-circle-outline" onPress={() => { setEdited(''); setOrigParts([]); sessionId.current = null; }} label={S.cancel} />
        </Row>
      ) : null}
      <CorrectionSheet visible={showFix} text={edited} onApply={setEdited} onClose={() => setShowFix(false)} />
    </View>
  );
}

function Text2({ confirmed, tentative }: { confirmed: string; tentative: string }) {
  const { c } = useTheme();
  return (
    <UText size={26} spacing={2.1} selectable>
      <UText size={26} spacing={2.1}>{confirmed}</UText>
      {tentative ? <UText size={26} spacing={2.1} color={c.muted}>{confirmed ? ' ' : ''}{tentative}</UText> : null}
    </UText>
  );
}

function RoundBtn({ icon, color, onPress, label }: { icon: any; color: string; onPress: () => void; label: string }) {
  const { c } = useTheme();
  return <Pressable accessibilityLabel={label} onPress={onPress} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: color, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', ...SHADOW }}><Icon name={icon} size={26} color={c.white} /></Pressable>;
}
