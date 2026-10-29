import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useAppStore } from '@/state/store';
import { Button } from '@/ui/button';
import { ConfirmProvider } from '@/ui/confirm';
import { AppText } from '@/ui/text';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

/** Shown when the saved records could not be read; nothing is saved this time, so the records survive. */
function LoadErrorNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={styles.notice}>
      <AppText weight="bold" style={styles.noticeTitle}>
        保存された記録を読み込めませんでした
      </AppText>
      <AppText style={styles.noticeText}>
        記録は消していません。アプリをいったん終了して、もう一度ひらいてください。このまま使うと、今回の練習は保存されません。
      </AppText>
      <Button label="このまま使う" variant="outline" onPress={onContinue} />
    </View>
  );
}

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  const loadError = useAppStore((s) => s.loadError);
  const [continued, setContinued] = useState(false);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ConfirmProvider>
        {loadError && !continued ? (
          <LoadErrorNotice onContinue={() => setContinued(true)} />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            <Stack.Screen name="parent" />
            <Stack.Screen name="play" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="result" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          </Stack>
        )}
        <StatusBar style="dark" />
      </ConfirmProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  notice: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: colors.background },
  noticeTitle: { fontSize: 20 },
  noticeText: { fontSize: 15, lineHeight: 24 },
});