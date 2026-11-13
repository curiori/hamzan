---
description: はむ算 Expo 版の段階 4（動き回るおへや）の実装計画
author: GitHub Copilot
ms.date: 2026-10-30
ms.topic: how-to
---

# はむ算 Expo 版 動き回るおへや Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** おへやのハムスターが自分で歩き、持っているグッズで遊び、タップや長押しに反応するようにする（段階 4、実機チェックリスト B）。

**Architecture:** 部屋の置き場所（スロット）と自動配置（`src/game/room.ts`）、行動を決めるエンジン（`src/game/hamster-brain.ts`）は React Native を import しない純粋な TS にして、シード付きで bun のテストを書く。画面（`src/features/room/room-stage.tsx`）はエンジンが返す行動を Reanimated の共有値で動かし、行動が終わったらエンジンに次を聞く。SVG は描き直さず、包んだ View の transform と、重ねたポーズの不透明度だけを変える。

**Tech Stack:** Expo SDK 54、react-native-reanimated 4、react-native-svg、expo-haptics、@react-navigation/native の `useIsFocused`

**Spec:** `docs/superpowers/specs/2026-10-29-hamzan-ios-design.md`（「おへや：動き回るハムスター」「フェーズ 4」「実機チェックリスト B」。前の計画: `docs/superpowers/plans/2026-10-29-hamzan-ios-learning-ui.md`）

## Global Constraints

- 前の計画の Global Constraints を引き継ぐ（SDK 54 固定、Expo Go のモジュールだけ、bun、`src/domain` は変更しない、コミットの書式、React Native を import するファイルは bun のテストから読まない）
- 部屋の設計上の座標は 400×260。画面の幅に合わせて拡大縮小する
- スロットは 11 か所（ゆか・大 3、ゆか・小 3、かべ 2、てんじょう 2、まどべ 1）
- 手前にあるもの（y 座標が大きいもの）ほど上に描き、ハムスターがグッズの前と後ろを行き来できるようにする
- おなかや元気などの数値は持たない。休んでも何も失わない
- 夜は 20 時から 6 時
- 位置、向き、はずみは Reanimated の共有値で動かし、UI スレッドで描く。SVG 自体は描き直さず、包んだ View の transform だけを変える
- 経路探索はしない。直線で動く
- おへやが画面に出ていないとき（別のタブ、ほかの画面、バックグラウンド）は止める
- 端末の「視差効果を減らす」がオンなら、移動をゆっくりにし、跳ねる動きを減らす
- 新しい依存は入れない。おやつをあげる動きは段階 5（ショップ）で作る

## Review Focus

- おへやが見えていないとき（タブの切り替え、保護者画面や出題を開いた、アプリがバックグラウンド）は、タイマーとアニメーションが止まり、戻ると続きから動く。Task 4 の画面確認で、見えない間に行動が進まないことを確かめる
- 歩いている途中や遊んでいる途中のタップは、いまいる場所から反応し、ワープしたり反応が積み重なったりしない。Task 2 のテスト（here から反応する）と Task 5（走っているアニメーションを止めてから反応する）で押さえる
- 部屋を開いている間に持ち物やこどもが変わっても、持っていないグッズへ行かない。Task 2 のテスト（world から消えたグッズの予定を捨てる）と Task 4（world を作り直す）で押さえる
- 行動が止まったり、すぐ終わる行動を延々とくり返したりしない（グッズがない、夜で house がない、同じ場所への移動）。Task 2 のテスト（最短の時間と最短の距離）で押さえる
- 画面の幅が違っても（320〜430pt）、ハムスターとグッズが部屋からはみ出さず、タップした場所へ向かう。Task 1 のテスト（座標の変換）で押さえる

---

### Task 1: 部屋の置き場所と自動配置

**Files:**
- Create: `src/game/room.ts`
- Test: `tests/game/room.test.ts`

