import { StyleSheet, View } from "react-native";
import { ItemThumb } from "@/art/items";
import { SLOT_NAME, slotChoices, type SlotId } from "@/game/room";
import { itemName } from "@/game/shop";
import { ownedGoods } from "@/state/profile";
import { useAppStore } from "@/state/store";
import type { Profile } from "@/state/types";
import { Button } from "@/ui/button";
import { Sheet } from "@/ui/sheet";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";
import { roomGoods } from "./stage-rules";

/** Rearranging one slot: put an owned good of its kind there (stored, or moved from another slot), or store what is there. */
export function ArrangeSheet({ slot, profile, onClose }: { slot: SlotId | null; profile: Profile; onClose: () => void }) {
  const placeGood = useAppStore((s) => s.placeGood);
  const owned = ownedGoods(profile);
  const layout = roomGoods(profile.room.layout, owned);
  const here = slot ? (layout[slot] ?? null) : null;
  const choices = slot ? slotChoices(slot, layout, owned) : [];
  const put = (id: string | null) => {
    if (slot) placeGood(slot, id);
    onClose();
  };

  return (
    <Sheet visible={!!slot} title={slot ? SLOT_NAME[slot] : ""} subtitle={here ? `いまは ${itemName(here)}` : "いまは なにも ないよ"} onClose={onClose}>
      {choices.map((c) => (
        <View key={c.id} style={styles.row}>
          <View style={styles.thumb}>
            <ItemThumb id={c.id} size={44} />
          </View>
          <View style={styles.rowText}>
            <AppText weight="bold">{itemName(c.id)}</AppText>
            <AppText style={styles.from}>{c.from ? `${SLOT_NAME[c.from]} から うごかす` : "しまって ある"}</AppText>
          </View>
          <Button label="おく" accessibilityLabel={`${itemName(c.id)}を おく`} onPress={() => put(c.id)} />
        </View>
      ))}
      {slot && !here && !choices.length ? <AppText style={styles.empty}>ここに おける ものは まだ ないよ</AppText> : null}
      {here ? <Button size="lg" variant="outline" label={`${itemName(here)}を しまう`} onPress={() => put(null)} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 10 },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.amber50, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, minWidth: 0 },
  from: { fontSize: 13 },
  empty: { fontSize: 15, textAlign: "center", paddingVertical: 12 },
});
