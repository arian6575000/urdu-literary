import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { CATEGORIES } from '../../constants/categories';
import { RADII, SPACING } from '../../constants/theme';
import { S } from '../../constants/strings';
import { listWritings } from '../../database/repositories/writings';
import { removeFromCollection } from '../../database/repositories/collections';
import { useQuery } from '../../hooks/useAsync';
import { useTheme } from '../../hooks/useTheme';
import { useSettings } from '../../stores/settings';
import { toast, useUi } from '../../stores/ui';
import { addRecent } from '../../utils/recent';
import { urduDigits } from '../../utils/text';
import { Button, Chip, Empty, HScroll, IconButton, ListRow, Muted, Row, SearchBar, Segmented, Sheet, SkeletonList, UText } from '../../components/design-system';
import { WritingCard } from '../../components/WritingCard';
import { AddToCollectionSheet } from './CollectionSheets';
import { editWriting, openCard, openWriting, removeWritings, setFavorites, shareWritings, toggleFavorite } from './actions';
import type { SortOrder, Writing } from '../../types';

type Kind = 'all' | 'poetry' | 'prose';
type Item = Writing | { id: string; spacer: true };
interface Props { favoritesOnly?: boolean; collectionId?: string; autoFocusSearch?: boolean; showRecents?: boolean; pickCard?: boolean; startKind?: Kind; header?: React.ReactNode }

