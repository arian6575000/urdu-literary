import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COVER_COLORS, RADII, SHADOW } from '../constants/theme';
import { S } from '../constants/strings';
import { deleteCollection, listCollections } from '../database/repositories/collections';
import { useQuery } from '../hooks/useAsync';
import { useTheme } from '../hooks/useTheme';
import { confirmDialog, useUi } from '../stores/ui';
import { urduDigits } from '../utils/text';
import { Button, Empty, Icon, IconButton, Row, Screen, SkeletonList, UText } from '../components/design-system';
import { CollectionEditSheet } from '../features/library/CollectionSheets';
import type { Collection, CollectionSummary } from '../types';

function CoverCard({ col, onOpen, onEdit, onDelete }: { col: CollectionSummary; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={col.title} onPress={onOpen} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }, SHADOW]}>
      <LinearGradient colors={COVER_COLORS[col.color % COVER_COLORS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: RADII.lg, padding: 16, minHeight: 130, gap: 4 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}><Icon name="albums" size={21} color="#FFFFFF" /></View>
          <Row gap={0}><IconButton icon="create-outline" color="#FFFFFF" size={20} onPress={onEdit} label={S.edit} /><IconButton icon="trash-outline" color="#FFFFFF" size={20} onPress={onDelete} label={S.delete} /></Row>
        </Row>
        <UText size={21} color="#FFFFFF" lines={1} spacing={1.7}>{col.title}</UText>
        {col.description ? <UText size={13} color="rgba(255,255,255,0.92)" lines={2} spacing={1.6}>{col.description}</UText> : null}
        <UText size={12} color="rgba(255,255,255,0.95)" spacing={1.4}>{`${urduDigits(col.count)} ${S.writingsN} · ${urduDigits(col.favorites)} ${S.favN}`}</UText>
      </LinearGradient>
    </Pressable>
  );
}

// Poetry / prose collections
export default function Collections() {
  const { c } = useTheme();
  const { data, loading } = useQuery(listCollections, []);
  const [edit, setEdit] = useState<Partial<Collection> | null>(null);
  const del = async (col: CollectionSummary) => { if (await confirmDialog(S.confirmDeleteColl, { danger: true, okLabel: S.delete })) { await deleteCollection(col.id); useUi.getState().bump(); } };
  return (
    <Screen title={S.collections} back right={<IconButton icon="add-circle" size={30} color={c.primary} onPress={() => setEdit({ title: '', description: '', color: 0 })} label={S.newCollection} />}>
      {loading && !data ? <SkeletonList n={3} height={130} /> : !data?.length ? <Empty icon="albums-outline" tone={c.secondary} title={S.collEmptyT} text={S.collEmptyD} action={<Button icon="add" label={S.newCollection} onPress={() => setEdit({ title: '', description: '', color: 0 })} />} /> :
        data.map((col) => <CoverCard key={col.id} col={col} onOpen={() => router.push({ pathname: '/collection/[id]', params: { id: col.id } })} onEdit={() => setEdit(col)} onDelete={() => del(col)} />)}
      <CollectionEditSheet value={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}
