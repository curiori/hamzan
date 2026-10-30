import { Redirect } from 'expo-router';
import { ShopView } from '@/features/shop/shop-view';
import { activeProfile, useAppStore } from '@/state/store';

export default function ShopScreen() {
  const shopOn = useAppStore((s) => activeProfile(s)?.settings.shop ?? true);
  // a parent can turn the shop off while it is open; the tab is hidden then too
  if (!shopOn) return <Redirect href="/" />;
  return <ShopView />;
}
