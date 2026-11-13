---
description: はむ算 Expo 版の段階 5（ひまわりのたねとショップ）の実装計画
author: GitHub Copilot
ms.date: 2026-10-30
ms.topic: how-to
---

# はむ算 Expo 版 ひまわりのたねとショップ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 練習でたねがたまり、ショップでグッズ、きせかえ、かべがみとゆか、おやつを買い、おへやで使えるようにする（段階 5、実機チェックリスト C）。

**Architecture:** たねの計算（`src/game/economy.ts`）と売り物と購入（`src/game/shop.ts`）、スロットへの置き方（`src/game/room.ts`）は純粋な TS にして bun でテストする。たねは recordSet の中で計算し、お財布、持ち物、部屋の配置、出入りの履歴をプロフィールに保存する（persist の version 2 と、version 1 からの移行）。画面はショップのタブ、結果画面のたねの内訳、おへやのもようがえとおやつ、保護者画面の表示を足す。

**Tech Stack:** Expo SDK 54、zustand persist、react-native-svg、react-native-reanimated 4、bun test

**Spec:** `docs/superpowers/specs/2026-10-29-hamzan-ios-design.md`（「ショップとひまわりのたね」「データとストア」「フェーズ 5」「実機チェックリスト C」。前の計画: `docs/superpowers/plans/2026-10-30-hamzan-ios-room.md`）

## Global Constraints

- 前の計画の Global Constraints を引き継ぐ（SDK 54 固定、Expo Go のモジュールだけ、bun、`src/domain` と `curriculum.json` は変更しない、コミットの書式、React Native を import するファイルは bun のテストから読まない、新しい依存は入れない）
- たねはお金では買えない。ランダムな要素と期間限定品はない。たねが減るのは買い物のときだけ（まちがいや休みでは減らない）
- たねは学習の判定（★、モード、マスター、復習）に一切影響しない。golden テストが 1 件でも崩れたら失敗
- もらえる数は「たねのもらい方」の表のとおり、`src/game/economy.ts` の定数 `SEEDS` の 1 か所で調整できる。値段は `src/game/shop.ts` の `SHOP` の 1 か所
- じゆう れんしゅうでもらえるのは 1 日 50 まで。上限に達したら「きょうの たねは ここまで。れんしゅうは できるよ」と出し、練習はそのまま続けられる。節目のボーナスは上限なし
- 中断したセットは 0。マスターしたレベルのじゆう れんしゅうは 0。速さだけで増える分はない
- この段階で売るのは、グッズ 6（ころころボール 60、つみき 80、まどべの くさ 90、クッション 100、はしご 120、ランプ 150）、きせかえ 3（リボン 120、めがね 150、マフラー 180）、かべがみとゆか 2（そらいろの かべがみ 150、しばふの ゆか 200）、おやつ 3（ブロッコリー 10、りんご 15、にんじん 15）。残りは段階 6
- ごほうびは売らない。ショップの一番下に「ごほうびは れんしゅうの ふしめで とどくよ」と出す
- たりないときは「あと ○こ」と出すだけにし、責める言い方はしない
- きせかえは、ごほうびのものと合わせて 1 度に 1 つ
- もようがえはドラッグを使わず、スロットのタップと一覧からの選択で行う（VoiceOver でも使える）
- 新しく手に入れたグッズは、空いている合うスロットに自動で置く。空きがなければ「しまってある」に入る
- 保存キーは `hamzan-ios-v1` のまま、persist の version を 2 にして version 1 から移行する。履歴は直近 300 件
- 子ども向けの文言はひらがな中心

## Review Focus

- 前の版（version 1）で保存した記録が、お財布 0、持っているごほうびのグッズがおへやに置かれた状態で読める。知らない版（3 など）の記録は書き換えない。Task 2 のテストで押さえる
- 日付が変わると、じゆう れんしゅうの上限と、じこベストの 1 日 1 回が戻る。夜中をまたいで終わったセットは、終わった日に数える。Task 1 のテストで押さえる
- 「かう」をすばやく 2 回押しても、グッズやきせかえは 1 回しか引かれない。おやつは確認のたびに 1 こずつ。Task 3 のテスト（持っているものは買えない）と Task 6（確認中はボタンを押せない）で押さえる
- 部屋の配置に、もう持っていないグッズ（記録を消した、ごほうびの条件を失った）が残っていても、おへやに出ない。テスト用の「すべての グッズを おく」は保存した配置を書き換えない。Task 7 のテストで押さえる
- 上限に達したあとも、★2、マスター、じこベスト、ゴールの節目のたねは出る。Task 1 のテストで押さえる

