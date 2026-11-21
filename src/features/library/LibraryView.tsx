import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { CATEGORIES } from '../../constants/categories';
import { COLORS, SPACING } from '../../constants/theme';
import { S } from '../../constants/strings';
import { listWritings } from '../../database/repositories/writings';
import { useQuery } from '../../hooks/useAsync';
import { Button, Chip, Empty, Field, HScroll, IconButton, Loading, Row } from '../../components/design-system';
import { WritingGrid } from '../../components/WritingCard';
import type { SortOrder } from '../../types';

/** Shared by the Library (Screen 04), Favorites (12) and Search (13) screens. */
export function LibraryView({ favoritesOnly = false, autoFocusSearch = false }: { favoritesOnly?: boolean; autoFocusSearch?: boolean }) {
  const [text, setText] = useState('');
  const [cat, setCat] = useState<string>('');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [grid, setGrid] = useState(false);
  const [favOnly, setFavOnly] = useState(favoritesOnly);
  const { data, loading } = useQuery(() => listWritings({ text, category: cat || undefined, sort, favoritesOnly: favOnly }), [text, cat, sort, favOnly]);
  const empty = data && data.length === 0;
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: 120 }}>
      <Field value={text} onChangeText={setText} placeholder={S.searchHint} returnKeyType="search" autoFocus={autoFocusSearch} />
      <HScroll>
        <Chip label={S.all} active={!cat} onPress={() => setCat('')} />
        {CATEGORIES.map((c) => <Chip key={c.id} label={c.name} icon={c.icon} active={cat === c.id} onPress={() => setCat(cat === c.id ? '' : c.id)} />)}
      </HScroll>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}>
          <Chip label={sort === 'newest' ? S.sortNewest : S.sortOldest} icon="swap-vertical-outline" onPress={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} />
          {!favoritesOnly ? <Chip label={S.onlyFav} icon="heart-outline" active={favOnly} onPress={() => setFavOnly(!favOnly)} /> : null}
        </Row>
        <Row gap={0}>
          <IconButton icon="list-outline" active={!grid} onPress={() => setGrid(false)} label={S.list} />
          <IconButton icon="grid-outline" active={grid} onPress={() => setGrid(true)} label={S.grid} />
        </Row>
      </Row>
      {loading && !data ? <Loading /> : empty ? (
        text || cat ? <Empty icon="search-outline" title={S.emptySearchT} text={S.emptySearchD} />
          : favOnly ? <Empty icon="heart-outline" title={S.emptyFavT} text={S.emptyFavD} />
            : <Empty icon="book-outline" title={S.emptyLibT} text={S.emptyLibD} action={<Row gap={8}><Button label={S.writeNew} icon="create-outline" onPress={() => router.push('/create')} /></Row>} />
      ) : <WritingGrid items={data ?? []} grid={grid} />}
      <View style={{ height: 1, backgroundColor: COLORS.bg }} />
    </ScrollView>
  );
}
