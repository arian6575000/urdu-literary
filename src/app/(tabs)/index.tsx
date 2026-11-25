import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COVER_COLORS, RADII, ROW, SHADOW, SPACING } from '../../constants/theme';
import { S } from '../../constants/strings';
import { APP_NAME } from '../../constants/app';
import { countWritings, getWriting, listWritings } from '../../database/repositories/writings';
import { listCollections } from '../../database/repositories/collections';
import { getSetting } from '../../database/repositories/settings';
import { useQuery } from '../../hooks/useAsync';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, urduDigits } from '../../utils/text';
import { authorOf } from '../../stores/settings';
import { Button, Card, Empty, GradientCard, Icon, IconButton, Row, SectionTitle, SkeletonList, UText, type IconName } from '../../components/design-system';
import { DevCredit } from '../../components/design-system/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { preview } from '../../components/WritingCard';
import { catById } from '../../constants/categories';
import { openWriting, toggleFavorite } from '../../features/library/actions';
import type { Writing } from '../../types';

const greeting = () => { const h = new Date().getHours(); return h < 5 ? S.greetNight : h < 12 ? S.greetMorning : h < 17 ? S.greetDay : h < 21 ? S.greetEvening : S.greetNight; };

function Quick({ icon, label, colors, onPress }: { icon: IconName; label: string; colors: [string, string]; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [{ flex: 1, borderRadius: RADII.lg, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, SHADOW]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: RADII.lg, minHeight: 112, padding: 12, justifyContent: 'space-between' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={22} color="#FFFFFF" /></View>
        <UText size={15} color="#FFFFFF" spacing={1.6}>{label}</UText>
      </LinearGradient>
    </Pressable>
  );
}

function MiniWriting({ w }: { w: Writing }) {
  const { c } = useTheme();
  const author = authorOf(w);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={w.title || S.untitled} onPress={() => openWriting(w.id)} style={({ pressed }) => [{ backgroundColor: c.surface, borderRadius: RADII.lg, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: c.line, gap: 2, overflow: 'hidden', opacity: pressed ? 0.9 : 1 }, SHADOW]}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, [ROW === 'row' ? 'left' : 'right']: 0, width: 5, backgroundColor: c.primary }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flexDirection: ROW, alignItems: 'center', gap: 6, backgroundColor: c.tint, borderRadius: RADII.pill, paddingHorizontal: 10 }}><Icon name={catById(w.category_id).icon} size={14} color={c.primary} /><UText size={12} color={c.primary} spacing={1.5}>{catById(w.category_id).name}</UText></View>
        {w.is_favorite ? <Icon name="heart" size={16} color={c.danger} /> : null}
      </Row>
      <UText size={19} color={c.primary} lines={1} spacing={1.8}>{w.title || S.untitled}</UText>
      <UText size={15} lines={2} spacing={1.9}>{preview(w) || ' '}</UText>
      <Row style={{ justifyContent: 'space-between' }}>
        <UText size={12} color={c.muted} spacing={1.4}>{formatDate(w.updated_at)}</UText>
        {author ? <UText size={13} color={c.secondary} lines={1} spacing={1.5}>{author}</UText> : null}
      </Row>
    </Pressable>
  );
}