---

### Task 1: たねの計算

**Files:**
- Create: `src/game/economy.ts`
- Test: `tests/game/economy.test.ts`

**Interfaces:**
- Consumes: `SetKind`（`src/state/types.ts`、型だけ）、`ProgressEvent`（`src/domain/progression.ts`）、`LocalDate`（`src/domain/dates.ts`）
- Produces: `SEEDS = { sessionCorrect: 1, sessionComplete: 5, warmup: 3, extraCorrectPer: 2, extraComplete: 2, placementCorrect: 1, challengeCorrect: 1, goal: 20, star2: 10, mastered: 30, stageCheck: 50, review: 5, personalBest: 5, challengeBest: 10, extraDailyCap: 50 } as const`
- Produces: `interface Wallet { seeds: number; lifetime: number; day: LocalDate | null; earnedToday: number; bestToday: string[] }`（earnedToday はじゆう れんしゅうでその日にもらった数、bestToday はその日にじこベストのたねを出したレベル）、`emptyWallet(): Wallet`
- Produces: `type SeedLineKind = "correct" | "complete" | "warmup" | "goal" | "star2" | "mastered" | "stageCheck" | "review" | "personalBest" | "challengeBest"`、`interface SeedLine { kind: SeedLineKind; seeds: number; count?: number }`
- Produces: `interface SeedInput { kind: SetKind; inSession: boolean; interrupted: boolean; firstCorrect: number; levelId: string | null; levelMasteredBefore: boolean; events: ProgressEvent[]; reviewsPassed: number; stageCheckPassed: boolean; goalReached: boolean; challengeBestNew: boolean }`
- Produces: `awardSeeds(wallet: Wallet, input: SeedInput, date: LocalDate): { lines: SeedLine[]; total: number; capped: boolean; wallet: Wallet }`

規則（表のとおり）：wallet.day が date と違えば earnedToday と bestToday を空にしてから数える。interrupted なら 0。きょうの れんしゅう（inSession）は、warmup なら +3 だけ、それ以外は 1 回目の正解 ×1 と +5。extra は、levelMasteredBefore なら何も出さない。それ以外は floor(正解 / 2) と +2 を、1 日 50 の残りまでで切る（切ったら capped）。placement と challenge は正解 ×1。節目（goal、events の star2 と mastered、stage_check の合格、復習の合格 ×5、challengeBestNew、personalBest は levelId が bestToday にないときだけ）は上限なし。0 の行は出さない。

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("today's practice pays 1 per first right answer and 5 for finishing", () => {
  // main、inSession、firstCorrect 24 → lines [correct 24 (count 24), complete 5]、total 29、wallet.seeds 29、lifetime 29
});
test("the warm-up pays 3 and nothing per answer", () => {});
test("free practice pays 1 per 2 right answers and 2 for finishing, up to 50 a day", () => {
  // extra、firstCorrect 25 → 12 + 2 = 14。earnedToday 40 → 10 だけ、capped true。earnedToday 50 → 0、capped true
});
test("milestones are paid after the cap", () => {
  // extra、earnedToday 50、events ["star2", "personalBest"] → star2 10 + personalBest 5、total 15、capped true
});
test("a mastered level pays nothing in free practice, even a personal best", () => {});
test("a personal best pays once per level a day and the cap resets the next day", () => {
  // bestToday ["3-1"] の同じ日 → 3-1 は 0、3-2 は +5。wallet.day が前の日 → 3-1 も +5、earnedToday は 0 から
});
test("the diagnosis and the challenge pay 1 per right answer, a new challenge best adds 10", () => {});
test("goal 20, new ★2 10, mastered 30, stage check 50 and review 5 per passed level", () => {});
test("an interrupted set pays nothing", () => {
  // main、inSession、goalReached true、interrupted true → total 0、lines []
});
test("a day of today's practice beats a whole day of free practice", () => {
  // warmup + main 30 問全問正解を 2 セット + goal = 3 + 70 + 20 = 93。93 >= 90 かつ 93 > SEEDS.extraDailyCap
});
```

- [ ] **Step 2:** `bun test tests/game/economy.test.ts` が、モジュールがないことで失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通ることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: add seed economy rules`

