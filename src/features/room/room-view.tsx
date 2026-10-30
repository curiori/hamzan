import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Hamster } from "@/art/hamster";
import { Bubble, HamsterSide, Heart } from "@/art/hamster-poses";
import { ItemThumb } from "@/art/items";
import { RoomScene } from "@/art/room-scene";
import { REWARDS, unlockedRewards } from "@/game/achievements";
import { rewardStats } from "@/state/profile";
import { activeProfile, useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

/** The hamster's room with the earned goods, and the goods list where wearables can be put on. */
export function RoomView() {
  const profile = useAppStore((s) => activeProfile(s));
  const updateProfile = useAppStore((s) => s.updateProfile);
  const { width } = useWindowDimensions();
  if (!profile) return null;
  const owned = unlockedRewards(rewardStats(profile));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppText weight="bold" style={styles.count}>
        ごほうび {owned.length} / {REWARDS.length}
      </AppText>
      <View style={styles.room}>
        <RoomScene owned={owned} wear={profile.wearing} name={profile.nickname} width={Math.min(width - 32, 640)} />
      </View>
      <AppText weight="bold" accessibilityRole="header" style={styles.title}>
        ごほうび
      </AppText>
      {REWARDS.map((r) => {
        const has = owned.includes(r.id);
        const on = profile.wearing === r.id;
        return (
          <View key={r.id} style={styles.item}>
            <View style={[styles.thumb, !has && styles.notOwned]}>
              <ItemThumb id={r.id} size={44} />
            </View>
            <View style={styles.itemText}>
              <AppText weight="bold">{r.name}</AppText>
              <AppText style={styles.need}>{has ? "もっている" : r.need}</AppText>
            </View>
            {has && r.wear ? (
              <Button
                variant={on ? "primary" : "outline"}
                label="つける"
                accessibilityLabel={`${r.name}を つける`}
                icon={on ? <Ionicons name="checkmark" size={18} color={colors.primaryForeground} /> : undefined}
                onPress={() => updateProfile(profile.id, { wearing: on ? null : r.id })}
              />
            ) : null}
            {has && !r.wear ? <Ionicons name="checkmark-circle" size={22} color={colors.green700} accessibilityLabel="もっている" /> : null}
          </View>
        );
      })}
      <PosePreview width={Math.min(width - 32, 640)} />
    </ScrollView>
  );
}

// Temporary preview of the new room art (plan C task 3); task 4 replaces it with the moving room.
function PosePreview({ width }: { width: number }) {
  return (
    <View style={styles.preview}>
      <RoomScene owned={REWARDS.map((r) => r.id)} wear={null} name="プレビュー" width={width} />
      <View style={styles.previewRow}>
        <HamsterSide frame={0} size={70} />
        <HamsterSide frame={1} size={70} />
        <HamsterSide frame={0} size={70} wear="crown" />
        <HamsterSide frame={1} size={70} cheeks />
      </View>
      <View style={styles.previewRow}>
        <Hamster pose="sleep" size={70} />
        <Hamster pose="cheeks" size={70} />
        <Hamster pose="read" size={70} />
        <Hamster pose="pet" size={70} />
      </View>
      <View style={styles.previewRow}>
        <Bubble text="きゅっ" />
        <Bubble text="なるほど" />
        <Bubble text="Zzz" />
        <Heart />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  count: { fontSize: 14, alignSelf: "flex-end", fontVariant: ["tabular-nums"] },
  room: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: "hidden", alignItems: "center", backgroundColor: colors.card },
  title: { marginTop: 8, fontSize: 20 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 10 },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  notOwned: { opacity: 0.35 },
  itemText: { flex: 1, minWidth: 0 },
  need: { fontSize: 13 },
  preview: { marginTop: 16, gap: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 },
  previewRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 12 },
});