/** Library, Favorites, Search, collection detail and the card picker all share this one virtualised list. */
export function LibraryView({ favoritesOnly = false, collectionId, autoFocusSearch = false, showRecents = false, pickCard = false, startKind = 'all', header }: Props) {
  const { c } = useTheme();
  const st = useSettings();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Kind>(startKind);
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [showSort, setShowSort] = useState(false);
  const [sel, setSel] = useState<Set<string> | null>(null);
  const [menu, setMenu] = useState<Writing | null>(null);
  const [collIds, setCollIds] = useState<string[] | null>(null);
  const grid = st.gridView;
  const { data, loading } = useQuery(() => listWritings({ text, kind: kind === 'all' ? undefined : kind, category: cat || undefined, sort, favoritesOnly, collectionId }), [text, kind, cat, sort, favoritesOnly, collectionId]);
  const cats = useMemo(() => CATEGORIES.filter((x) => kind === 'all' || x.poetry === (kind === 'poetry')), [kind]);
  const items: Item[] = useMemo(() => { const l: Item[] = data ?? []; return grid && l.length % 2 === 1 ? [...l, { id: '__spacer', spacer: true }] : l; }, [data, grid]);
  const selecting = !!sel;
  const toggleSel = useCallback((id: string) => setSel((p) => { const n = new Set(p ?? []); n.has(id) ? n.delete(id) : n.add(id); return n.size ? n : null; }), []);
  const submit = () => { if (showRecents && text.trim()) st.set('recentSearches', addRecent(st.recentSearches, text)); };
  const chosen = [...(sel ?? [])];
  const sortLabel = sort === 'newest' ? S.sortNewest : sort === 'oldest' ? S.sortOldest : sort === 'title' ? S.sortTitle : S.sortWords;

  const press = useCallback((w: Writing) => { if (selecting) toggleSel(w.id); else if (pickCard) openCard(w.id); else openWriting(w.id); }, [selecting, pickCard, toggleSel]);
  const render = useCallback(({ item }: { item: Item }) => ('spacer' in item ? <View style={{ flex: 1 }} /> : (
    <View style={grid ? { flex: 1 } : undefined}><WritingCard w={item} grid={grid} selecting={selecting} selected={sel?.has(item.id)} onPress={() => press(item)} onLongPress={() => toggleSel(item.id)} onFav={() => toggleFavorite(item)} onMore={() => setMenu(item)} /></View>
  )), [grid, selecting, sel, press, toggleSel]);

  const empty = !!data && data.length === 0;
  const firstRun = !text && !cat && kind === 'all';
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.md }}>
        {header}
        {selecting ? (
          <View style={{ backgroundColor: c.primary, borderRadius: RADII.lg, padding: 6, gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={0}><IconButton icon="close" color={c.onPrimary} onPress={() => setSel(null)} label={S.clearSel} /><UText size={16} color={c.onPrimary}>{`${urduDigits(chosen.length)} ${S.selected}`}</UText></Row>
              <IconButton icon="checkmark-done" color={c.onPrimary} onPress={() => setSel(new Set((data ?? []).map((w) => w.id)))} label={S.selectAll} />
            </Row>
            <Row gap={0} style={{ justifyContent: 'space-around' }}>
              <IconButton icon="heart" color={c.onPrimary} label={S.favorite} onPress={async () => { await setFavorites(chosen, true); setSel(null); }} />
              <IconButton icon="albums" color={c.onPrimary} label={S.addToColl} onPress={() => setCollIds(chosen)} />
              <IconButton icon="share-social" color={c.onPrimary} label={S.share} onPress={() => { shareWritings(chosen); setSel(null); }} />
              {collectionId ? <IconButton icon="remove-circle" color={c.onPrimary} label={S.removeFromColl} onPress={async () => { await removeFromCollection(collectionId, chosen); useUi.getState().bump(); setSel(null); toast(S.done, 'ok'); }} /> : null}
              <IconButton icon="trash" color={c.onPrimary} label={S.delete} onPress={async () => { if (await removeWritings(chosen)) setSel(null); }} />
            </Row>
          </View>
        ) : (
          <>
            <SearchBar value={text} onChangeText={setText} placeholder={showRecents ? S.searchAll : S.searchHint} onSubmit={submit} autoFocus={autoFocusSearch} />
            {!favoritesOnly ? <Segmented<Kind> value={kind} onChange={(k) => { setKind(k); setCat(''); }} options={[{ id: 'all', label: S.tabAll }, { id: 'poetry', label: S.tabPoetry }, { id: 'prose', label: S.tabProse }]} /> : null}
            <HScroll>
              <Chip label={S.all} active={!cat} onPress={() => setCat('')} />
              {cats.map((x) => <Chip key={x.id} label={x.name} icon={x.icon} active={cat === x.id} onPress={() => setCat(cat === x.id ? '' : x.id)} />)}
            </HScroll>
            <Row style={{ justifyContent: 'space-between' }}>
              <Chip label={sortLabel} icon="swap-vertical-outline" onPress={() => setShowSort(true)} />
              <Row gap={0}>
                <IconButton icon="checkbox-outline" onPress={() => { const f = data?.[0]; if (f) setSel(new Set([f.id])); }} label={S.select} />
                <IconButton icon="list-outline" active={!grid} onPress={() => st.set('gridView', false)} label={S.list} />
                <IconButton icon="grid-outline" active={grid} onPress={() => st.set('gridView', true)} label={S.grid} />
              </Row>
            </Row>
          </>
        )}
      </View>
      {showRecents && !text && st.recentSearches.length ? (
        <View style={{ paddingHorizontal: SPACING.lg, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}><UText size={15} color={c.primary}>{S.recentSearches}</UText><Button small variant="ghost" label={S.clearRecent} onPress={() => st.set('recentSearches', [])} /></Row>
          <Row wrap gap={8}>{st.recentSearches.map((r) => <Chip key={r} label={r} icon="time-outline" onPress={() => setText(r)} />)}</Row>
        </View>
      ) : null}
      {loading && !data ? <SkeletonList /> : empty ? (
        text || cat || kind !== 'all' ? <Empty icon="search-outline" title={S.emptySearchT} text={S.emptySearchD} />
          : collectionId ? <Empty icon="albums-outline" tone={c.secondary} title={S.collDetailEmptyT} text={S.collDetailEmptyD} />
            : favoritesOnly ? <Empty icon="heart-outline" tone={c.danger} title={S.emptyFavT} text={S.emptyFavD} action={<Button variant="soft" label={S.openLib} onPress={() => router.push('/(tabs)/library')} />} />
              : <Empty icon="book-outline" title={S.emptyLibT} text={S.emptyLibD} action={firstRun ? <Button label={S.writeNew} icon="create-outline" onPress={() => router.push('/create')} /> : undefined} />
      ) : (
        <FlatList
          key={grid ? 'grid' : 'list'} data={items} keyExtractor={(w) => w.id} numColumns={grid ? 2 : 1} extraData={sel}
          columnWrapperStyle={grid ? { gap: 12 } : undefined}
          contentContainerStyle={{ padding: SPACING.lg, paddingTop: SPACING.sm, gap: 12, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled" initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} removeClippedSubviews renderItem={render}
        />
      )}

      <Sheet visible={showSort} onClose={() => setShowSort(false)} title={S.sortBy}>
        {([['newest', S.sortNewest], ['oldest', S.sortOldest], ['title', S.sortTitle], ['words', S.sortWords]] as [SortOrder, string][]).map(([k, l]) => <ListRow key={k} icon={sort === k ? 'radio-button-on' : 'radio-button-off'} title={l} onPress={() => { setSort(k); setShowSort(false); }} />)}
      </Sheet>
      <Sheet visible={!!menu} onClose={() => setMenu(null)} title={menu?.title || S.untitled}>
        {menu ? (<>
          <ListRow icon="create-outline" title={S.edit} onPress={() => { const id = menu.id; setMenu(null); editWriting(id); }} />
          <ListRow icon="share-social-outline" title={S.share} tone={c.secondary} onPress={() => { const id = menu.id; setMenu(null); shareWritings([id]); }} />
          <ListRow icon="image-outline" title={S.cardDesigner} tone={c.accent} onPress={() => { const id = menu.id; setMenu(null); openCard(id); }} />
          <ListRow icon={menu.is_favorite ? 'heart-dislike-outline' : 'heart-outline'} title={menu.is_favorite ? S.unfav : S.favorite} tone={c.danger} onPress={async () => { const w = menu; setMenu(null); await toggleFavorite(w); }} />
          <ListRow icon="albums-outline" title={S.addToColl} onPress={() => { const id = menu.id; setMenu(null); setCollIds([id]); }} />
          <ListRow icon="trash-outline" title={S.delete} danger onPress={async () => { const id = menu.id; setMenu(null); await removeWritings([id]); }} />
        </>) : null}
      </Sheet>
      <AddToCollectionSheet ids={collIds} onClose={() => setCollIds(null)} onDone={() => setSel(null)} />
      {void Muted}
    </View>
  );
}
