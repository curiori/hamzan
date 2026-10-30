import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { SeedIcon } from "@/art/icons";
import { ItemThumb } from "@/art/items";
import { SHOP, shopItem, type ShopItem, type ShopKind } from "@/game/shop";
import { activeProfile, useAppStore } from "@/state/store";
import type { Profile } from "@/state/types";
import { Button } from "@/ui/button";
import { Chip } from "@/ui/chip";
import { Sheet } from "@/ui/sheet";
import { AppText } from "@/ui/text";
import { colors, radius } from "@/ui/theme";
import { ItemPreview } from "./item-preview";

const SHELVES: { key: string; label: string; kinds: ShopKind[] }[] = [
  { key: "good", label: "グッズ", kinds: ["good"] },
  { key: "wear", label: "きせかえ", kinds: ["wear"] },
  { key: "decor", label: "かべがみ・ゆか", kinds: ["wallpaper", "floor"] },
  { key: "snack", label: "おやつ", kinds: ["snack"] },
];
const GAP = 10;

/** What the shop asks right after a purchase, by kind (snacks are given in the room). */
const AFTER_BUY: Record<Exclude<ShopKind, "snack">, { question: string; yes: string }> = {
  good: { question: "おへやに おく？", yes: "おく" },
  wear: { question: "つける？", yes: "つける" },
  wallpaper: { question: "かえる？", yes: "かえる" },
  floor: { question: "かえる？", yes: "かえる" },
};

const countOf = (p: Profile, id: string) => p.inventory[id] ?? 0;
/** goods, outfits and room styles are bought once; snacks again and again */
const owns = (p: Profile, item: ShopItem) => item.kind !== "snack" && countOf(p, item.id) > 0;
const NO_ROOM = "おく ばしょが いっぱい。もようがえで いれかえてね";

function haveNote(p: Profile, item: ShopItem): string | null {
  if (owns(p, item)) return "もっている";
  const n = countOf(p, item.id);
  return item.kind === "snack" && n > 0 ? `${n}こ もっている` : null;
}

/** The shop tab: the seeds, the shelves, and the item sheet where things are looked at and bought. */
export function ShopView() {
  const profile = useAppStore((s) => activeProfile(s));
  const [shelf, setShelf] = useState(SHELVES[0]);
  const [openId, setOpenId] = useState<string | null>(null);
  if (!profile) return null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.wallet} accessible accessibilityLabel={`ひまわりの たね ${profile.wallet.seeds}こ`}>
          <SeedIcon size={28} />
          <AppText weight="bold" style={styles.seeds}>
            {profile.wallet.seeds}
          </AppText>
          <AppText weight="bold" style={styles.unit}>
            こ
          </AppText>
        </View>
        <View style={styles.shelves}>
          {SHELVES.map((s) => (
            <Chip key={s.key} label={s.label} selected={shelf.key === s.key} onPress={() => setShelf(s)} />
          ))}
        </View>
        <View style={styles.grid}>
          {SHOP.filter((i) => shelf.kinds.includes(i.kind)).map((item) => (
            <ItemCard key={item.id} item={item} note={haveNote(profile, item)} onPress={() => setOpenId(item.id)} />
          ))}
        </View>
        <AppText style={styles.footnote}>ごほうびは れんしゅうの ふしめで とどくよ</AppText>
      </ScrollView>
      <ItemSheet item={openId ? (shopItem(openId) ?? null) : null} profile={profile} onClose={() => setOpenId(null)} />
    </View>
  );
}

