import React from 'react';
import { Pressable, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, ROW, SHADOW, SIZES } from '../../constants/theme';
import { S } from '../../constants/strings';
import { Icon, IconName, UText } from '../../components/design-system';

const ITEMS: { name: string; label: string; icon: IconName; active: IconName }[] = [
  { name: 'index', label: S.home, icon: 'home-outline', active: 'home' },
  { name: 'library', label: S.library, icon: 'library-outline', active: 'library' },
  { name: 'voice', label: S.voice, icon: 'mic-outline', active: 'mic' },
  { name: 'settings', label: S.settings, icon: 'settings-outline', active: 'settings' },
];

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const item = (idx: number) => {
    const it = ITEMS[idx];
    const focused = state.index === state.routes.findIndex((r: any) => r.name === it.name);
    return (
      <Pressable key={it.name} onPress={() => navigation.navigate(it.name)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 }} accessibilityRole="button" accessibilityLabel={it.label}>
        <Icon name={focused ? it.active : it.icon} size={24} color={focused ? COLORS.primary : COLORS.muted} />
        <UText size={12} color={focused ? COLORS.primary : COLORS.muted} center spacing={1.4}>{it.label}</UText>
      </Pressable>
    );
  };
  return (
    <View style={{ backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.line, paddingBottom: insets.bottom, ...SHADOW }}>
      <View style={{ flexDirection: ROW, height: SIZES.tabBar, alignItems: 'center' }}>
        {item(0)}{item(1)}
        <View style={{ width: SIZES.fab + 18, alignItems: 'center' }}>
          <Pressable onPress={() => router.push('/create')} accessibilityLabel={S.newWriting} style={({ pressed }) => [{ marginTop: -30, width: SIZES.fab, height: SIZES.fab, borderRadius: SIZES.fab / 2, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: COLORS.bg, transform: [{ scale: pressed ? 0.94 : 1 }], ...SHADOW }]}>
            <Icon name="add" size={34} color={COLORS.secondary} />
          </Pressable>
        </View>
        {item(2)}{item(3)}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      {ITEMS.map((i) => <Tabs.Screen key={i.name} name={i.name} options={{ title: i.label }} />)}
    </Tabs>
  );
}
