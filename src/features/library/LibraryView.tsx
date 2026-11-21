import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { CATEGORIES } from '../../constants/categories';
import { SPACING } from '../../constants/theme';
import { S } from '../../constants/strings';
import { listWritings } from '../../database/repositories/writings';
import { useQuery } from '../../hooks/useAsync';
import { Button, Chip, Empty, Field, HScroll, IconButton, Loading, Row } from '../../components/design-system';
import { WritingCard } from '../../components/WritingCard';
import type { SortOrder, Writing } from '../../types';

type Item = Writing | { id: string; spacer: true };

/** Shared by the Library (Screen 04), Favorites (12) and Search (13) screens. Virtualised: only visible cards are rendered. */
export function LibraryView({ favoritesOnly = false, autoFocusSearch = false }: { favoritesOnly?: boolean; autoFocusSearch?: boolean }) {
  const [text, setText] = useState('');
  const [cat, setCat] = useState<string>('');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [grid, setGrid] = useState(false);
  const [favOnly, setFavOnly] = useState(favoritesOnly);
  const { data, loading } = useQuery(() => listWritings({ text, category: cat || undefined, sort, favoritesOnly: favOnly }), [text, cat, sort, favOnly]);
  const empty = data && data.length === 0;
  const items: Item[] = useMemo(() => {
    const list: Item[] = data ?? [];
    return grid && list.length % 2 === 1 ? [...list, { id: '__spacer', spacer: true }] : list;
  }, [data, grid]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.md }}>
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
      </View>
      {loading && !data ? <Loading /> : empty ? (
        text || cat ? <Empty icon="search-outline" title={S.emptySearchT} text={S.emptySearchD} />
          : favOnly ? <Empty icon="heart-outline" title={S.emptyFavT} text={S.emptyFavD} />
            : <Empty icon="book-outline" title={S.emptyLibT} text={S.emptyLibD} action={<Button label={S.writeNew} icon="create-outline" onPress={() => router.push('/create')} />} />
      ) : (
        <FlatList
          key={grid ? 'grid' : 'list'} data={items} keyExtractor={(w) => w.id} numColumns={grid ? 2 : 1}
          columnWrapperStyle={grid ? { gap: 12 } : undefined}
          contentContainerStyle={{ padding: SPACING.lg, paddingTop: SPACING.sm, gap: 12, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled" initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} removeClippedSubviews
          renderItem={({ item }) => ('spacer' in item ? <View style={{ flex: 1 }} /> : grid ? <View style={{ flex: 1 }}><WritingCard w={item} grid /></View> : <WritingCard w={item} />)}
        />
      )}
    </View>
  );
}
