import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { onboardingStep } from '@/features/onboarding/gate';
import { activeProfile, useAppStore } from '@/state/store';

export default function TabLayout() {
  const step = useAppStore((s) => onboardingStep(s.pin, activeProfile(s)));
  // first run (PIN, child, key practice, diagnosis) comes before the map
  if (step) return <Redirect href="/onboarding" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
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
        options={{ title: 'ショップ', tabBarIcon: ({ color, size }) => <Ionicons name="storefront" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