**Interfaces:**
- Produces: `ROOM_W = 400`、`ROOM_H = 260`、`FLOOR: { x0: number; x1: number; y0: number; y1: number }`（ハムスターの足もとが動ける範囲）、`type Point = { x: number; y: number }`
- Produces: `type SlotKind = "floorLarge" | "floorSmall" | "wall" | "ceiling" | "sill"`、`type SlotId = "floorL1" | "floorL2" | "floorL3" | "floorS1" | "floorS2" | "floorS3" | "wall1" | "wall2" | "ceil1" | "ceil2" | "sill"`、`SLOTS: Record<SlotId, { kind: SlotKind; x: number; y: number; scale: number; spot: Point; depth: number }>`（x、y、scale は 60×60 の絵の置き方、spot は遊ぶときにハムスターが立つ足もと、depth は重ね順）
- Produces: `GOOD_KIND: Record<string, SlotKind>`（desk、wheel、house は floorLarge、tunnel、bowl は floorSmall、flower は sill、swing、hammock は ceiling。きせかえは入れない）、`DEFAULT_SLOT: Record<string, SlotId>`（desk→floorL1、wheel→floorL2、house→floorL3、tunnel→floorS1、bowl→floorS3、flower→sill、swing→ceil1、hammock→ceil2）
- Produces: `type RoomLayout = Partial<Record<SlotId, string>>`、`fits(goodId: string, slotId: SlotId): boolean`、`autoLayout(owned: string[], kinds: Record<string, SlotKind> = GOOD_KIND): RoomLayout`（`DEFAULT_SLOT` が空いていればそこ、ふさがっていれば同じ種類の空き、なければしまう）、`placedGoods(layout: RoomLayout): { id: string; slot: SlotId; spot: Point; depth: number }[]`（depth の小さい順）、`clampToFloor(p: Point): Point`、`toScreen(p: Point, width: number): Point`、`toRoom(p: Point, width: number): Point`

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("every reward good gets its default slot and wearables get none", () => {
  // autoLayout(REWARDS の id すべて) の中身 === DEFAULT_SLOT の 8 つ。hachimaki、crown は入らない
});
test("a good only fits slots of its kind", () => {
  // fits("wheel", "floorL3") true、fits("wheel", "sill") false、fits("crown", "floorL1") false
});
test("when a kind is full the next good is stored", () => {
  // kinds で floorLarge のグッズを 4 つ渡す → 3 つ置かれ、4 つ目は layout にない
});
test("slots stay inside the room and every spot is on the floor", () => {});
test("screen and room coordinates convert both ways at 320 and 430 points", () => {});
test("clampToFloor keeps any point on the floor", () => {});
```

- [ ] **Step 2:** `bun test tests/game/room.test.ts` が、モジュールがないことで失敗するのを確かめる
- [ ] **Step 3:** 実装する。座標は Web 版の配置（`src/art/room-scene.tsx` の SPOTS、400×220）に近づけ、ゆかを下へ広げる。spot はグッズの手前のゆか（天井とまどべは真下のゆか）にし、直線で行き来できる位置にする
- [ ] **Step 4:** テストが通ることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: add room slots and auto layout`

### Task 2: 行動エンジン

**Files:**
- Create: `src/game/hamster-brain.ts`
- Test: `tests/game/hamster-brain.test.ts`