function ItemCard({ item, note, onPress }: { item: ShopItem; note: string | null; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}、たね ${item.price}こ${note ? `、${note}` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        <ItemThumb id={item.id} size={64} />
      </View>
      <AppText weight="bold" style={styles.name} numberOfLines={2}>
        {item.name}
      </AppText>
      <View style={styles.price}>
        <SeedIcon size={16} />
        <AppText weight="bold" style={styles.priceText}>
          {item.price}
        </AppText>
      </View>
      {note ? (
        <View style={styles.badge}>
          <AppText weight="bold" style={styles.badgeText}>
            {note}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

type Step = "look" | "confirm" | "ask" | "done";
/** presses this soon after the sheet opened or after another press are the rest of a double tap */
const SETTLE_MS = 350;

/** One item: its preview, then かう → the confirm → what to do with it. Everything stays in this one sheet. */
function ItemSheet({ item, profile, onClose }: { item: ShopItem | null; profile: Profile; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const buyItem = useAppStore((s) => s.buyItem);
  const placeNewGood = useAppStore((s) => s.placeNewGood);
  const setDecor = useAppStore((s) => s.setDecor);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const [flow, setFlow] = useState<{ id: string | null; step: Step; note: string | null }>({ id: null, step: "look", note: null });
  // the confirm's かう buys once, however fast it is pressed again
  const confirmOpen = useRef(false);
  const lastPress = useRef(0);
  const id = item?.id ?? null;
  if (flow.id !== id) setFlow({ id, step: "look", note: null });
  useEffect(() => {
    lastPress.current = Date.now();
  }, [id]);
  const go = (step: Step, note: string | null = null) => setFlow({ id, step, note });
  const once = (fn: () => void) => () => {
    const t = Date.now();
    if (t - lastPress.current < SETTLE_MS) return;
    lastPress.current = t;
    fn();
  };

  const put = (it: ShopItem) => {
    if (it.kind === "good") go("done", placeNewGood(it.id) ? "おへやに おいたよ！" : NO_ROOM);
    else if (it.kind === "wear") {
      updateProfile(profile.id, { wearing: it.id });
      go("done", "つけたよ！");
    } else if (it.kind === "wallpaper" || it.kind === "floor") {
      setDecor(it.kind, it.id);
      go("done", "かえたよ！");
    }
  };
  const buy = (it: ShopItem) => {
    if (!confirmOpen.current) return;
    confirmOpen.current = false;
    const r = buyItem(it.id);
    if (!r.ok) go("look");
    else if (it.kind === "snack") go("look", "かったよ！");
    else go("ask");
  };

  const actions = (it: ShopItem) => {
    if (flow.step === "confirm")
      return (
        <View style={styles.ask}>
          <AppText weight="bold" style={styles.question}>
            {it.name}を {it.price}こで かう？
          </AppText>
          <View style={styles.row}>
            <Button
              size="lg"
              variant="outline"
              label="やめる"
              style={styles.flex}
              onPress={once(() => {
                confirmOpen.current = false;
                go("look");
              })}
            />
            <Button size="lg" label="かう" style={styles.flex} onPress={once(() => buy(it))} />
          </View>
        </View>
      );
    if (flow.step === "ask" && it.kind !== "snack")
      return (
        <View style={styles.ask}>
          <AppText weight="bold" style={styles.question}>
            かったよ！ {AFTER_BUY[it.kind].question}
          </AppText>
          <View style={styles.row}>
            <Button size="lg" variant="outline" label="あとで" style={styles.flex} onPress={once(onClose)} />
            <Button size="lg" label={AFTER_BUY[it.kind].yes} style={styles.flex} onPress={once(() => put(it))} />
          </View>
        </View>
      );
    if (flow.step === "done")
      return (
        <>
          <AppText weight="bold" style={flow.note === NO_ROOM ? styles.plain : styles.happy}>
            {flow.note}
          </AppText>
          <Button size="lg" variant="outline" label="とじる" onPress={once(onClose)} />
        </>
      );
    if (owns(profile, it)) return <OwnedAction item={it} profile={profile} press={once} onPut={() => put(it)} />;
    const short = Math.max(0, it.price - profile.wallet.seeds);
    return (
      <>
        {flow.note ? (
          <AppText weight="bold" style={styles.happy}>
            {flow.note}
          </AppText>
        ) : null}
        <Button
          size="lg"
          label="かう"
          disabled={short > 0}
          icon={<Ionicons name="bag-handle" size={20} color={colors.primaryForeground} />}
          onPress={once(() => {
            confirmOpen.current = true;
            go("confirm");
          })}
        />
        {short > 0 ? (
          <AppText weight="bold" style={styles.short}>
            あと {short}こ
          </AppText>
        ) : null}
      </>
    );
  };

  const note = item ? haveNote(profile, item) : null;
  return (
    <Sheet visible={!!item} title={item?.name ?? ""} onClose={once(onClose)}>
      {item ? (
        <>
          <ItemPreview item={item} profile={profile} width={Math.min(width - 40, 480)} />
          <View style={styles.priceLine}>
            <View style={styles.price} accessible accessibilityLabel={`たね ${item.price}こ`}>
              <SeedIcon size={20} />
              <AppText weight="bold" style={styles.sheetPrice}>
                {item.price}こ
              </AppText>
            </View>
            {note ? (
              <View style={styles.badge}>
                <AppText weight="bold" style={styles.badgeText}>
                  {note}
                </AppText>
              </View>
            ) : null}
          </View>
          {actions(item)}
        </>
      ) : null}
    </Sheet>
  );
}

/** For something already bought: put the good out, wear or take off the outfit, use or undo the room style. */
function OwnedAction({ item, profile, press, onPut }: { item: ShopItem; profile: Profile; press: (fn: () => void) => () => void; onPut: () => void }) {
  const updateProfile = useAppStore((s) => s.updateProfile);
  const setDecor = useAppStore((s) => s.setDecor);
  if (item.kind === "good")
    return Object.values(profile.room.layout).includes(item.id) ? (
      <AppText weight="bold" style={styles.happy}>
        おへやに おいて あるよ
      </AppText>
    ) : (
      <Button size="lg" label="おへやに おく" onPress={press(onPut)} />
    );
  if (item.kind === "wear") {
    const on = profile.wearing === item.id;
    return <Button size="lg" variant={on ? "outline" : "primary"} label={on ? "はずす" : "つける"} onPress={press(() => updateProfile(profile.id, { wearing: on ? null : item.id }))} />;
  }
  if (item.kind === "wallpaper" || item.kind === "floor") {
    const kind = item.kind;
    const on = profile.room[kind] === item.id;
    return <Button size="lg" variant={on ? "outline" : "primary"} label={on ? "もとに もどす" : "つかう"} onPress={press(() => setDecor(kind, on ? null : item.id))} />;
  }
  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 32, width: "100%", maxWidth: 640, alignSelf: "center" },
  wallet: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.amber100,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  seeds: { fontSize: 24, fontVariant: ["tabular-nums"] },
  unit: { fontSize: 16 },
  shelves: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: GAP },
  // two cards a row whatever the width (a percentage also leaves room for the scroll bar on the web)
  card: { width: "48.5%", alignItems: "center", gap: 4, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 10 },
  pressed: { backgroundColor: colors.muted },
  thumb: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.amber50, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, textAlign: "center" },
  price: { flexDirection: "row", alignItems: "center", gap: 4 },
  priceText: { fontSize: 15, fontVariant: ["tabular-nums"] },
  badge: { borderRadius: radius.sm, backgroundColor: colors.green100, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, color: colors.green700 },
  footnote: { marginTop: 6, fontSize: 13, textAlign: "center", color: colors.mutedForeground },
  priceLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sheetPrice: { fontSize: 18, fontVariant: ["tabular-nums"] },
  ask: { gap: 10, borderRadius: radius.lg, backgroundColor: colors.amber50, padding: 12 },
  question: { fontSize: 18, textAlign: "center" },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  happy: { fontSize: 16, textAlign: "center", color: colors.green700 },
  plain: { fontSize: 16, textAlign: "center" },
  short: { fontSize: 16, textAlign: "center", color: colors.amber800 },
});
