import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { ItemThumb } from "@/art/items";
import { SHOP } from "@/game/shop";
import type { Profile } from "@/state/types";
import { Button } from "@/ui/button";
import { Sheet } from "@/ui/sheet";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

/** The snacks the child has, with how many; giving one closes the list so the child can watch the hamster eat. */
export function SnackSheet({ open, profile, onClose, onGive }: { open: boolean; profile: Profile; onClose: () => void; onGive: (id: string) => void }) {
  // one snack each time the list is opened, however fast あげる is pressed again
  const gave = useRef(false);
  useEffect(() => {
    if (open) gave.current = false;
  }, [open]);
  const snacks = SHOP.filter((i) => i.kind === "snack" && (profile.inventory[i.id] ?? 0) > 0);

  return (
    <Sheet visible={open} title="おやつを あげる" onClose={onClose}>
      {snacks.map((i) => (
        <View key={i.id} style={styles.row}>
          <View style={styles.thumb}>
            <ItemThumb id={i.id} size={44} />
          </View>
          <View style={styles.rowText}>
            <AppText weight="bold">{i.name}</AppText>
            <AppText style={styles.count}>{profile.inventory[i.id]}こ</AppText>
          </View>
          <Button
            label="あげる"
            accessibilityLabel={`${i.name}を あげる`}
            onPress={() => {
              if (gave.current) return;
              gave.current = true;
              onGive(i.id);
            }}
          />
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 10 },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.amber50, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, minWidth: 0 },
  count: { fontSize: 13, fontVariant: ["tabular-nums"] },
});
