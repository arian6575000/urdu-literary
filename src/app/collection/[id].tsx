import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COVER_COLORS, RADII } from '../../constants/theme';
import { S } from '../../constants/strings';
import { getCollection } from '../../database/repositories/collections';
import { useQuery } from '../../hooks/useAsync';
import { IconButton, Screen, UText, Loading } from '../../components/design-system';
import { LibraryView } from '../../features/library/LibraryView';
import { CollectionEditSheet } from '../../features/library/CollectionSheets';

// One collection: gradient cover + the shared library list filtered to it
export default function CollectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: col } = useQuery(() => getCollection(id), [id]);
  const [edit, setEdit] = useState(false);
  if (!col) return <Screen title="" back><Loading /></Screen>;
  const header = (
    <LinearGradient colors={COVER_COLORS[col.color % COVER_COLORS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: RADII.lg, padding: 16, gap: 2 }}>
      <UText size={24} color="#FFFFFF" spacing={1.7}>{col.title}</UText>
      {col.description ? <UText size={14} color="rgba(255,255,255,0.92)" spacing={1.7}>{col.description}</UText> : null}
    </LinearGradient>
  );
  return (
    <Screen title={col.title} back scroll={false} pad={false} right={<IconButton icon="create-outline" onPress={() => setEdit(true)} label={S.editCollection} />}>
      <LibraryView collectionId={id} header={header} />
      <CollectionEditSheet value={edit ? col : null} onClose={() => setEdit(false)} />
    </Screen>
  );
}
