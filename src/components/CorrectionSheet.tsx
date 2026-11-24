import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { View } from 'react-native';
import {RADII} from '../constants/theme';
import { S } from '../constants/strings';
import { applySuggestion, findSuggestions } from '../services/correction/engine';
import { listDictionary, saveDictEntry } from '../database/repositories/dictionary';
import type { DictEntry } from '../types';
import { Button, Empty, Row, Sheet, UText } from './design-system';
import { toast, useUi } from '../stores/ui';

/** Screen 09 — suggestions only. Nothing changes until the user taps «لگائیں». */
export function CorrectionSheet({ visible, text, onApply, onClose }: { visible: boolean; text: string; onApply: (t: string) => void; onClose: () => void }) {
  const { c } = useTheme();
  const [dict, setDict] = useState<DictEntry[]>([]);
  const [current, setCurrent] = useState(text);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  useEffect(() => { if (visible) { setCurrent(text); setIgnored(new Set()); listDictionary().then(setDict).catch(() => {}); } }, [visible, text]);
  const list = useMemo(() => findSuggestions(current, dict).filter((s) => !ignored.has(`${s.original}>${s.replacement}`)), [current, dict, ignored]);

  const apply = (i: number) => { const t = applySuggestion(current, list[i]); setCurrent(t); onApply(t); };
  const ignore = (i: number) => setIgnored(new Set(ignored).add(`${list[i].original}>${list[i].replacement}`));
  const learn = async (i: number) => {
    const s = list[i];
    await saveDictEntry({ word: s.replacement, wrong_forms: [...(dict.find((d) => d.word === s.replacement)?.wrong_forms.split(',') ?? []), s.original].join(',') });
    setDict(await listDictionary()); useUi.getState().bump(); toast(S.done, 'ok');
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={S.corrections}>
      <UText size={13} color={c.muted} spacing={1.7}>{S.correctionNote}</UText>
      {list.length === 0 ? <Empty icon="checkmark-circle-outline" title={S.noSuggestions} /> : list.map((s, i) => (
        <View key={`${s.id}-${s.start}`} style={{ backgroundColor: c.surface, borderRadius: RADII.md, padding: 12, gap: 6, borderWidth: 1, borderColor: c.line }}>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <UText size={20} color={c.danger} style={{ textDecorationLine: 'line-through' }}>{s.original.trim() === '' ? '␣' : s.original}</UText>
            <UText size={18} color={c.muted}>←</UText>
            <UText size={20} color={c.primary}>{s.replacement === '' ? '(حذف)' : s.replacement}</UText>
          </Row>
          <UText size={12} color={c.muted} spacing={1.6}>{s.reason}</UText>
          <Row gap={8}>
            <Button small label={S.apply} onPress={() => apply(i)} />
            <Button small variant="ghost" label={S.ignore} onPress={() => ignore(i)} />
            {s.kind === 'script' || s.kind === 'punctuation' || s.kind === 'spacing' ? null : <Button small variant="ghost" label={S.addToDict} onPress={() => learn(i)} />}
          </Row>
        </View>
      ))}
      <Button label={S.close} variant="ghost" onPress={onClose} />
    </Sheet>
  );
}