**Interfaces:**
- Consumes: Task 1 の `Point`、`FLOOR`、`clampToFloor`。`src/domain/rng.ts` の `mulberry32`（Brain には数値のシードだけを持ち、1 歩ごとに `mulberry32(seed)` から必要な数と次のシードを引く）
- Produces:
  - `type IdleAct = "blink" | "ear" | "look" | "groom"`
  - `type Activity = { kind: "idle"; act: IdleAct; ms: number } | { kind: "walk"; to: Point; dash: boolean; carry: boolean } | { kind: "play"; good: string; variant: "normal" | "tumble"; ms: number } | { kind: "sleep"; inHouse: boolean; ms: number } | { kind: "react"; how: "hop" | "pet"; ms: number } | { kind: "celebrate"; ms: number }`
  - `interface World { goods: { id: string; spot: Point }[]; night: boolean; reduceMotion: boolean }`
  - `interface Brain { pos: Point; now: Activity; plan: Activity[]; lastGood: string | null; seed: number }`
  - `type BrainEvent = { type: "done" } | { type: "tap" } | { type: "press" } | { type: "tapGood"; good: string } | { type: "tapFloor"; at: Point }`
  - `createBrain(seed: number, world: World, here: Point, start: { celebrate: boolean; newGood: string | null }): Brain`
  - `stepBrain(b: Brain, world: World, ev: BrainEvent, here: Point): Brain`（here は画面上のいまの足もと。どの反応もここから始める）
  - `isNight(hour: number): boolean`、`newlyOwned(seen: string[] | null, owned: string[]): string | null`
  - 定数 `MIN_ACTIVITY_MS = 600`、`MIN_WALK = 24`
- 規則（spec「行動のしくみ」「タッチへの反応」）:
  - 予定（plan）がなければ、重み付きの抽選で次を決める。昼は、たいき、さんぽ、グッズであそぶ、ダッシュ（速い移動を 2〜3 回）、ひるね。グッズがなければ遊ばない
  - 遊ぶグッズは world のグッズから選び、2 つ以上あるときは直前と同じものを選ばない。遊ぶ前にそのグッズの spot まで歩く
  - wheel はときどき variant "tumble"（転がり出てびっくり）。bowl のあと、house があれば carry の移動で house へ運び、house で短く遊ぶ
  - 夜は、house があればそこへ行って長く寝ることが多い。なければその場で寝る
  - tap は react hop（寝ていても起きて hop）。press は react pet。tapGood は world にあるグッズならそこへ歩いて遊ぶ（なければ何もしない）。tapFloor は clampToFloor した場所へ歩く。tap、press、tapGood、tapFloor は予定を捨ててから始める
  - start.celebrate なら最初は celebrate。start.newGood があれば、その spot へダッシュして遊ぶ（celebrate のあと）
  - reduceMotion のときは、ダッシュも tumble も選ばない
  - "done" で予定を進めるとき、world にないグッズで遊ぶ予定は捨てる

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("the same seed gives the same activities", () => {});
test("walks never leave the floor, even for taps outside it", () => {});
test("plays only with goods in the world and ignores taps on goods it does not have", () => {});
test("does not pick the same good twice in a row when it has two or more", () => {});
test("at night it mostly sleeps in its house and a tap wakes it", () => {
  // 夜、house あり：抽選 500 回で sleep が 7 割以上、そのすべてが inHouse。sleep 中の tap → react hop
});
test("reduce motion never dashes or tumbles", () => {});
test("a goal day starts with a celebration and a new good gets a rush", () => {});
test("a tap mid-walk reacts from where the hamster is", () => {});
test("never stalls: timed activities last at least MIN_ACTIVITY_MS and walks cover at least MIN_WALK", () => {
  // グッズなし、夜で house なし、グッズ 1 つ、の各 world で 500 回
});
test("goods that left the world are dropped from the plan", () => {});
test("isNight is true from 20:00 to 5:59", () => {
  // 19 false、20 true、23 true、0 true、5 true、6 false
});
test("newlyOwned names a good gained since the last visit and nothing on the first visit", () => {});
```

- [ ] **Step 2:** テストが失敗することを確かめる
- [ ] **Step 3:** 実装する。重みと秒数はファイルの先頭の定数にまとめる（たいき 1.5〜4 秒、遊ぶ 4〜8 秒、夜の睡眠 20〜40 秒、ひるね 8〜15 秒、hop 0.9 秒、pet 1.6 秒、celebrate 2.4 秒）
- [ ] **Step 4:** テストが通ることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: add hamster behavior engine`

