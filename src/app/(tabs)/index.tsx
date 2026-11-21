import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { CATEGORIES } from '../../constants/categories';
import { COLORS, RADII, SPACING } from '../../constants/theme';
import { S } from '../../constants/strings';
import { countWritings, getWriting, listWritings } from '../../database/repositories/writings';
import { getSetting, setSetting } from '../../database/repositories/settings';
import { useQuery } from '../../hooks/useAsync';
import { urduDigits } from '../../utils/text';
import { Button, Card, Empty, Icon, IconButton, Muted, Row, Screen, SectionTitle, UText } from '../../components/design-system';
import { WritingCard } from '../../components/WritingCard';

// Screen 03 — Home
export default function Home() {
  const { data } = useQuery(async () => {
    const [counts, recent] = await Promise.all([countWritings(), listWritings({ limit: 4 })]);
    const draftId = await getSetting('open_draft');
    const draft = draftId ? await getWriting(draftId) : null;
    return { counts, recent, draft: draft && (draft.content.trim() || draft.title.trim()) ? draft : null };
  }, []);
  const counts = data?.counts, recent = data?.recent ?? [];
  return (
    <Screen right={<IconButton icon="search-outline" onPress={() => router.push('/search')} label={S.search} />} title="">
      <View style={{ gap: 2, marginTop: -8 }}>
        <UText size={15} color={COLORS.secondary}>{S.welcome}</UText>
        <UText size={34} color={COLORS.primary} spacing={1.7}>{S.appTagline}</UText>
      </View>

      {data?.draft ? (
        <Card onPress={() => router.push({ pathname: '/writing/edit', params: { id: data.draft!.id } })} style={{ backgroundColor: COLORS.secondarySoft, borderColor: COLORS.secondary }}>
          <Row gap={10}><Icon name="alert-circle-outline" size={24} color={COLORS.secondary} /><View style={{ flex: 1 }}><UText size={15}>{S.draftRecovered}</UText><UText size={13} color={COLORS.muted} lines={1}>{data.draft.title || S.untitled}</UText></View></Row>
        </Card>
      ) : null}

      <Row gap={12} align="stretch">
        <Pressable onPress={() => router.push('/create')} style={({ pressed }) => [{ flex: 1, backgroundColor: COLORS.primary, borderRadius: RADII.lg, padding: 16, gap: 8, minHeight: 112, justifyContent: 'space-between', opacity: pressed ? 0.9 : 1 }]}>
          <Icon name="create-outline" size={30} color={COLORS.secondary} /><UText size={18} color="#F7F3EA" spacing={1.6}>{S.writeNew}</UText>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/voice')} style={({ pressed }) => [{ flex: 1, backgroundColor: COLORS.secondary, borderRadius: RADII.lg, padding: 16, gap: 8, minHeight: 112, justifyContent: 'space-between', opacity: pressed ? 0.9 : 1 }]}>
          <Icon name="mic-outline" size={30} color={COLORS.white} /><UText size={18} color={COLORS.white} spacing={1.6}>{S.writeByVoice}</UText>
        </Pressable>
      </Row>

      <Row gap={12} align="stretch">
        <Card style={{ flex: 1 }} onPress={() => router.push('/(tabs)/library')}><UText size={30} color={COLORS.primary} spacing={1.4}>{urduDigits(counts?.total ?? 0)}</UText><Muted>{S.total}</Muted></Card>
        <Card style={{ flex: 1 }} onPress={() => router.push('/favorites')}><Row gap={6}><UText size={30} color={COLORS.danger} spacing={1.4}>{urduDigits(counts?.favorites ?? 0)}</UText><Icon name="heart" size={18} color={COLORS.danger} /></Row><Muted>{S.favorites}</Muted></Card>
      </Row>

      <SectionTitle>{S.categories}</SectionTitle>
      <Row wrap gap={8}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.id} onPress={() => router.push({ pathname: '/create', params: { cat: c.id } })} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 42, borderRadius: RADII.pill, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line }}>
            <Icon name={c.icon} size={18} color={COLORS.primary} /><UText size={15} spacing={1.5}>{c.name}</UText>
            {counts?.byCategory[c.id] ? <UText size={12} color={COLORS.muted} spacing={1.4}>{urduDigits(counts.byCategory[c.id])}</UText> : null}
          </Pressable>
        ))}
      </Row>

      <SectionTitle right={recent.length ? <Button small variant="ghost" label={S.seeAll} onPress={() => router.push('/(tabs)/library')} /> : undefined}>{S.recent}</SectionTitle>
      {recent.length === 0 ? <Empty icon="book-outline" title={S.emptyLibT} text={S.emptyLibD} /> : <View style={{ gap: SPACING.md }}>{recent.map((w) => <WritingCard key={w.id} w={w} />)}</View>}
    </Screen>
  );
}
