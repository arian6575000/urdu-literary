import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import { BG_THEMES, COLORS, FONT, RADII, lineHeightFor } from '../../constants/theme';
import { S } from '../../constants/strings';
import { getWriting } from '../../database/repositories/writings';
import { splitCouplets } from '../../utils/text';
import { toast } from '../../stores/ui';
import { shareImageFile } from '../../services/exporter';
import { Button, Chip, Field, HScroll, Muted, Row, Screen, SectionTitle, UText, IconButton } from '../../components/design-system';
import type { Writing } from '../../types';

const W = 360, H = 450; // design size (4:5); exported at 3x = 1080x1350
const FRAMES = [{ id: 'plain', name: 'سادہ' }, { id: 'line', name: 'دوہری لکیر' }, { id: 'corner', name: 'کونے' }] as const;
const COLOR_CHOICES = ['#292B29', '#F7F3EA', '#C19A5B', '#174C3A', '#FFFFFF', '#4A2A2A'];

// Screen 14 — Poetry card designer. The card is its own View (real text rendering, correct Urdu shaping & RTL),
// captured to an image at high resolution — it is NOT a screenshot of the editor.
export default function CardDesigner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [w, setW] = useState<Writing | null>(null);
  const [text, setText] = useState('');
  const [theme, setTheme] = useState<string>(BG_THEMES[0].id);
  const [frame, setFrame] = useState<(typeof FRAMES)[number]['id']>('line');
  const [size, setSize] = useState(26);
  const [spacing, setSpacing] = useState(2.0);
  const [align, setAlign] = useState<'center' | 'right'>('center');
  const [color, setColor] = useState<string | null>(null);
  const [author, setAuthor] = useState('');
  const [fmt, setFmt] = useState<'png' | 'jpg'>('png');
  const [busy, setBusy] = useState(false);
  const ref = useRef<React.ComponentRef<typeof View>>(null);

  useEffect(() => { getWriting(id).then((x) => { if (!x) return; setW(x); setAuthor(x.author); const first = splitCouplets(x.content).slice(0, 2).map((b) => b.join('\n')).join('\n\n'); setText(first || x.content.slice(0, 200)); }); }, [id]);
  const t = BG_THEMES.find((x) => x.id === theme)!;
  const fg = color ?? t.fg;

  const exportCard = async () => {
    if (!text.trim()) { toast(S.cardTooLong, 'error'); return; }
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: fmt === 'png' ? 'png' : 'jpg', quality: 1, width: W * 3, height: H * 3, result: 'tmpfile' });
      await shareImageFile(uri, fmt === 'png' ? 'image/png' : 'image/jpeg');
    } catch { toast(S.exportFailed, 'error'); } finally { setBusy(false); }
  };

  return (
    <Screen title={S.cardDesigner} back>
      <View style={{ alignItems: 'center' }}>
        <View ref={ref} collapsable={false} style={{ width: W, height: H, backgroundColor: t.bg, borderRadius: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 34 }}>
          {frame !== 'plain' ? <View style={{ position: 'absolute', top: 14, bottom: 14, width: W - 28, borderWidth: 1.5, borderColor: t.accent, borderRadius: frame === 'corner' ? 2 : 6 }} /> : null}
          {frame === 'line' ? <View style={{ position: 'absolute', top: 22, bottom: 22, width: W - 44, borderWidth: 0.8, borderColor: t.accent, opacity: 0.6 }} /> : null}
          {frame === 'corner' ? <>
            {[0, 1].map((r) => [0, 1].map((c) => <View key={`${r}${c}`} style={{ position: 'absolute', top: r ? undefined : 8, bottom: r ? 8 : undefined, [c ? 'right' : 'left']: 8, width: 26, height: 26, borderColor: t.accent, borderTopWidth: r ? 0 : 3, borderBottomWidth: r ? 3 : 0, borderLeftWidth: c ? 0 : 3, borderRightWidth: c ? 3 : 0 } as any} />))}
          </> : null}
          <UText size={size} color={fg} center={align === 'center'} spacing={spacing} style={{ alignSelf: 'stretch' }}>{text}</UText>
          {author ? <><View style={{ width: 40, height: 2, backgroundColor: t.accent, marginTop: 14, marginBottom: 4 }} /><UText size={15} color={t.accent} center spacing={1.6}>{author}</UText></> : null}
        </View>
      </View>

      <Field label={S.pickLines} value={text} onChangeText={setText} multiline style={{ minHeight: 110 }} />
      <Field label={S.author} value={author} onChangeText={setAuthor} placeholder={S.authorHint} />

      <SectionTitle>{S.background}</SectionTitle>
      <HScroll gap={10}>
        {BG_THEMES.map((b) => (
          <View key={b.id} style={{ alignItems: 'center', gap: 2 }}>
            <View onTouchEnd={() => { setTheme(b.id); setColor(null); }} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: b.bg, borderWidth: theme === b.id ? 3 : 1, borderColor: theme === b.id ? COLORS.primary : COLORS.line }} />
            <Muted>{b.name}</Muted>
          </View>
        ))}
      </HScroll>
      <SectionTitle>{S.template}</SectionTitle>
      <Row gap={8} wrap>{FRAMES.map((f) => <Chip key={f.id} label={f.name} active={frame === f.id} onPress={() => setFrame(f.id)} />)}</Row>
      <SectionTitle>{S.textColor}</SectionTitle>
      <Row gap={10} wrap>{COLOR_CHOICES.map((c) => <View key={c} onTouchEnd={() => setColor(c)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: fg === c ? 3 : 1, borderColor: fg === c ? COLORS.primary : COLORS.line }} />)}</Row>
      <SectionTitle>{S.textSize}</SectionTitle>
      <Row gap={6}><IconButton icon="remove-circle-outline" onPress={() => setSize(Math.max(14, size - 2))} /><UText size={18} center style={{ minWidth: 40 }}>{size}</UText><IconButton icon="add-circle-outline" onPress={() => setSize(Math.min(48, size + 2))} />
        <View style={{ width: 16 }} /><Muted>{S.spacing}</Muted><IconButton icon="remove-circle-outline" onPress={() => setSpacing(Math.max(1.4, +(spacing - 0.2).toFixed(1)))} /><IconButton icon="add-circle-outline" onPress={() => setSpacing(Math.min(3.2, +(spacing + 0.2).toFixed(1)))} /></Row>
      <SectionTitle>{S.alignment}</SectionTitle>
      <Row gap={8}><Chip label={S.alignCenter} icon="reorder-three-outline" active={align === 'center'} onPress={() => setAlign('center')} /><Chip label={S.alignRight} icon="menu-outline" active={align === 'right'} onPress={() => setAlign('right')} /></Row>
      <Row gap={8}><Chip label={S.formatPng} active={fmt === 'png'} onPress={() => setFmt('png')} /><Chip label={S.formatJpg} active={fmt === 'jpg'} onPress={() => setFmt('jpg')} /></Row>
      <Button icon="share-social-outline" label={S.shareCard} loading={busy} onPress={exportCard} />
    </Screen>
  );
}
void FONT; void RADII; void lineHeightFor;
