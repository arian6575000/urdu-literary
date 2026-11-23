import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { View } from 'react-native';
import {RADII} from '../constants/theme';
import { S } from '../constants/strings';
import { deleteDictEntry, listDictionary, saveDictEntry } from '../database/repositories/dictionary';
import { useQuery } from '../hooks/useAsync';
import { confirmDialog, toast, useUi } from '../stores/ui';
import type { DictEntry } from '../types';
import { Button, Empty, Field, IconButton, Loading, Muted, Row, Screen, Sheet, UText } from '../components/design-system';

// Screen 10 — Personal Urdu dictionary (feeds the correction engine and the voice engine's vocabulary hints)
export default function Dictionary() {
  const { c } = useTheme();
  const { data, loading } = useQuery(listDictionary, []);
  const [edit, setEdit] = useState<Partial<DictEntry> | null>(null);
  const save = async () => {
    if (!edit?.word?.trim()) return;
    try { await saveDictEntry({ id: edit.id, word: edit.word, note: edit.note, wrong_forms: edit.wrong_forms }); useUi.getState().bump(); setEdit(null); toast(S.done, 'ok'); }
    catch { toast(S.error, 'error'); }
  };
  const del = async (d: DictEntry) => { if (await confirmDialog(`«${d.word}» ${S.delete}؟`, { danger: true, okLabel: S.delete })) { await deleteDictEntry(d.id); useUi.getState().bump(); } };
  return (
    <Screen title={S.dictionary} back right={<IconButton icon="add-circle" size={30} color={c.primary} onPress={() => setEdit({ word: '', note: '', wrong_forms: '' })} label={S.addWord} />}>
      {loading && !data ? <Loading /> : !data?.length ? <Empty icon="text-outline" title={S.dictEmptyT} text={S.dictEmptyD} action={<Button label={S.addWord} icon="add" onPress={() => setEdit({ word: '', note: '', wrong_forms: '' })} />} /> :
        data.map((d) => (
          <View key={d.id} style={{ backgroundColor: c.surface, borderRadius: RADII.md, padding: 12, borderWidth: 1, borderColor: c.line, gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <UText size={22} color={c.primary}>{d.word}</UText>
              <Row gap={0}><IconButton icon="create-outline" size={20} onPress={() => setEdit(d)} label={S.edit} /><IconButton icon="trash-outline" size={20} color={c.danger} onPress={() => del(d)} label={S.delete} /></Row>
            </Row>
            {d.note ? <UText size={14} color={c.muted}>{d.note}</UText> : null}
            {d.wrong_forms ? <Muted>{S.wrongForms}: {d.wrong_forms.split(',').join('، ')}</Muted> : null}
          </View>
        ))}
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit?.id ? S.editWord : S.addWord}>
        <Field label={S.word} value={edit?.word ?? ''} onChangeText={(t) => setEdit({ ...edit, word: t })} autoFocus />
        <Field label={S.meaning} value={edit?.note ?? ''} onChangeText={(t) => setEdit({ ...edit, note: t })} />
        <Field label={S.wrongForms} value={(edit?.wrong_forms ?? '').split(',').join('، ')} onChangeText={(t) => setEdit({ ...edit, wrong_forms: t })} />
        <Row gap={10}><Button label={S.save} onPress={save} style={{ flex: 1 }} /><Button variant="ghost" label={S.cancel} onPress={() => setEdit(null)} style={{ flex: 1 }} /></Row>
      </Sheet>
    </Screen>
  );
}
