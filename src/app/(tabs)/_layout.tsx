import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { HeaderActions } from '@/features/home/header-actions';
import { onboardingStep } from '@/features/onboarding/gate';
import { activeProfile, useAppStore } from '@/state/store';
import { colors, fonts } from '@/ui/theme';

// the tab bar types its tint as any ColorValue; the tints set here are always strings, which the icons take
const tint = (color: ColorValue) => (typeof color === 'string' ? color : undefined);

export default function TabLayout() {
  const step = useAppStore((s) => onboardingStep(s.pin, activeProfile(s)));
  const shopOn = useAppStore((s) => activeProfile(s)?.settings.shop ?? true);
  // first run (PIN, child, key practice, diagnosis) comes before the map
  if (step) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'left',
        headerTitleStyle: { fontFamily: fonts.heavy, fontWeight: '800', fontSize: 20, color: colors.foreground },
        headerRight: () => <HeaderActions />,
        // the bars keep their size with larger text, as iOS's own bars do, so the title and the buttons never collide
        headerTitleAllowFontScaling: false,
        tabBarAllowFontScaling: false,
        tabBarActiveTintColor: colors.primary,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'ちず', tabBarIcon: ({ color, size }) => <Ionicons name="map" color={tint(color)} size={size} /> }}
      />
      <Tabs.Screen
        name="room"
        options={{ title: 'おへや', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={tint(color)} size={size} /> }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'ショップ',
          // a parent can turn the shop off; the seeds keep coming in
          href: shopOn ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" color={tint(color)} size={size} />,
        }}
      />
    </Tabs>
  );
}
