import React from 'react';
import { Pressable, View } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADII, ROW, SHADOW, SIZES } from '../../constants/theme';
import { S } from '../../constants/strings';
import { useTheme } from '../../hooks/useTheme';
import { Icon, IconName, UText } from '../../components/design-system';

type Item = { name: string; href: string; label: string; icon: IconName; active: IconName; tone: 'primary' | 'secondary' | 'accent' | 'danger' | 'sky'; center?: boolean };
const ITEMS: Item[] = [
  { name: 'index', href: '/(tabs)', label: S.navHome, icon: 'home-outline', active: 'home', tone: 'primary' },
  { name: 'library', href: '/(tabs)/library', label: S.navWritings, icon: 'library-outline', active: 'library', tone: 'secondary' },
  { name: 'studio', href: '/(tabs)/studio', label: S.navCreate, icon: 'color-wand-outline', active: 'color-wand', tone: 'accent', center: true },
  { name: 'favorites', href: '/(tabs)/favorites', label: S.navFav, icon: 'heart-outline', active: 'heart', tone: 'danger' },
  { name: 'more', href: '/(tabs)/more', label: S.navMore, icon: 'grid-outline', active: 'grid', tone: 'sky' },
];

/** One bottom-bar button. Receives onPress/isFocused from <TabTrigger asChild>. Active tab = tinted pill + coloured icon + bold label. */
function TabButton({ item, isFocused, onPress }: TabTriggerSlotProps & { item: Item }) {
  const { c, g } = useTheme();
  const tone = c[item.tone];
  return (
    <Pressable onPress={onPress} style={{ flex: 1, height: SIZES.tabBar, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="tab" accessibilityState={{ selected: isFocused }} accessibilityLabel={item.label}>
      {item.center ? (
        <LinearGradient colors={g.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 54, height: 54, borderRadius: 27, marginTop: -22, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: c.bg, ...SHADOW }}>
          <Icon name={isFocused ? item.active : item.icon} size={26} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={{ width: 52, height: 30, borderRadius: RADII.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: isFocused ? c.tint : 'transparent' }}>
          <Icon name={isFocused ? item.active : item.icon} size={23} color={isFocused ? tone : c.muted} />
        </View>
      )}
      <UText size={12} color={isFocused ? tone : c.muted} center spacing={1.4}>{item.label}</UText>
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
  const { c } = useTheme();
  return (
    <Tabs>
      <TabSlot detachInactiveScreens={false} renderFn={(descriptor, { isFocused }) => (isFocused ? <View key={descriptor.route.key} style={{ flex: 1 }}>{descriptor.render()}</View> : null)} />
      {/* Expo Router finds <TabTrigger>s only when <TabList> is a direct child of <Tabs> and the triggers are direct children of its single asChild element. */}
      <TabList asChild>
        <View style={{ flexDirection: ROW, alignItems: 'flex-end', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom, ...SHADOW }}>
          {trigger(0)}{trigger(1)}{trigger(2)}{trigger(3)}{trigger(4)}
        </View>
      </TabList>
    </Tabs>
  );
}
