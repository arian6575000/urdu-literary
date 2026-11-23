import React, { useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Animated, Easing, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { S } from '../constants/strings';
import { APP_NAME } from '../constants/app';
import { useSettings } from '../stores/settings';
import { Icon, UText } from '../components/design-system';

// Screen 01 — splash: an open book whose two pages fan out, then the title fades in.
export default function Splash() {
  const { c } = useTheme();
  const page = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(page, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(text, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(500),
    ]).start(() => router.replace(useSettings.getState().onboarded ? '/(tabs)' : '/onboarding'));
  }, [page, text]);
  const rot = (sign: number) => page.interpolate({ inputRange: [0, 1], outputRange: [`${sign * 78}deg`, `${sign * 8}deg`] });
  return (
    <LinearGradient colors={['#6A3DD1', '#2B1B5A']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <View style={{ width: 150, height: 110, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Animated.View style={{ position: 'absolute', bottom: 0, width: 66, height: 96, backgroundColor: '#FFFCF5', borderTopRightRadius: 6, borderBottomRightRadius: 6, transform: [{ translateX: -33 }, { rotateZ: rot(-1) }, { translateX: 33 }], opacity: page }} />
        <Animated.View style={{ position: 'absolute', bottom: 0, width: 66, height: 96, backgroundColor: '#F4ECD8', borderTopLeftRadius: 6, borderBottomLeftRadius: 6, transform: [{ translateX: 33 }, { rotateZ: rot(1) }, { translateX: -33 }], opacity: page }} />
        <Animated.View style={{ opacity: text, position: 'absolute', top: -6 }}><Icon name="sparkles" size={34} color="#F2B01E" /></Animated.View>
      </View>
      <Animated.View style={{ opacity: text, alignItems: 'center', gap: 2, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <UText size={40} color="#F7F3EA" center spacing={1.8}>{APP_NAME}</UText>
        <UText size={17} color="#F2B01E" center>{S.splashLine}</UText>
      </Animated.View>
    </LinearGradient>
  );
}
