import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { catById, isPoetry } from '../../constants/categories';
import { COLORS, RADII, SPACING } from '../../constants/theme';
import { S } from '../../constants/strings';
import { deleteWriting, getWriting, listVersions, restoreVersion, setFavorite } from '../../database/repositories/writings';
import { useQuery } from '../../hooks/useAsync';
import { useSettings } from '../../stores/settings';
import { confirmDialog, toast, useUi } from '../../stores/ui';
import { formatDate, formatTime, splitCouplets } from '../../utils/text';
import { Button, Divider, Empty, Icon, IconButton, ListRow, Loading, Muted, Row, Screen, Sheet, UText } from '../../components/design-system';

// Screen 11 — Reading mode
export default function Reader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { readerSize, readerSpacing, readerAlign } = useSettings();
  const { data: w, loading } = useQuery(() => getWriting(id), [id]);
  const { data: versions } = useQuery(() => listVersions(id), [id]);
  const [showVer, setShowVer] = useState(false);
  if (loading && !w) return <Screen title="" back><Loading /></Screen>;
  if (!w) return <Screen title="" back><Empty icon="alert-circle-outline" title={S.notFound} /></Screen>;
  const c = catById(w.category_id);
  const poetry = isPoetry(w.category_id);
  const align = poetry ? 'center' : readerAlign === 'center' ? 'center' : undefined;

  const remove = async () => {
    if (!(await confirmDialog(S.confirmDelete, { danger: true, okLabel: S.delete }))) return;
    await deleteWriting(w.id); useUi.getState().bump(); router.back();
  };
  const fav = async () => { await setFavorite(w.id, !w.is_favorite); useUi.getState().bump(); };

  return (
    <Screen
      title="" back pad={false}
      right={<Row gap={0}>
        <IconButton icon={w.is_favorite ? 'heart' : 'heart-outline'} color={w.is_favorite ? COLORS.danger : COLORS.text} onPress={fav} label={S.favorite} />
        <IconButton icon="create-outline" onPress={() => router.push({ pathname: '/writing/edit', params: { id: w.id } })} label={S.edit} />
        <IconButton icon="time-outline" onPress={() => setShowVer(true)} label={S.versions} />
        <IconButton icon="trash-outline" color={COLORS.danger} onPress={remove} label={S.delete} />
      </Row>}
      footer={
        <Row gap={10} style={{ padding: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.line }}>
          <Button icon="share-social-outline" label={S.share} onPress={() => router.push({ pathname: '/export', params: { ids: w.id } })} style={{ flex: 1 }} />
          <Button icon="image-outline" variant="gold" label={S.cardDesigner} onPress={() => router.push({ pathname: '/card/[id]', params: { id: w.id } })} style={{ flex: 1 }} />
        </Row>
      }>
      <ScrollView contentContainerStyle={{ padding: SPACING.xl, paddingBottom: 40, gap: 6 }}>
        <Row gap={6} style={{ justifyContent: align === 'center' ? 'center' : 'flex-start' }}><Icon name={c.icon} size={16} color={COLORS.secondary} /><UText size={14} color={COLORS.secondary}>{c.name}</UText></Row>
        <UText size={readerSize + 10} color={COLORS.primary} center={align === 'center'} spacing={1.8}>{w.title || S.untitled}</UText>
        {w.author ? <UText size={16} color={COLORS.muted} center={align === 'center'}>{w.author}</UText> : null}
        <View style={{ height: 2, width: 64, backgroundColor: COLORS.secondary, borderRadius: 1, alignSelf: align === 'center' ? 'center' : 'flex-end', marginVertical: 10 }} />
        {poetry
          ? splitCouplets(w.content).map((b, i) => (
            <View key={i} style={{ marginBottom: 18 }}>{b.map((l, k) => <UText key={k} size={readerSize} center spacing={readerSpacing} selectable>{l}</UText>)}</View>
          ))
          : w.content.split('\n').map((p, i) => (p.trim() ? <UText key={i} size={readerSize} center={align === 'center'} spacing={readerSpacing} selectable style={{ marginBottom: 8 }}>{p}</UText> : <View key={i} style={{ height: 10 }} />))}
        <Divider />
        <Muted>{S.created}: {formatDate(w.created_at)} · {formatTime(w.created_at)}</Muted>
        <Muted>{S.updated}: {formatDate(w.updated_at)} · {formatTime(w.updated_at)}</Muted>
      </ScrollView>

      <Sheet visible={showVer} onClose={() => setShowVer(false)} title={S.versions}>
        {!versions || versions.length === 0 ? <UText size={15} color={COLORS.muted} center>{S.noVersions}</UText> : versions.map((v) => (
          <View key={v.id} style={{ backgroundColor: COLORS.surface, borderRadius: RADII.md, padding: 12, gap: 4, borderWidth: 1, borderColor: COLORS.line }}>
            <Muted>{formatDate(v.created_at)} · {formatTime(v.created_at)}</Muted>
            <UText size={16} lines={2}>{v.title || v.content}</UText>
            <Button small variant="ghost" label={S.restoreVersion} onPress={async () => { await restoreVersion(v.id); useUi.getState().bump(); setShowVer(false); toast(S.done, 'ok'); }} />
          </View>
        ))}
      </Sheet>
    </Screen>
  );
}
void ListRow;
