import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Hamster } from '@/art/hamster';
import { Paw, SeedIcon } from '@/art/icons';
import { ItemThumb } from '@/art/items';
import { RoomScene } from '@/art/room-scene';
import { REWARDS } from '@/game/achievements';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { ProgressBar } from '@/ui/progress-bar';
import { Stars } from '@/ui/stars';
import { AppText } from '@/ui/text';

// Temporary art preview until the room screen is ported (plan B task 6).
export default function RoomScreen() {
  const { width } = useWindowDimensions();
  return (
    <ScrollView contentContainerStyle={styles.root}>
      <RoomScene owned={REWARDS.map((r) => r.id)} wear="crown" name="テスト" width={Math.min(width - 32, 600)} />
      <View style={styles.row}>
        {(['idle', 'happy', 'oops', 'cheer'] as const).map((m) => (
          <Hamster key={m} mood={m} wear={m === 'cheer' ? 'hachimaki' : null} size={72} />
        ))}
      </View>
      <View style={styles.row}>
        {REWARDS.map((r) => (
          <ItemThumb key={r.id} id={r.id} size={40} />
        ))}
        <Paw />
        <SeedIcon />
      </View>
      <Card style={styles.card}>
        <AppText weight="bold">おへや</AppText>
        <AppText tone="muted">じゅんびちゅう</AppText>
        <Stars n={2} size={20} />
        <ProgressBar value={60} label="すすみぐあい" />
        <Button label="はじめる" onPress={() => {}} size="lg" />
        <Button label="もどる" variant="outline" onPress={() => {}} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 12, backgroundColor: '#ffffff' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  card: { gap: 10 },
});