### Task 2: 保存データの version 2 と、記録のたね

**Files:**
- Modify: `src/state/types.ts`、`src/state/profile.ts`（`newProfile`）、`src/state/record-set.ts`、`src/state/create-store.ts`、`src/game/economy.ts`、`src/game/room.ts`
- Create: `src/state/migrate.ts`
- Test: `tests/state/record-set.test.ts`、`tests/state/store.test.ts`、`tests/game/room.test.ts`

**Interfaces:**
- Consumes: Task 1 の `Wallet`、`emptyWallet`、`awardSeeds`、`SeedLine`。`src/game/room.ts` の `RoomLayout`、`autoLayout`
- Produces（`src/game/economy.ts`）: `type LedgerReason = "set" | "buy" | "gift"`、`interface LedgerEntry { at: number; date: LocalDate; delta: number; reason: LedgerReason; ref?: string }`、`MAX_LEDGER = 300`、`appendLedger(ledger: LedgerEntry[], e: LedgerEntry): LedgerEntry[]`（300 件を超えたら古いものから捨てる）
- Produces（`src/game/room.ts`）: `placeNew(layout: RoomLayout, goodId: string): RoomLayout`（`DEFAULT_SLOT` が空いていればそこ、なければ同じ種類の空き、なければそのまま）、`placeIn(layout: RoomLayout, slotId: SlotId, goodId: string | null): RoomLayout`（ほかのスロットにあれば外して置く。null はしまう）、`storedGoods(layout: RoomLayout, owned: string[]): string[]`
- Produces: `type Inventory = Record<string, number>`（売り物の id → 個数。おやつ以外は 1）、`interface RoomSetup { layout: RoomLayout; wallpaper: string | null; floor: string | null }`（null はもとの見た目）
- Produces: `Profile` に `wallet: Wallet; inventory: Inventory; room: RoomSetup; ledger: LedgerEntry[]`、`Settings` に `shop: boolean`（`DEFAULT_SETTINGS` は true）、`SetSummary` に `seeds: { lines: SeedLine[]; total: number; capped: boolean }`
- Produces: `migrate(persisted: unknown, version: number): unknown`（`src/state/migrate.ts`。version 1 は各プロフィールに `emptyWallet()`、`inventory: {}`、`room: { layout: autoLayout(いまの ごほうびの グッズ), wallpaper: null, floor: null }`、`ledger: []`、`settings.shop: true` を足す。それ以外の版は例外）、store の `version: 2`
- Produces: store の `giftSeeds(n: number): void`（テスト用。いまのこどもに +n、履歴は reason "gift"）

recordSet は summary を作ったあとで `awardSeeds` を呼ぶ（inSession は `run.sessionPart !== undefined`、levelMasteredBefore は p0 の進み具合、firstCorrect は 1 回目に正解した数、日付は ctx.date）。total が 0 より大きければ履歴に `{ reason: "set", ref: run.kind }` を 1 行足す。新しく届いたごほうびのグッズ（きせかえ以外）は `placeNew` で置く。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/state/record-set.test.ts
test("a session set pays seeds into the wallet and logs one line", () => {
  // inSession の main、10 問全問正解 → summary.seeds.total 15、wallet.seeds 15、ledger.at(-1) は { delta: 15, reason: "set", ref: "main" }
});
test("free practice at the cap pays only milestones and says it was capped", () => {});
test("a free practice set that ends after midnight counts for the new day", () => {
  // wallet { day: きのう, earnedToday: 50 }、ctx.date はきょう → 正解と最後までの分が出て、wallet.day はきょう
});
test("the first clean set places the bowl in its default slot", () => {
  // room.layout.floorS3 === "bowl"
});
test("the ledger keeps the last 300 lines", () => {});
// tests/state/store.test.ts
test("version 1 data moves to version 2 with an empty wallet and the earned goods in the room", async () => {
  // version 1 の保存データ（きれいなセットが 1 つある子）→ wallet.seeds 0、room.layout.floorS3 "bowl"、settings.shop true。書き込み後の version は 2
});
test("data saved with another version is kept", async () => {
  // version 3 に変える（いまの version 2 のテストを置きかえる）
});
test("giftSeeds adds seeds to the active child and logs a gift", () => {});
// tests/game/room.test.ts
test("placeNew uses the default slot, then a free slot of the kind, then stores", () => {});
test("placeIn moves a good from another slot and null stores it", () => {});
test("storedGoods lists owned goods that are in no slot", () => {});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する。`recordSet saves under hamzan-ios-v1` のテストの version の期待値は 2 にする
- [ ] **Step 4:** `bun test` がすべて通ることを確かめる（golden と recordSet の既存テストを含む）
- [ ] **Step 5:** コミットする。メッセージ `feat: keep a wallet, items and room setup in saved data`

