import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RADII, SHADOW } from '../../constants/theme';
import { S } from '../../constants/strings';
import { useTheme } from '../../hooks/useTheme';
import { GradientCard, Icon, Screen, UText, type IconName } from '../../components/design-system';

function Tile({ icon, title, sub, colors, route }: { icon: IconName; title: string; sub: string; colors: [string, string]; route: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => router.push(route as any)} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, SHADOW]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: RADII.lg, padding: 18, flexDirection: 'row-reverse', alignItems: 'center', gap: 14, minHeight: 96 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={28} color="#FFFFFF" /></View>
        <View style={{ flex: 1 }}><UText size={21} color="#FFFFFF" spacing={1.7}>{title}</UText><UText size={13} color="rgba(255,255,255,0.92)" spacing={1.6}>{sub}</UText></View>
      </LinearGradient>
    </Pressable>
  );
}

// "تخلیق" — everything that makes something new
export default function Studio() {
  const { c, g } = useTheme();
  return (
    <Screen title={S.navCreate}>
      <GradientCard colors={g.hero}><UText size={22} color="#FFFFFF" spacing={1.7}>{S.homeSub}</UText><UText size={14} color="rgba(255,255,255,0.9)">{S.appTagline}</UText></GradientCard>
      <Tile icon="create" title={S.newWriting} sub={S.chooseCategory} colors={[c.primary, '#9B5DE5']} route="/create" />
      <Tile icon="mic" title={S.writeByVoice} sub={S.ob2t} colors={[c.accent, '#F2830F']} route="/voice" />
      <Tile icon="image" title={S.newPoetryCard} sub={S.ob3t} colors={[c.secondary, c.sky]} route="/card-pick" />
      <Tile icon="albums" title={S.newCollection} sub={S.collections} colors={['#C2255C', '#F06595']} route="/collections" />
    </Screen>
  );
}
