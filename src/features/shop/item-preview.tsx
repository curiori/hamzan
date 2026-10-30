import { StyleSheet, View } from "react-native";
import { Hamster } from "@/art/hamster";
import { ItemThumb } from "@/art/items";
import { RoomScene } from "@/art/room-scene";
import { previewLayout, roomGoods } from "@/game/room";
import type { ShopItem } from "@/game/shop";
import { ownedGoods } from "@/state/profile";
import type { Profile } from "@/state/types";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";

/** How an item would look: the hamster wearing it, the child's room with the good out or restyled, or the snack itself. */
export function ItemPreview({ item, profile, width }: { item: ShopItem; profile: Profile; width: number }) {
  if (item.kind === "wear")
    return (
      <View style={styles.box} accessible accessibilityRole="image" accessibilityLabel={`${item.name}を つけた ハムスター`}>
        <Hamster wear={item.id} size={Math.min(width * 0.5, 170)} />
      </View>
    );
  if (item.kind === "snack")
    return (
      <View style={styles.box}>
        <ItemThumb id={item.id} size={96} />
        <AppText weight="bold" style={styles.note}>
          おへやで あげられるよ
        </AppText>
      </View>
    );

  // a good is shown where it would go; with every slot of its kind taken, in its usual place instead of what stands there
  const owned = ownedGoods(profile);
  const { layout, full } = item.kind === "good" ? previewLayout(profile.room.layout, owned, item.id) : { layout: roomGoods(profile.room.layout, owned), full: false };
  return (
    <View style={styles.preview}>
      <View style={styles.room}>
        <RoomScene
          layout={layout}
          wallpaper={item.kind === "wallpaper" ? item.id : profile.room.wallpaper}
          floor={item.kind === "floor" ? item.id : profile.room.floor}
          wear={profile.wearing}
          name={profile.nickname}
          width={width - 2}
        />
      </View>
      {full ? <AppText style={styles.full}>いまは おく ばしょが いっぱい。もようがえで いれかえてね</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", gap: 8, minHeight: 150, borderRadius: radius.lg, backgroundColor: colors.amber50, padding: 12 },
  note: { fontSize: 15 },
  preview: { gap: 6 },
  room: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  full: { fontSize: 14, textAlign: "center" },
});