### Task 3: 部屋とポーズの絵

**Files:**
- Modify: `src/art/room-scene.tsx`（背景を 400×260 に。静止画の `RoomScene` は Task 1 の配置で描く）
- Modify: `src/art/items.tsx`（動く部分を分ける。まわしぐるまの台と回る輪、ブランコとハンモックのつり位置）
- Create: `src/art/hamster-poses.tsx`

**Interfaces:**
- Consumes: Task 1 の `SLOTS`、`autoLayout`、`placedGoods`
- Produces: `RoomBackground()`（400×260）、`RoomScene({ owned, wear, name, width })`（静止画。診断中の「おへやを みる」で使う）、`ITEM_PARTS: Record<string, { base: ReactNode; moving?: ReactNode; pivot?: Point }>`（moving は回る、揺れる部分。pivot は回転の中心）
- Produces: `HamsterSide({ frame: 0 | 1, wear })`（右向きの歩き 2 枚。左向きは包む View の scaleX で反転）、`HamsterBody` に `pose?: "sleep" | "cheeks" | "read" | "pet"`（目を閉じる、ほおぶくろ、小さな本、目を細める）、`Bubble({ text })`、`Heart()`
- 正面の絵は Web 版のまま。新しい絵は同じ配色（`FUR`、`CREAM`、`PINK`、`INK`）で描く

- [ ] **Step 1:** 背景と静止画を 400×260 とスロットの配置に直し、おへやのタブ（いまは静止画）と診断中の「おへやを みる」が web 表示で崩れないことを見る
- [ ] **Step 2:** 横向きの歩き 2 枚、ポーズ、吹き出し、ハートを描く。おへやのタブの下へ一時的に並べて web 表示で見る（Task 4 で消す）
- [ ] **Step 3:** `bun run typecheck`、`bun run lint` が通ることを確かめる
- [ ] **Step 4:** コミットする。メッセージ `feat: draw the room, side walk and hamster poses`

### Task 4: 動くおへや

**Files:**
- Create: `src/features/room/room-stage.tsx`、`src/features/room/use-room-brain.ts`
- Modify: `src/features/room/room-view.tsx`（静止画の代わりに `RoomStage`）、`src/state/types.ts` と `src/state/create-store.ts`（`DevSettings.roomAllGoods`、既定 false）、`src/features/parent/test-pane.tsx`（スイッチ「おへやに すべての グッズを おく（表示だけ）」）

**Interfaces:**
- Consumes: Task 1、2、3 のすべて。`useIsFocused`、`useAppActive`、Reanimated の `useReducedMotion`
- Produces: `RoomStage({ profile, width })`、`useRoomBrain({ goods, start, active })` が `{ activity: Activity; send: (ev: BrainEvent) => void; motion: { x; y; hop; tilt; flip } }` を返す（motion は共有値）
- 持ち物は `autoLayout(unlockedRewards(rewardStats(p)))`。`dev.roomAllGoods` のときは REWARDS のグッズすべて（記録は変えない）

