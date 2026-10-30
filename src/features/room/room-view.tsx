import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { ItemThumb } from "@/art/items";
import { REWARDS, unlockedRewards } from "@/game/achievements";
import type { SlotId } from "@/game/room";
import { SHOP } from "@/game/shop";
import { rewardStats } from "@/state/profile";
import { activeProfile, useAppStore } from "@/state/store";
import { Button } from "@/ui/button";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";
import { ArrangeSheet } from "./arrange-sheet";
import { RoomStage } from "./room-stage";
import { SnackSheet } from "./snack-sheet";

/** One line of もちもの: the drawing, the name, a note, and what can be done with it. */
function Thing({ id, name, note, owned = true, children }: { id: string; name: string; note: string; owned?: boolean; children?: ReactNode }) {
  return (
    <View style={styles.item}>
      <View style={[styles.thumb, !owned && styles.notOwned]}>
        <ItemThumb id={id} size={44} />
      </View>
      <View style={styles.itemText}>
        <AppText weight="bold">{name}</AppText>
        <AppText style={styles.need}>{note}</AppText>
      </View>
      {children}
    </View>
  );
}

/** The hamster's room with もようがえ and おやつ under it, and もちもの: the rewards and what was bought, where outfits are put on. */
export function RoomView() {
  const profile = useAppStore((s) => activeProfile(s));
  const updateProfile = useAppStore((s) => s.updateProfile);
  const setDecor = useAppStore((s) => s.setDecor);
  const feedSnack = useAppStore((s) => s.feedSnack);
  const allGoods = useAppStore((s) => !!s.dev.roomAllGoods);
  const { width } = useWindowDimensions();
  const [arranging, setArranging] = useState(false);
  const [slot, setSlot] = useState<SlotId | null>(null);
  const [snacksOpen, setSnacksOpen] = useState(false);
  const [feeding, setFeeding] = useState<{ snack: string } | null>(null);
  if (!profile) return null;
  const earned = unlockedRewards(rewardStats(profile));
  const count = (id: string) => profile.inventory[id] ?? 0;
  const bought = SHOP.filter((i) => i.kind !== "snack" && count(i.id) > 0);
  const snacks = SHOP.filter((i) => i.kind === "snack" && count(i.id) > 0);
  // the test switch's room is not the saved one, so it cannot be rearranged
  const canArrange = !allGoods;
  // the room's frame has a 1pt border on each side
  const stageWidth = Math.min(width - 32, 640) - 2;

  const wearButton = (id: string, name: string) => {
    const on = profile.wearing === id;
    return (
      <Button
        variant={on ? "primary" : "outline"}
        label="つける"
        accessibilityLabel={`${name}を つける`}
        icon={on ? <Ionicons name="checkmark" size={18} color={colors.primaryForeground} /> : undefined}
        onPress={() => updateProfile(profile.id, { wearing: on ? null : id })}
      />
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppText weight="bold" style={styles.count}>
        ごほうび {earned.length} / {REWARDS.length}
      </AppText>
      <View style={styles.room}>
        <RoomStage
          key={profile.id}
          profile={profile}
          width={stageWidth}
          allGoods={allGoods}
          arranging={arranging && canArrange}
          onSlot={setSlot}
          feeding={feeding}
        />
      </View>
      <View style={styles.actions}>
        {canArrange ? (
          <Button
            variant={arranging ? "primary" : "outline"}
            label={arranging ? "おわる" : "もようがえ"}
            icon={<Ionicons name={arranging ? "checkmark" : "color-wand-outline"} size={18} color={arranging ? colors.primaryForeground : colors.foreground} />}
            onPress={() => setArranging(!arranging)}
            style={styles.action}
          />
        ) : null}
        {snacks.length && !arranging ? (
          <Button
            variant="outline"
            label="おやつ"
            icon={<Ionicons name="nutrition-outline" size={18} color={colors.foreground} />}
            onPress={() => setSnacksOpen(true)}
            style={styles.action}
          />
        ) : null}
      </View>
      {arranging && canArrange ? <AppText style={styles.hint}>「＋」を おすと、そこに おく ものを えらべるよ</AppText> : null}

      <AppText weight="bold" accessibilityRole="header" style={styles.title}>
        もちもの
      </AppText>
      {REWARDS.map((r) => {
        const has = earned.includes(r.id);
        return (
          <Thing key={r.id} id={r.id} name={r.name} note={has ? "もっている" : r.need} owned={has}>
            {has && r.wear ? wearButton(r.id, r.name) : null}
            {has && !r.wear ? <Ionicons name="checkmark-circle" size={22} color={colors.green700} accessibilityLabel="もっている" /> : null}
          </Thing>
        );
      })}
      {bought.map((i) => {
        if (i.kind === "wear")
          return (
            <Thing key={i.id} id={i.id} name={i.name} note="ショップで かった">
              {wearButton(i.id, i.name)}
            </Thing>
          );
        if (i.kind === "wallpaper" || i.kind === "floor") {
          const kind = i.kind;
          const on = profile.room[kind] === i.id;
          return (
            <Thing key={i.id} id={i.id} name={i.name} note={on ? "つかって いる" : "ショップで かった"}>
              <Button variant={on ? "outline" : "primary"} label={on ? "もどす" : "つかう"} accessibilityLabel={`${i.name}を ${on ? "もとに もどす" : "つかう"}`} onPress={() => setDecor(kind, on ? null : i.id)} />
            </Thing>
          );
        }
        return <Thing key={i.id} id={i.id} name={i.name} note={Object.values(profile.room.layout).includes(i.id) ? "おへやに ある" : "しまって ある"} />;
      })}
      {snacks.map((i) => (
        <Thing key={i.id} id={i.id} name={i.name} note={`おやつ ${count(i.id)}こ`} />
      ))}

      <ArrangeSheet slot={slot} profile={profile} onClose={() => setSlot(null)} />
      <SnackSheet
        open={snacksOpen}
        profile={profile}
        onClose={() => setSnacksOpen(false)}
        onGive={(id) => {
          setSnacksOpen(false);
          if (feedSnack(id)) setFeeding({ snack: id });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  count: { fontSize: 14, alignSelf: "flex-end", fontVariant: ["tabular-nums"] },
  room: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: "hidden", alignItems: "center", backgroundColor: colors.card },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
  hint: { fontSize: 14, textAlign: "center" },
  title: { marginTop: 8, fontSize: 20 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 10 },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  notOwned: { opacity: 0.35 },
  itemText: { flex: 1, minWidth: 0 },
  need: { fontSize: 13 },
});