// Home dashboard
export default function Home() {
  const { c, g } = useTheme();
  const { data, loading } = useQuery(async () => {
    const [counts, recent, favs, colls] = await Promise.all([countWritings(), listWritings({ limit: 6 }), listWritings({ favoritesOnly: true, limit: 6 }), listCollections()]);
    const draftId = await getSetting('open_draft');
    const draft = draftId ? await getWriting(draftId) : null;
    return { counts, recent, favs, colls, draft: draft && (draft.content.trim() || draft.title.trim()) ? draft : (recent[0] ?? null), isDraft: !!(draft && (draft.content.trim() || draft.title.trim())) };
  }, []);
  const counts = data?.counts;
  const stats: { n: number; label: string; icon: IconName; tone: string }[] = [
    { n: counts?.total ?? 0, label: S.total, icon: 'documents', tone: c.primary }, { n: counts?.favorites ?? 0, label: S.favorites, icon: 'heart', tone: c.danger },
    { n: counts?.words ?? 0, label: S.totalWords, icon: 'text', tone: c.secondary }, { n: data?.colls.length ?? 0, label: S.statCollections, icon: 'albums', tone: c.accent },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 32, gap: SPACING.md }} showsVerticalScrollIndicator={false}>
        <GradientCard colors={g.hero} style={{ paddingVertical: 18 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <UText size={15} color="rgba(255,255,255,0.85)">{greeting()}</UText>
              <UText size={30} color="#FFFFFF" spacing={1.7}>{APP_NAME}</UText>
              <UText size={15} color="rgba(255,255,255,0.9)">{S.homeSub}</UText>
            </View>
            <IconButton icon="search" color="#FFFFFF" bg="rgba(255,255,255,0.22)" onPress={() => router.push('/search')} label={S.search} />
          </Row>
        </GradientCard>

        <Row gap={10} align="stretch">
          <Quick icon="create" label={S.writeNew} colors={[c.primary, '#9B5DE5']} onPress={() => router.push('/create')} />
          <Quick icon="mic" label={S.writeByVoice} colors={[c.accent, '#F2830F']} onPress={() => router.push('/voice')} />
          <Quick icon="image" label={S.newPoetryCard} colors={[c.secondary, c.sky]} onPress={() => router.push('/card-pick')} />
        </Row>

        {data?.draft ? (
          <Card tinted onPress={() => router.push({ pathname: '/writing/edit', params: { id: data.draft!.id } })} label={S.continueWriting}>
            <Row gap={12}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Icon name="pencil" size={22} color={c.onPrimary} /></View>
              <View style={{ flex: 1 }}><UText size={13} color={c.muted} spacing={1.5}>{data.isDraft ? S.draftRecovered : S.continueWriting}</UText><UText size={17} color={c.primary} lines={1}>{data.draft.title || S.untitled}</UText></View>
              <Icon name="chevron-back" size={20} color={c.muted} />
            </Row>
          </Card>
        ) : null}

        {loading && !data ? <SkeletonList n={2} height={90} /> : (
          <>
            <SectionTitle>{S.stats}</SectionTitle>
            <Row gap={10} align="stretch">
              {stats.map((s) => (
                <View key={s.label} style={{ flex: 1, backgroundColor: c.surface, borderRadius: RADII.md, padding: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center' }}>
                  <Icon name={s.icon} size={18} color={s.tone} /><UText size={22} color={s.tone} center spacing={1.4}>{urduDigits(s.n)}</UText><UText size={11} color={c.muted} center spacing={1.3}>{s.label}</UText>
                </View>
              ))}
            </Row>

            <SectionTitle right={data?.recent.length ? <Button small variant="ghost" label={S.seeAll} onPress={() => router.push('/(tabs)/library')} /> : undefined}>{S.recent}</SectionTitle>
            {data && data.recent.length === 0 ? <Empty icon="book-outline" title={S.emptyLibT} text={S.emptyLibD} action={<Button icon="create-outline" label={S.writeNew} onPress={() => router.push('/create')} />} /> : <View style={{ gap: 12 }}>{data?.recent.slice(0, 4).map((w) => <MiniWriting key={w.id} w={w} />)}</View>}

            {data && data.favs.length ? (<><SectionTitle right={<Button small variant="ghost" label={S.seeAll} onPress={() => router.push('/(tabs)/favorites')} />}>{S.favSection}</SectionTitle><View style={{ gap: 12 }}>{data.favs.slice(0, 3).map((w) => <MiniWriting key={w.id} w={w} />)}</View></>) : null}

            <SectionTitle right={<Button small variant="ghost" label={S.seeAll} onPress={() => router.push('/collections')} />}>{S.myCollections}</SectionTitle>
            {data && data.colls.length === 0 ? <Card onPress={() => router.push('/collections')} label={S.newCollection}><Row gap={10}><Icon name="add-circle" size={26} color={c.secondary} /><UText size={15} color={c.muted}>{S.noCollectionsHome}</UText></Row></Card> : (
              <View style={{ flexDirection: ROW, flexWrap: 'wrap', gap: 12 }}>
                {data?.colls.slice(0, 6).map((col) => (
                  <Pressable key={col.id} accessibilityRole="button" accessibilityLabel={col.title} onPress={() => router.push({ pathname: '/collection/[id]', params: { id: col.id } })} style={[{ width: '48%', borderRadius: RADII.lg }, SHADOW]}>
                    <LinearGradient colors={COVER_COLORS[col.color % COVER_COLORS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 104, borderRadius: RADII.lg, padding: 12, justifyContent: 'space-between' }}>
                      <Icon name="albums" size={22} color="rgba(255,255,255,0.92)" />
                      <View><UText size={17} color="#FFFFFF" lines={1} spacing={1.7}>{col.title}</UText><UText size={13} color="rgba(255,255,255,0.92)" spacing={1.5}>{`${col.count} ${S.writingsN}`}</UText></View>
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
        <DevCredit style={{ marginTop: 6 }} />
      </ScrollView>
      {void toggleFavorite}
    </SafeAreaView>
  );
}