### Task 3: 売り物と購入

**Files:**
- Create: `src/game/shop.ts`
- Modify: `src/game/room.ts`、`src/state/profile.ts`、`src/state/create-store.ts`
- Test: `tests/game/shop.test.ts`、`tests/game/room.test.ts`

**Interfaces:**
- Consumes: Task 2 の `Profile.wallet`、`inventory`、`ledger`、`appendLedger`、`placeNew`
- Produces: `type ShopKind = "good" | "wear" | "wallpaper" | "floor" | "snack"`、`interface ShopItem { id: string; kind: ShopKind; name: string; price: number }`、`SHOP: ShopItem[]`（id は ball、blocks、grass、cushion、ladder、lamp、ribbon、glasses、scarf、wall-sky、floor-grass、broccoli、apple、carrot。名前と値段は Global Constraints のとおり）、`shopItem(id: string): ShopItem | undefined`、`itemName(id: string): string`（ごほうびと売り物の両方）
- Produces: `buy(p: Profile, itemId: string, at: { now: number; date: LocalDate }): { ok: true; profile: Profile } | { ok: false; reason: "short"; need: number } | { ok: false; reason: "owned" | "unknown" }`（たねを引き、持ち物を足し、履歴に `{ reason: "buy", ref: itemId, delta: -price }`。おやつは何度でも、ほかは持っていれば "owned"。置くかどうかは画面で聞くので、ここでは置かない。`Profile` は型だけ import する）
- Produces（`src/game/room.ts`）: `GOOD_KIND` に ball、blocks、cushion、ladder を floorSmall、grass を sill、lamp を wall で追加。`DEFAULT_SLOT` は ball、blocks、cushion、ladder が floorS2、grass が sill、lamp が wall1
- Produces（`src/game/room.ts`）: `SEATS` を `Record<string, { at: Point; moveMs: number }>` に変え、ladder `{ at: { x: 30, y: 12 }, moveMs: 900 }` を足す（swing と hammock は `{ x: 30, y: 49 }`、300）。`seatIn` は今までどおり点を返し、`seatMoveMs(goodId: string): number` を足す
- Produces（`src/state/profile.ts`）: `ownedGoods(p: Profile): string[]`（届いたごほうびのグッズと買ったグッズ）、`ownedWear(p: Profile): string[]`（ごほうびと買ったきせかえ）
- Produces（store）: `buyItem(itemId: string)` は `buy` の結果を返し、成功したらいまのこどもに保存。`placeNewGood(goodId: string): boolean`（`placeNew` で置けたら true）、`placeGood(slotId: SlotId, goodId: string | null): void`、`setDecor(kind: "wallpaper" | "floor", id: string | null): void`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/game/shop.test.ts
test("prices and kinds match the design", () => {
  // ball 60 good、blocks 80、grass 90、cushion 100、ladder 120、lamp 150、ribbon 120 wear、glasses 150、scarf 180、wall-sky 150 wallpaper、floor-grass 200 floor、broccoli 10 snack、apple 15、carrot 15
});
test("buying takes the price, adds the item and logs it", () => {
  // seeds 100 で ball → seeds 40、inventory.ball 1、ledger.at(-1) は { delta: -60, reason: "buy", ref: "ball" }、lifetime は変わらない
});
test("a short wallet buys nothing and says how many are missing", () => {
  // seeds 50 で ball → { ok: false, reason: "short", need: 10 }、プロフィールは同じオブジェクトのまま
});
test("goods and wear are bought once, snacks again and again", () => {
  // ball 2 回目 → "owned"。carrot 3 回 → inventory.carrot 3、seeds は 45 減る
});
test("rewards are not for sale", () => {
  // buy(p, "crown") → "unknown"
});
// tests/game/room.test.ts
test("every shop good has a slot kind and a default slot of that kind", () => {});
test("a hamster on a seat stays inside the room in every slot of the good's kind", () => {
  // 今までの「ceiling」に限ったテストを、SEATS のすべてのグッズと、その種類のすべてのスロットに広げる
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する。`use-room-brain.ts` と `room-stage.tsx` の `seatIn` の使い方はそのまま動くようにし、`SEAT_MOVE_MS` は `seatMoveMs` に置きかえる
- [ ] **Step 4:** `bun test` と `bun run typecheck` が通ることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: add the shop catalog and room placement`

### Task 4: 結果画面のたね

**Files:**
- Modify: `src/features/result/result-text.ts`、`src/features/result/result-screen.tsx`
- Test: `tests/features/result-text.test.ts`

**Interfaces:**
- Consumes: Task 2 の `SetSummary.seeds`
- Produces: `seedLineText(line: SeedLine): string`、`SEED_CAP_NOTE = "きょうの たねは ここまで。れんしゅうは できるよ"`

文言：correct「せいかい」、complete「さいごまで」、warmup「ウォームアップ」、goal「きょうの ゴール」、star2「あたらしい ★2」、mastered「マスター」、stageCheck「ステージチェック ごうかく」、review「ふくしゅう ごうかく」、personalBest「じこベスト」、challengeBest「チャレンジ じこベスト」。どれも「せいかい +24」の形。結果画面では、ごほうびの欄の上に「たね +○」（`Seed` の絵）と内訳を出し、capped なら `SEED_CAP_NOTE` を添える。total が 0 で capped でなければ欄を出さない。

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("seed lines read like the design", () => {
  // { kind: "correct", seeds: 24, count: 24 } → "せいかい +24"、complete 5 → "さいごまで +5"、star2 10 → "あたらしい ★2 +10"
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通り、web 表示でウォームアップの結果（たね +3）と、じゆう れんしゅうの結果（内訳）が出ることを確かめる。上限はテスト用の日付の同じ日に、じゆう れんしゅうを続けて確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: show seeds earned on the result screen`

### Task 5: 新しい売り物の絵

**Files:**
- Modify: `src/art/items.tsx`、`src/art/hamster.tsx`、`src/art/hamster-poses.tsx`、`src/art/room-scene.tsx`、`src/features/room/room-stage.tsx`（テスト用の「すべての グッズを おく」に売り物のグッズも入れる）

**Interfaces:**
- Produces: `ART` と `ITEM_PARTS` に ball、blocks、grass、cushion、ladder、lamp。`ItemParts` に `motion?: "spin" | "sway"`（wheel と ball は spin、swing、hammock、blocks は sway）。ball は転がる部分、blocks は上の積み木を moving にする
- Produces: `ART` に ribbon、glasses、scarf（一覧用）、broccoli、apple、carrot、`wall-sky` と `floor-grass`（見本の四角）。`ItemThumb` はすべての id を描ける
- Produces: `HamsterBody` と `HamsterSide` の `wear` に ribbon、glasses、scarf
- Produces: `RoomBackground({ wallpaper, floor }: { wallpaper: string | null; floor: string | null })`（wall-sky は水色のかべに雲、floor-grass は緑のゆかに草）、`RoomScene` は `owned` のかわりに `layout: RoomLayout` と `wallpaper`、`floor` を受け取る（診断中の画面は `autoLayout(ownedGoods(p))` を渡す）

絵の細部は実装で決める（設計書の「実装するときに決めること」）。グッズは 60×60 の箱の中、スロットの縮尺（0.75〜1.5）で見分けがつく大きさにする。

- [ ] **Step 1:** 絵を描き、`bun run typecheck` を通す
- [ ] **Step 2:** web 表示で、テスト用の「すべての グッズを おく」をオンにして、新しいグッズが部屋の中に描かれ、ハムスターの前後の重なりがおかしくないことを確かめる
- [ ] **Step 3:** コミットする。メッセージ `feat: draw the first shop goods, outfits and room styles`

### Task 6: ショップのタブ

**Files:**
- Create: `src/features/shop/shop-view.tsx`、`src/features/shop/item-preview.tsx`
- Modify: `src/app/(tabs)/shop.tsx`、`src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: Task 3 の `SHOP`、`buyItem`、`placeNewGood`、`setDecor`、`ownedWear`。Task 5 の `ItemThumb`、`RoomScene`、`Hamster`
- Produces: なし（画面）

画面：上にたねの数（`Seed` の絵と数）、その下に「グッズ」「きせかえ」「かべがみ・ゆか」「おやつ」の切り替え、2 列のカード（絵、名前、値段、持っていれば「もっている」、おやつは「○こ もっている」）、一番下に「ごほうびは れんしゅうの ふしめで とどくよ」。カードを押すとプレビュー（きせかえは身につけたハムスター、グッズは `DEFAULT_SLOT` に置いたおへや、かべがみとゆかは変えたおへや、おやつは絵と「おへやで あげられるよ」）。「かう」は、持っていれば出さず、たりなければ押せずに「あと ○こ」。押すと確認「○○を ○こで かう？」、確認が出ている間はもう一度押せない。買えたら、グッズは「おへやに おく？」（はい → `placeNewGood`、置ける場所がなければ「おく ばしょが いっぱい。もようがえで いれかえてね」）、きせかえは「つける？」、かべがみとゆかは「かえる？」。プロフィールの `settings.shop` が false のときはタブを隠す（`href: null`）。

- [ ] **Step 1:** 画面を作り、`bun run typecheck` を通す
- [ ] **Step 2:** web 表示で、テスト用の「たねを 100 ふやす」（Task 9 で画面に出すまでは store の `giftSeeds` を使う）のあと、ボールを買って置く、たりないものは押せずに「あと ○こ」、同じものは買えない、おやつは 2 回買える、きせかえを買ってつける、かべがみを買って変える、を確かめる
- [ ] **Step 3:** コミットする。メッセージ `feat: open the shop tab`

### Task 7: 保存した配置で動くおへや

**Files:**
- Modify: `src/features/room/room-stage.tsx`、`src/features/room/room-view.tsx`、`src/features/room/use-room-brain.ts`、`src/features/room/stage-rules.ts`
- Test: `tests/features/stage-rules.test.ts`

**Interfaces:**
- Consumes: Task 2 の `Profile.room`、Task 3 の `ownedGoods`、`seatMoveMs`、`itemName`、Task 5 の `RoomBackground`、`ItemParts.motion`
- Produces（`stage-rules.ts`）: `roomGoods(layout: RoomLayout, owned: string[]): RoomLayout`（持っていないグッズを外す）、`PLAYABLE_EXCEPT = ["lamp"]`（ハムスターが遊ばないグッズ）、`nightTint(night: boolean, lampPlaced: boolean): number`（夜でなければ 0、夜はランプなしで 0.3、ありで 0.12）
- Produces: `look()` に新しい遊び（ball「ころころ」、blocks「がらがら」、grass「くんくん」、cushion「ふかふか」、ladder は吹き出しなし）。名前は `itemName`

おへやは保存した `profile.room.layout` を `roomGoods` で絞って描く（テスト用の「すべての グッズを おく」がオンのときだけ、保存した配置は使わず `autoLayout(すべてのグッズ)` を描く）。かべがみとゆかは `profile.room` から。夜は部屋に紺色を `nightTint` の濃さで重ね、ランプがあれば光の輪を描く。ランプはハムスターの world に入れない。ボールは転がしながら横向きで押し、積み木はゆれて崩れ、はしごは `seatMoveMs` かけてのぼる。前回見たときからの新しいグッズは、置かれているグッズで数える。

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("goods no longer owned are not shown", () => {
  // roomGoods({ floorL1: "desk", floorS2: "ball" }, ["ball"]) → { floorS2: "ball" }
});
test("the night is darker without a lamp", () => {
  // nightTint(false, false) 0、nightTint(true, false) 0.3、nightTint(true, true) 0.12
});
test("new plays read their good's name", () => {
  // look({ kind: "play", good: "ball", ... }).label === "ころころボールで あそんで いる"、bubble "ころころ"
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通り、web 表示で、買ったボールを置いたおへやでハムスターがボールへ駆け寄って試すこと、はしごをのぼっても部屋からはみ出さないこと、テスト用のスイッチを切ると保存した配置に戻ることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: show the saved room with new goods, styles and the lamp`

### Task 8: もようがえ、きせかえ、おやつ

**Files:**
- Create: `src/features/room/arrange-sheet.tsx`、`src/features/room/snack-sheet.tsx`
- Modify: `src/game/hamster-brain.ts`、`src/game/room.ts`、`src/features/room/room-view.tsx`、`src/features/room/room-stage.tsx`、`src/features/room/use-room-brain.ts`、`src/features/room/stage-rules.ts`、`src/state/create-store.ts`
- Test: `tests/game/hamster-brain.test.ts`

**Interfaces:**
- Produces（`room.ts`）: `FRONT: Point = { x: 200, y: 248 }`（おやつを食べる手前の場所）、`SLOT_NAME: Record<SlotId, string>`（読み上げ用。「ゆか おおきい 1」など）
- Produces（`hamster-brain.ts`）: `Activity` に `{ kind: "eat"; snack: string; ms: number }`、`BrainEvent` に `{ type: "feed"; snack: string }`（`[FRONT へ歩く, eat]`）、`EAT_MS = 2600`
- Produces（store）: `feedSnack(id: string): boolean`（持っていれば 1 こ減らして true）
- Produces（`stage-rules.ts`）: eat の `look()`（正面、ほおぶくろ、吹き出し「もぐもぐ」、ラベル「○○を たべて いる」）

おへやの下に「もようがえ」と「おやつ」（おやつを持っているときだけ）のボタン。もようがえ中は、スロットの位置に「＋」（グッズがあればその絵の上に小さく）を出し、押すとそのスロットに置けるもの（持っていて種類が合うもの、しまってあるものと、ほかのスロットにあるもの）の一覧と「しまう」を出す。「おわる」でもどる。もようがえ中も、ハムスターは動き続ける。おやつは、持っているおやつと個数の一覧から選ぶと、1 こ減らしてハムスターが手前に来て食べる。持ち物の一覧（いまの「ごほうび」）は「もちもの」にして、ごほうびと買ったものを出し、きせかえ（ごほうびと買ったもの）は「つける」で 1 つだけ身につける。

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("a snack brings the hamster to the front to eat it", () => {
  // stepBrain(b, world(), { type: "feed", snack: "apple" }, here) → now は FRONT への walk、plan に { kind: "eat", snack: "apple", ms: EAT_MS }
  // here が FRONT のすぐそばなら、いきなり eat
});
test("eating lasts at least MIN_ACTIVITY_MS and never leaves the floor", () => {});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通り、web 表示で、もようがえでグッズを入れかえる、しまう、しまってあるものを置く、きせかえを切りかえる（ごほうびと買ったもの）、おやつをあげると個数が減ってハムスターが手前で食べる、を確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: rearrange the room, wear outfits and feed snacks`

### Task 9: 保護者画面のたねとショップのオンとオフ

**Files:**
- Modify: `src/features/parent/dashboard-data.ts`、`src/features/parent/dashboard.tsx`、`src/features/parent/settings-pane.tsx`、`src/features/parent/test-pane.tsx`
- Test: `tests/features/dashboard-data.test.ts`

**Interfaces:**
- Produces: `seedSummary(p: Profile, today: LocalDate): { seeds: number; week: number; bought: { id: string; name: string; count: number }[] }`（week は today を含む直近 7 日の、0 より大きい出入りの合計）

ダッシュボードに「ひまわりのたね」の欄（いま ○こ、直近 7 日で +○、買ったもの）。設定に「ショップを使う」（説明「オフにすると、ショップのタブをかくします。たねは たまりつづけます」）。テスト用に「たねを 100 ふやす」。

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("seedSummary shows the wallet, the last 7 days and what was bought", () => {
  // ledger: 8 日前 +30、きのう +20、きょう +15、きょう -60（ball）、inventory { ball: 1, carrot: 2 } → week 35、bought は ball 1 と carrot 2（名前つき）
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通り、web 表示で、「ショップを使う」をオフにするとショップのタブが消え、セットを終えるとたねは増えていることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: show seeds and the shop switch in the parent area`

### Task 10: 通し確認

**Files:**
- Modify: 確認で見つかった不具合の修正（あれば）

- [ ] **Step 1:** web 表示（375×667）で、実機チェックリスト C を順に確かめる（結果画面の内訳、じゆう れんしゅうの上限と案内、買ったグッズが置かれて駆け寄る、たりないと買えない、もようがえ、きせかえ、おやつ）。幅 320 と 430 でもショップとおへやを見る
- [ ] **Step 2:** `bun run typecheck`、`bun test`、lint、`bun run export:ios`、`npx expo-doctor` を通す。直したものがあればコミットする（`fix: <見つかった不具合>`）
