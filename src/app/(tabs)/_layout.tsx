import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { HeaderActions } from '@/features/home/header-actions';
import { onboardingStep } from '@/features/onboarding/gate';
import { activeProfile, useAppStore } from '@/state/store';
import { colors, fonts } from '@/ui/theme';

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
        tabBarActiveTintColor: colors.primary,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'ちず', tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="room"
        options={{ title: 'おへや', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'ショップ',
          // a parent can turn the shop off; the seeds keep coming in
          href: shopOn ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