- [ ] **Step 1:** use-room-brain を作る。walk は `withTiming`（距離 ÷ 速さ。設計座標で歩き 40、ダッシュ 130、reduceMotion の歩き 28 /秒）で x と y を動かし、終わりを `runOnJS` で "done" にする。時間で終わる行動は setTimeout。`active`（フォーカスがあり、アプリがアクティブ）が false の間は `cancelAnimation` とタイマーの解除をして行動を進めない。true に戻ったら、いまの位置から "done" で再開する。world（グッズ、夜、reduceMotion）は行動を決めるたびに新しく作る
- [ ] **Step 2:** room-stage を作る。背景の Svg は一度だけ描く。グッズは 1 つずつ絶対配置の View（zIndex は depth）、ハムスターの View の zIndex は行動が変わるときに足もとの y から決める。ポーズは行動の種類で選び、歩きの 2 枚は不透明度を共有値で交互にする。遊び方：wheel は輪を速く回し、tumble で転がり出て oops。swing と hammock はつり位置を中心に揺れる（hammock では sleep のポーズ）。house と tunnel は中にいる間ハムスターを隠す（tunnel は反対側から出る）。desk は read と「なるほど」。flower は小さくうなずいてにおいをかぐ。bowl は cheeks。sleep は「Zzz」。たいきは、blink がまぶたの不透明度、ear と groom が小さな傾き、look が向きの反転。celebrate は 2〜3 回はねて cheer の顔。ハムスターの `accessibilityLabel` に、いまの行動を書く（例「ハムスター、さんぽ ちゅう」）
- [ ] **Step 3:** おへやのタブに RoomStage を出し、Task 3 の確認用の並びを消す。web 表示で、テスト用の「おへやに すべての グッズを おく」をオンにして 1 分見て、自分で歩き、遊び、止まらないことを確かめる。ちずのタブへ移り、隠れたおへやのハムスターの `accessibilityLabel` が 10 秒間変わらないことを確かめる
- [ ] **Step 4:** `bun run typecheck`、`bun run lint`、`bun test` が通ることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: animate the hamster room with the behavior engine`

### Task 5: タッチ、夜、お祝い、新しいグッズ

**Files:**
- Modify: `src/features/room/room-stage.tsx`、`src/features/room/use-room-brain.ts`、`src/features/room/room-view.tsx`

**Interfaces:**
- Consumes: Task 2 の `BrainEvent`、`isNight`、`newlyOwned`。プロフィールの `settings.vibration`、今日のセッションの `goal`
- Produces: なし（画面の振る舞い）

- [ ] **Step 1:** ハムスターの Pressable：タップで tap（はねる、ハートと「きゅっ」、振動の設定がオンなら軽い振動）、長押し（400ms）で press（目を細める）。グッズごとの Pressable で tapGood。部屋の下に敷いた Pressable で、`locationX`、`locationY` を `toRoom` で部屋の座標にして tapFloor。反応の前に走っているアニメーションを止め、そのときの位置を here として渡す
- [ ] **Step 2:** world の night は、行動を決めるたびに `isNight(new Date().getHours())` で決める。おへやに入ったとき（フォーカスを得たとき）、今日のゴールを達成していれば celebrate から始める。前回見たときから増えたグッズは `newlyOwned`（こどもごとの前回の持ち物をメモリに持つ）で見つけ、駆け寄って試す
- [ ] **Step 3:** reduceMotion のとき、tap ははねずに小さくうなずき、celebrate は左右に揺れるだけにする
- [ ] **Step 4:** web 表示で、タップ（「きゅっ」が出る）、長押し、ゆかのタップ（そこへ向かう）、グッズのタップ（そこで遊ぶ）を確かめる。`page.emulateMedia({ reducedMotion: "reduce" })` で、ダッシュせず、はねないことを確かめる
- [ ] **Step 5:** `bun run typecheck`、`bun run lint`、`bun test` を通し、コミットする。メッセージ `feat: let the hamster react to touch, night and new goods`

### Task 6: 通し確認

**Files:**
- Modify: 確認で見つかった不具合の修正（あれば）

- [ ] **Step 1:** web 表示を 375×667 にして、グッズ 0 のこどもと、「おへやに すべての グッズを おく」をオンにしたこどもで、おへやを見る（グッズがないと歩きとたいきだけ、持っていないグッズは使わない、はみ出さない）。幅 320 と 430 でも見る
- [ ] **Step 2:** 3 分間おへやを開いたままにして、コンソールにエラーがなく、タブの切り替えがもたつかないことを確かめる
- [ ] **Step 3:** `bun run export:ios` と `npx expo-doctor` を実行する。直したものがあればコミットする（`fix: <見つかった不具合>`）
