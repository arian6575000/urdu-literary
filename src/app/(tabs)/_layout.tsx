import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, ROW, SHADOW, SIZES } from '../../constants/theme';
import { S } from '../../constants/strings';
import { Icon, IconName, UText } from '../../components/design-system';

const ITEMS: { name: string; href: string; label: string; icon: IconName; active: IconName }[] = [
  { name: 'index', href: '/(tabs)', label: S.home, icon: 'home-outline', active: 'home' },
  { name: 'library', href: '/(tabs)/library', label: S.library, icon: 'library-outline', active: 'library' },
  { name: 'voice', href: '/(tabs)/voice', label: S.voice, icon: 'mic-outline', active: 'mic' },
  { name: 'settings', href: '/(tabs)/settings', label: S.settings, icon: 'settings-outline', active: 'settings' },
];

/** One bottom-bar button. Receives onPress/isFocused from <TabTrigger asChild>. */
function TabButton({ item, isFocused, onPress }: TabTriggerSlotProps & { item: (typeof ITEMS)[number] }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, height: SIZES.tabBar, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={item.label}>
      <Icon name={isFocused ? item.active : item.icon} size={24} color={isFocused ? COLORS.primary : COLORS.muted} />
      <UText size={12} color={isFocused ? COLORS.primary : COLORS.muted} center spacing={1.4}>{item.label}</UText>
    </Pressable>
  );
}

const trigger = (i: number) => (
  <TabTrigger key={ITEMS[i].name} name={ITEMS[i].name} href={ITEMS[i].href as any} asChild><TabButton item={ITEMS[i]} /></TabTrigger>
);

/**
 * Plain JS tab layout (no react-native-screens bottom-tabs): only the focused tab is mounted, the others are unmounted,
 * so switching tabs never hides/detaches native screens and memory stays low.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot detachInactiveScreens={false} renderFn={(descriptor, { isFocused }) => (isFocused ? <View key={descriptor.route.key} style={{ flex: 1 }}>{descriptor.render()}</View> : null)} />
      {/* Expo Router finds <TabTrigger>s only when <TabList> is a direct child of <Tabs> and the triggers are direct children of its single asChild element. */}
      <TabList asChild>
        <View style={{ flexDirection: ROW, alignItems: 'flex-start', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.line, paddingBottom: insets.bottom, ...SHADOW }}>
          {trigger(0)}{trigger(1)}
          <View style={{ width: SIZES.fab + 18, height: SIZES.tabBar, alignItems: 'center' }}>
            <Pressable onPress={() => router.push('/create')} accessibilityLabel={S.newWriting} style={({ pressed }) => [{ marginTop: -30, width: SIZES.fab, height: SIZES.fab, borderRadius: SIZES.fab / 2, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: COLORS.bg, transform: [{ scale: pressed ? 0.94 : 1 }], ...SHADOW }]}>
              <Icon name="add" size={34} color={COLORS.secondary} />
            </Pressable>
          </View>
          {trigger(2)}{trigger(3)}
        </View>
      </TabList>
    </Tabs>
  );
}
