import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { COVER_COLORS, RADII } from '../../constants/theme';
import { S } from '../../constants/strings';
import { addToCollection, collectionIdsFor, createCollection, listCollections, removeFromCollection, updateCollection } from '../../database/repositories/collections';
import { toast, useUi } from '../../stores/ui';
import { Button, Field, Icon, Row, Sheet, UText } from '../../components/design-system';
import { useTheme } from '../../hooks/useTheme';
import type { Collection, CollectionSummary } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';

/** Create / edit a collection: title, description, cover colour. */
export function CollectionEditSheet({ value, onClose, onSaved }: { value: Partial<Collection> | null; onClose: () => void; onSaved?: (c: Collection | null) => void }) {
  const { c } = useTheme();
  const [title, setTitle] = useState(''), [desc, setDesc] = useState(''), [color, setColor] = useState(0);
  useEffect(() => { if (value) { setTitle(value.title ?? ''); setDesc(value.description ?? ''); setColor(value.color ?? 0); } }, [value]);
  const save = async () => {
    if (!title.trim()) { toast(S.nameRequired, 'error'); return; }
    let saved: Collection | null = null;
    if (value?.id) await updateCollection(value.id, { title, description: desc, color }); else saved = await createCollection({ title, description: desc, color });
    useUi.getState().bump(); toast(S.done, 'ok'); onSaved?.(saved); onClose();
  };
  return (
    <Sheet visible={!!value} onClose={onClose} title={value?.id ? S.editCollection : S.newCollection}>
      <Field label={S.collTitle} value={title} onChangeText={setTitle} autoFocus />
      <Field label={S.collDesc} value={desc} onChangeText={setDesc} multiline style={{ minHeight: 70 }} />
      <UText size={14} color={c.muted} spacing={1.5}>{S.collColor}</UText>
      <Row wrap gap={10}>
        {COVER_COLORS.map(([a, b], i) => (
          <Pressable key={i} accessibilityRole="button" accessibilityState={{ selected: color === i }} accessibilityLabel={`${S.collColor} ${i + 1}`} onPress={() => setColor(i)} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: color === i ? 3 : 0, borderColor: c.primary, padding: 2 }}>
            <LinearGradient colors={[a, b]} style={{ flex: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>{color === i ? <Icon name="checkmark" size={20} color="#FFFFFF" /> : null}</LinearGradient>
          </Pressable>
        ))}
      </Row>
      <Row gap={10}><Button label={S.save} onPress={save} style={{ flex: 1 }} /><Button variant="ghost" label={S.cancel} onPress={onClose} style={{ flex: 1 }} /></Row>
    </Sheet>
  );
}

/** Put the given writings into a collection (existing or brand new). */
export function AddToCollectionSheet({ ids, onClose, onDone }: { ids: string[] | null; onClose: () => void; onDone?: () => void }) {
  const { c } = useTheme();
  const [list, setList] = useState<CollectionSummary[]>([]);
  const [have, setHave] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<Partial<Collection> | null>(null);
  const load = async () => { setList(await listCollections()); if (ids?.length === 1) setHave(new Set(await collectionIdsFor(ids[0]))); else setHave(new Set()); };
  useEffect(() => { if (ids) load(); }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = async (col: CollectionSummary) => {
    if (!ids) return;
    if (have.has(col.id)) { await removeFromCollection(col.id, ids); toast(S.done, 'ok'); }
    else { await addToCollection(col.id, ids); toast(S.addedToColl, 'ok'); }
    useUi.getState().bump(); onDone?.(); await load();
  };
  return (
    <>
      <Sheet visible={!!ids && !creating} onClose={onClose} title={S.addToColl}>
        {list.map((col) => (
          <Pressable key={col.id} accessibilityRole="button" accessibilityState={{ selected: have.has(col.id) }} onPress={() => toggle(col)} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, minHeight: 56, padding: 10, borderRadius: RADII.md, backgroundColor: c.surface, borderWidth: 1, borderColor: have.has(col.id) ? c.primary : c.line }}>
            <LinearGradient colors={COVER_COLORS[col.color % COVER_COLORS.length]} style={{ width: 36, height: 36, borderRadius: 12 }} />
            <View style={{ flex: 1 }}><UText size={16} lines={1}>{col.title}</UText></View>
            <Icon name={have.has(col.id) ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={have.has(col.id) ? c.primary : c.muted} />
          </Pressable>
        ))}
        <Button variant="soft" icon="add" label={S.newCollectionInline} onPress={() => setCreating({ title: '', description: '', color: 0 })} />
        <Button variant="ghost" label={S.close} onPress={onClose} />
      </Sheet>
      <CollectionEditSheet value={creating} onClose={() => setCreating(null)} onSaved={async (col) => { if (col && ids) { await addToCollection(col.id, ids); useUi.getState().bump(); onDone?.(); toast(S.addedToColl, 'ok'); onClose(); } }} />
    </>
  );
}
