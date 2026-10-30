---
description: ハムざん Expo 版の段階 6（仕上げ）の実装計画
author: GitHub Copilot
ms.date: 2026-10-31
ms.topic: how-to
---

# ハムざん Expo 版 仕上げ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 残りの売り物 10 点（グッズ 6、きせかえ 2、かべがみ 2）を足してハムスターがそれぞれの遊び方をするようにし、VoiceOver と大きな文字に対応し、アイコン、スプラッシュ、ピアノの音、README を整える（段階 6、実機チェックリスト D）。

**Architecture:** 売り物の表（`src/game/shop.ts`）、置き場所とハムスターの通り道（`src/game/room.ts` の `COURSES`）、行動の選び方（`src/game/hamster-brain.ts`）は純粋な TS にして bun でテストする。おへやの画面は、すべりだい、つりばし、ピアノを「コース」（グッズの箱の中の通り道）として 1 つの仕組みで動かす。VoiceOver と文字の大きさは共通の部品（`AppText`、下から出るシート）でまとめて対応し、web 表示の監査で確かめる。

**Tech Stack:** Expo SDK 54、react-native-svg、react-native-reanimated 4、expo-audio、zustand、bun test

**Spec:** `docs/superpowers/specs/2026-10-29-hamzan-ios-design.md`（「フェーズ 6：仕上げ」「売り物」の表、「テストと確認」。前の計画: `docs/superpowers/plans/2026-10-30-hamzan-ios-shop.md`）

**前の計画からの持ち越しで、この段階で扱うもの:** 持っていないグッズが置き場所をふさぐこととプレビューの置き場所のずれ（Task 2。大きいグッズを売ると起きるため）、VoiceOver から見える「とじる」が 3 つあることと購入の確認が読み上げられないこと（Task 7）、一時停止の画面の文字の大きさに上限がないこと（Task 8）、README のフォルダの表と AGENTS.md の state の説明（Task 10）。ほかの持ち越しは扱わない

## Global Constraints

- 前の計画の Global Constraints を引き継ぐ（SDK 54 固定、Expo Go のモジュールだけ、bun、`src/domain` と `curriculum.json` は変更しない、コミットの書式、React Native を import するファイルは bun のテストから読まない、新しい依存は入れない）
- 売り物の名前と値段は設計の表のとおり。グッズ: ほんだな 180、すべりだい 200、つりばし 250、ふわふわベッド 300、おもちゃの ピアノ 400、きんの まわしぐるま 600。きせかえ: ベレーぼう 200、ヘッドホン 250。かべがみ: もりの かべがみ 250、よぞらの かべがみ 350。値段は `SHOP` の 1 か所
- ハムスターの反応は設計の表のとおり。ほんだな「本を選んで読む」、すべりだい「すべる」、つりばし「わたる」、ふわふわベッド「夜はここで眠る」、おもちゃの ピアノ「鍵盤の上を歩くと音が鳴る」、きんの まわしぐるま「きらきらしながら走る」、ヘッドホン「身につけ、ときどき体をゆらす」
- たねのもらい方（`SEEDS`）とスロット 11 か所は変えない
- ハムスターはどの遊びでも部屋からはみ出さず、遊びのあとは床の上から続ける
- VoiceOver は Web 版の読み方を accessibilityLabel に使う（問題文は `speech()` で対応済み）
- ピアノの音は保護者の「効果音」設定に従い、消音スイッチがオンなら鳴らない（`playsInSilentMode: false` のまま）
- アイコンは 1024×1024 の PNG
- 子ども向けの文言はひらがな中心、保護者向けは漢字まじり

## Review Focus

- 大きいグッズとてんじょうのグッズを売るので、持っていないごほうび（復習で失ったべんきょうづくえなど）が保存した配置に残っていても、新しいグッズの置き場所をふさがない。ショップのプレビューは実際に置かれる場所を見せる。Task 2 のテストで押さえる
- すべりだい、つりばし、ピアノで遊ぶ途中にタップ、もようがえ、画面の切りかえが入っても、ハムスターは宙に浮かず床の上から続ける。Task 1（コースが部屋の中）と Task 5（`perchedOn`）のテストで押さえる
- ベッドで寝ている途中にベッドをしまうと起きて別のことをし、夜にベッドがなければこれまでどおりおうちで寝る。Task 4 と Task 5 のテストで押さえる
- 「効果音」がオフならピアノは鳴らず、ヘッドホンを外せば体をゆらさない。Task 4 のテストと Task 6 の web 確認で押さえる
- 文字を 1.5 倍にしても幅 320 で文字が切れたり重なったりせず、VoiceOver で名前のないボタンや絵がない。Task 7 と Task 8 の web 監査で押さえる

---

### Task 1: 残りの売り物と置き場所

**Files:**
- Modify: `src/game/shop.ts`、`src/game/room.ts`
- Test: `tests/game/shop.test.ts`、`tests/game/room.test.ts`

**Interfaces:**
- Produces: `SHOP` に bookshelf、slide、bridge、bed、piano、goldwheel（good）、beret、headphones（wear）、wall-forest、wall-night（wallpaper）。並びは種類ごとに値段の安い順
- Produces（`room.ts`）: `GOOD_KIND` と `DEFAULT_SLOT` に bookshelf floorLarge／floorL1、slide floorLarge／floorL3、bridge ceiling／ceil1、bed floorSmall／floorS2、piano floorLarge／floorL2、goldwheel floorLarge／floorL2。`SEATS.bed = { at: { x: 30, y: 46 }, moveMs: 300 }`（揺れない）
- Produces（`room.ts`）: `interface CourseStep { to: Point; ms: number; notes?: number; ease?: "in" }`、`COURSES: Record<string, CourseStep[]>`（60×60 の箱の中の点）、`courseIn(goodId: string, slotId: SlotId): { steps: CourseStep[]; ms: number } | undefined`。部屋の単位に直して x を FLOOR.x0〜x1、y を HAMSTER_H − 1〜FLOOR.y1 に収め、最後に spot へ戻る 500 ms の段を足す。ms は段の合計
- コースの点: slide ＝ はしごの下 (16, 58) 500 ms → 上 (18, 10) 900 ms → すべり終わり (44, 56) 450 ms ease "in"。bridge ＝ 左はし (6, 50) 500 ms → 右はし (54, 50) 1800 ms → 左はし (6, 50) 1800 ms。piano ＝ 鍵盤の左 (8, 50) 400 ms → 右 (52, 50) 2000 ms notes 5

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("prices, kinds and names match the design", () => {
  // 既存の表に新しい 10 品（Global Constraints の名前と値段）を足した 24 品
});
test("a hamster on a seat stays inside the room in every slot of the good's kind", () => {
  // Object.keys(SEATS).sort() → ["bed", "cushion", "hammock", "ladder", "swing"]
});
test("courses keep the hamster inside the room in every slot of the good's kind and end at the spot", () => {
  // Object.keys(COURSES).sort() → ["bridge", "piano", "slide"]
  // 種類の合うすべてのスロットで、どの段の to も x 36〜364、y 56〜252。最後の段の to は SLOTS[slot].spot、ms は段の合計
  // piano のコースには notes 5 の段がちょうど 1 つ。courseIn("wheel", "floorL2") は undefined
});
```

既存の「every shop good has a slot kind and a default slot of that kind」は 12 品で通ること。

- [ ] **Step 2:** `bun test tests/game/shop.test.ts tests/game/room.test.ts` が新しいテストで失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通るのを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: add the rest of the shop items and their places`

### Task 2: 持っていないグッズに場所をふさがせない

**Files:**
- Modify: `src/game/room.ts`、`src/features/room/stage-rules.ts`、`src/state/create-store.ts`、`src/state/record-set.ts`、`src/features/shop/item-preview.tsx`
- Test: `tests/game/room.test.ts`、`tests/features/stage-rules.test.ts`、`tests/state/store.test.ts`

**Interfaces:**
- Produces（`room.ts`）: `roomGoods(layout: RoomLayout, owned: string[]): RoomLayout` を `stage-rules.ts` から移す（テストも移し、使う側の import を直す）
- Produces（`room.ts`）: `previewLayout(layout: RoomLayout, owned: string[], goodId: string, kinds?: Record<string, SlotKind>): { layout: RoomLayout; full: boolean }`。`placeNew(roomGoods(layout, owned), goodId)` で置ければそれ、置けなければ既定のスロットに入れかえた配置と full: true
- 変更: `placeNewGood` と、recordSet が新しいごほうびのグッズを置くときは、`roomGoods(layout, ownedGoods(p))` の上に置く（持っていないグッズは配置から外れる）。ごほうびにグッズがないセットでは配置を変えない
- 変更: `ItemPreview` は `previewLayout` を使い、full のときは絵の下に「いまは おく ばしょが いっぱい。もようがえで いれかえてね」

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("a new good takes a slot held only by a good the child no longer has", () => {
  // previewLayout({ floorL1: "desk", floorL2: "wheel", floorL3: "house" }, ["wheel", "house", "bookshelf"], "bookshelf")
  //   → { layout: { floorL1: "bookshelf", floorL2: "wheel", floorL3: "house" }, full: false }
});
test("the preview shows where a new good will go, or its usual slot when every slot of its kind is taken", () => {
  // { floorS2: "ball" }、owned ["ball", "blocks"] → blocks は floorS1、full false
  // { floorS1: "tunnel", floorS2: "ball", floorS3: "bowl" }、すべて持っている → blocks は floorS2（ball の代わり）、full true
});
test("placeNewGood puts a new good where a good the child no longer has stood", () => {
  // ball、cushion、ladder を買い、placeGood で floorS1: "blocks"（持っていない）、floorS2: "ball"、floorS3: "cushion"
  // placeNewGood("ladder") → true、layout.floorS1 === "ladder"
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通り、web 表示でボールを置いたあとにつみきのプレビューがボールを消さずに空いたスロットに見えることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `fix: place new goods over goods the child no longer has`

### Task 3: 新しい売り物の絵

**Files:**
- Modify: `src/art/items.tsx`、`src/art/hamster.tsx`、`src/art/hamster-poses.tsx`、`src/art/room-scene.tsx`

**Interfaces:**
- Consumes: Task 1 の id、`COURSES` の点、`SEATS.bed`
- Produces: `ART` と `ITEM_PARTS` に 6 つのグッズ。goldwheel は wheel と同じく台と回る部分（pivot (30, 28)、motion "spin"）。絵はコースの点に合わせる（すべりだいのはしごは x 16〜20、上は y 10、すべり面は (44, 56) まで。つりばしの板は y 50 に x 4〜56。ピアノの鍵盤の上面は y 50 に x 6〜54。ベッドの寝る位置は (30, 46)）
- Produces: `HamsterBody` と `HamsterSide` の `wear` に beret、headphones。`ART` に beret、headphones、wall-forest、wall-night（一覧用）
- Produces: `RoomBackground` の wallpaper に wall-forest（緑のかべに木）、wall-night（紺のかべに星と月）。窓（x 150〜242、y 22〜88）はよける

- [ ] **Step 1:** 絵を描き、`bun run typecheck` を通す
- [ ] **Step 2:** web 表示（幅 375、3 倍の切り出し）で、コミットしない仮の配置を使い、6 つのグッズが既定のスロットに描かれること、ベレーぼうとヘッドホンを正面と横向きで、2 つのかべがみを確かめる
- [ ] **Step 3:** コミットする。メッセージ `feat: draw the rest of the shop items`

### Task 4: 夜はベッド、ヘッドホンでゆれる（ハムスターの考え）

**Files:**
- Modify: `src/game/hamster-brain.ts`
- Test: `tests/game/hamster-brain.test.ts`

**Interfaces:**
- Produces: `World` に `wear?: string | null`。`IdleAct` に "groove"（wear が "headphones" のときだけ選ばれ、選ぶ一覧に 2 つ入れて 1/3 にする）。sleep の Activity に `inBed?: boolean`（夜の眠りはベッドがあればその spot へ歩いて inBed: true で寝る。昼寝はこれまでどおりおうち）。goldwheel も wheel と同じく転ぶことがある

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("at night the hamster sleeps in its bed when it has one, and by day it naps in the house", () => {
  // bed と house がある夜の world で run → sleep はすべて inBed: true、直前の walk の to は bed の spot
  // 昼の world で run → nap は inHouse: true で inBed なし。夜でも bed がなければ inHouse: true
});
test("with headphones on the hamster sometimes sways to the music, and never without them", () => {
  // world({ wear: "headphones" }) で 1500 歩 → idle groove がある。wear null と "ribbon" ではない
});
test("the golden wheel sometimes tumbles like the wheel", () => {
  // goldwheel の play に variant "tumble" がある。reduceMotion ではない
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通るのを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: sleep in the bed at night and sway with headphones`

### Task 5: 新しいグッズで遊ぶおへや

**Files:**
- Modify: `src/features/room/stage-rules.ts`、`src/features/room/use-room-brain.ts`、`src/features/room/room-stage.tsx`
- Test: `tests/features/stage-rules.test.ts`

**Interfaces:**
- Consumes: Task 1 の `courseIn`、Task 4 の groove、inBed、`World.wear`
- Produces（`stage-rules.ts`）: `StageGood` に `course?: { steps: CourseStep[]; ms: number }`（`stageGoods` が `courseIn` で入れる）。`perchedOn(a: Activity): boolean`（席のあるグッズの play、コースのあるグッズの play、ベッドでの眠りは true。`here()` はこれが true なら spot を使う）。`rearrangedUnder` は inBed の眠りでベッドを使うと数える
- Produces（`look()`）: bookshelf は正面、pose read、吹き出し「ふむふむ」。slide は横向き「わーい」、bridge は横向き「どきどき」、piano は横向き「♪」、goldwheel は横向き「きらきら」。bed の play は正面、pose sleep、「ごろん」。inBed の眠りは正面、pose sleep、「Zzz」、ラベル「ベッドで ねて いる」。idle groove は正面、mood happy、「♪」、ラベル「おんがくを きいて いる」

コースの play は、段を `Math.max(1, Math.floor(ms / course.ms))` 回くり返し、終わりは `Math.max(ms, 回数 × course.ms)`。向きは段の x の進む向き（ほぼ 0 なら前のまま）、動く間は歩く絵。goldwheel は wheel と同じ動きに加えて、`Good` が回っている間に星をまたたかせる（不透明度を motion.spin から作る）。ベッドの眠りは席へ移ってから寝る。groove は体を左右にゆらし（±7 度、視差効果を減らすでは ±3 度）、小さく跳ねる（視差効果を減らすでは跳ねない）。`useRoomBrain` は `wear` を受け取って World に入れる。

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("new plays read their good's name", () => {
  // 上の look() の表のとおり。label は「ほんだなで あそんで いる」など itemName から
});
test("perched activities count as standing at the spot", () => {
  // play の swing、ladder、bed、slide、bridge、piano は true。wheel と ball は false
  // sleep inBed は true、inHouse は false、walk は false
});
test("a bed slept in that is put away wakes the hamster", () => {
  // rearrangedUnder({ now: sleep inBed, plan: [] }, bed あり, bed なし) → true
});
test("course goods carry their course", () => {
  // stageGoods(placedGoods({ floorL3: "slide", floorL2: "wheel" })) → slide の course は courseIn("slide", "floorL3")、wheel は course なし
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通り、web 表示（幅 375）で、各グッズをタップすると遊び方のとおりに動き、つりばしとすべりだいで部屋からはみ出さず、遊びの途中のタップで床に戻ることを確かめる。夜（タイムゾーンの指定）にベッドで寝ること、ヘッドホンでゆれること、Plan C のおへやの通し確認（幅 375、320、430）が変わらないことも確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: play with the new goods in the room`

### Task 6: ピアノの音

**Files:**
- Modify: `scripts/make-sounds.ts`、`src/platform/feedback.ts`、`src/features/room/stage-rules.ts`、`src/features/room/use-room-brain.ts`、`src/features/room/room-stage.tsx`
- Create: `assets/sounds/key1.wav`〜`key5.wav`
- Test: `tests/scripts/make-sounds.test.ts`、`tests/features/stage-rules.test.ts`

**Interfaces:**
- Produces: `KEYS = [523.25, 587.33, 659.25, 783.99, 880]`（ド、レ、ミ、ソ、ラ。どの順でも濁らない 5 音）を、1 音 0.18 秒の triangle で key1.wav〜key5.wav に書く。答えの効果音（ok、miss、clear）は Web 版の音のまま変えない（出題の画面を開くときの先読みは対応済み）
- Produces: `playNote(key: number, sound: boolean): void` と `preloadNotes(): void`（`feedback.ts`。sound が false なら鳴らさない。最初の音が遅れないよう、おへやは「効果音」がオンなら開いたときに `preloadNotes()` を呼ぶ）
- Produces（`stage-rules.ts`）: `courseNotes(course: { steps: CourseStep[] }): { at: number; key: number }[]`（notes のある段の中に等間隔、key は 0 から順に上がる。at は play の始まりからの ms）。フックは各回の at で `onNote(key)` を呼び、おへやは `(key) => playNote(key, profile.settings.sound)` を渡す

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("the piano keys are five rising notes of a pentatonic scale", () => {
  // KEYS は上の 5 つ。renderTones([KEYS[0]], 0.18, "triangle") のピークは 0.12〜0.2
});
test("the piano plays its five keys in order while the hamster crosses them", () => {
  // courseNotes(courseIn("piano", "floorL2")) → 5 つ、key 0〜4、at は鍵盤を渡る段の中で増えていく
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装し、`bun run scripts/make-sounds.ts` で wav を書く
- [ ] **Step 4:** テストが通り、web 表示で、ピアノの遊び 1 回分の音の再生（ページの `HTMLMediaElement.prototype.play` の呼び出し回数）が「効果音」オンで 5 回ずつ、オフで 0 回であることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: play piano notes when the hamster walks on the keys`

### Task 7: VoiceOver

**Files:**
- Create: `src/platform/a11y.ts`
- Modify: `src/ui/sheet.tsx`、`src/features/home/level-sheet.tsx`、`src/features/shop/shop-view.tsx`、監査で見つかった画面

**Interfaces:**
- Produces: `announce(text: string): void`（`AccessibilityInfo.announceForAccessibility`。失敗は無視）

下から出るシートの暗い背景は、目で見る子のタップ先として残し、VoiceOver からはかくす。シートは VoiceOver の「戻る」ジェスチャー（`onAccessibilityEscape`）で閉じる。ショップのシートは、確認の問い、買ったあとの問い、結果を出たときに読み上げる。

- [ ] **Step 1:** web 表示の監査（コミットしないスクリプト）を書く。ちず、レベルのシート、おへや（もようがえ、置くもののシート、おやつのシート）、ショップとアイテムのシート、出題（ヒントモード）、結果画面、保護者画面の各ペインで、role が button の要素に名前（aria-label か文字）があること、role が img の要素にラベルがあること、アイテムのシートで VoiceOver から見える「とじる」が × の 1 つ（とじるの段では 2 つ）であることを数える
- [ ] **Step 2:** 監査を走らせ、背景の「とじる」が数えられて失敗するのを確かめる
- [ ] **Step 3:** 実装し、監査で見つかった名前のないボタンや絵を直す
- [ ] **Step 4:** 監査が通るのを確かめ、`bun run typecheck` と lint を通す
- [ ] **Step 5:** コミットする。メッセージ `feat: make the sheets and the shop work with VoiceOver`

### Task 8: 大きな文字

**Files:**
- Create: `src/ui/font-scale.ts`
- Modify: `src/ui/text.tsx`、`src/app/_layout.tsx`、`src/state/types.ts`、`src/features/parent/test-pane.tsx`、監査で見つかった画面
- Test: `tests/ui/font-scale.test.ts`

**Interfaces:**
- Produces（`font-scale.ts`、React Native を import しない）: `MAX_FONT_SCALE_UI = 1.5`、`scaledFont(style: { fontSize?: number; lineHeight?: number }, scale: number, cap: number): { fontSize?: number; lineHeight?: number }`（どちらも × min(scale, cap)。ないものはないまま）
- Produces（`text.tsx`）: `AppText` の `maxFontSizeMultiplier` の既定を `MAX_FONT_SCALE_UI` にする（出題の 1.3 はそのまま）。`TextScaleContext`（既定 1）を web でだけ `scaledFont` で文字に当て、iPhone でその文字の大きさのときの見た目を web で見られるようにする
- Produces: `DevSettings.textScale?: number`（web の確認用。テスト用の画面に web でだけ「文字の大きさ（web の確認）」の 1、1.3、1.5）。ルートのレイアウトが `TextScaleContext` を渡す（iPhone ではいつも 1）

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("text grows with the scale up to the cap", () => {
  // scaledFont({ fontSize: 16, lineHeight: 22 }, 2, 1.5) → { fontSize: 24, lineHeight: 33 }
  // scaledFont({ fontSize: 20 }, 1.2, 1.5) → { fontSize: 24 }、scaledFont({}, 2, 1.5) → {}
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** テストが通るのを確かめる。web 表示で textScale 1.5（出題は上限の 1.3）、幅 375 と 320 の監査（コミットしないスクリプト）をし、ちず、レベルのシート、おへや、ショップとアイテムのシート、出題と一時停止の画面、結果画面、保護者画面で、意図しない文字の切れ（scrollWidth が clientWidth より大きい）と、ヘッダーやタブバーとの重なりがないことを確かめる。見つかった崩れは折り返しや縮めで直す
- [ ] **Step 5:** コミットする。メッセージ `feat: keep screens readable with larger text`

### Task 9: アイコンとスプラッシュ

**Files:**
- Create: `assets/icon/icon.svg`
- Modify: `assets/images/icon.png`、`assets/images/splash-icon.png`、`assets/images/favicon.png`、`app.json`
- Test: `tests/scripts/assets.test.ts`

**Interfaces:**
- Produces: `icon.svg`（1024 四方。ひまわりのたねを持つハムスターの正面の顔を、角まで塗った琥珀色の背景に置く。角は iOS が丸める）。`icon.png` は 1024×1024 の不透明、`splash-icon.png` は 512×512 の透明な背景にハムスター、`favicon.png` は 48×48。スプラッシュの背景は "#FFF4E2"（`CREAM`）、imageWidth 200
- PNG は SVG からヘッドレスのブラウザのスクリーンショットで書き出す（アイコンは不透明、スプラッシュは背景なし）

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("the app icon is a 1024 square and the splash image is square", () => {
  // PNG の IHDR（16〜23 バイト）: icon.png は 1024×1024、splash-icon.png は幅＝高さ 400 以上
  // app.json の expo-splash-screen の backgroundColor は "#FFF4E2"
});
```

- [ ] **Step 2:** テストが失敗するのを確かめる
- [ ] **Step 3:** SVG を描き、PNG を書き出し、app.json を直す
- [ ] **Step 4:** テストが通り、`bunx expo config --type public` に新しい背景色が出て、`bun run export:ios` が通るのを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: add the hamster icon and splash`

### Task 10: README と AGENTS.md

**Files:**
- Modify: `README.md`、`AGENTS.md`

README は Expo 版の内容に書き直す。アプリの説明、必要なもの（Expo Go が入った iPhone、SDK 54、bun）、起動（`bun install`、`bunx expo start`、QR コード。社内ネットワークでは `--tunnel`、`bun install` の接続エラーには `--network-concurrency 4`）、テスト（`bun test`、`bun run test:domain`、`bun run typecheck`、`node node_modules/eslint/bin/eslint.js src tests`）、たねと値段の調整（`src/game/economy.ts` の `SEEDS`、`src/game/shop.ts` の `SHOP`）、効果音とアイコンの作り直し（`bun run scripts/make-sounds.ts`、`assets/icon/icon.svg`）、テスト用の機能（保護者の画面の「テスト用」）、フォルダの表（`src` の各フォルダ、`tests`、`scripts`、`assets`、`docs`）、記録は端末の中だけで App Store 版へは移らないこと。AGENTS.md の「src/state は react-native を import しない」を、実際（`store.ts` だけが AsyncStorage を使い、ほかの state のモジュールは import しない）に合わせる。

- [ ] **Step 1:** 書き直し、書いたコマンドとパスが実在することを確かめる
- [ ] **Step 2:** コミットする。メッセージ `docs: rewrite the README for the Expo app`

### Task 11: 通し確認と実機チェックリスト D

**Files:**
- Modify: `docs/superpowers/specs/2026-10-29-hamzan-ios-design.md`（「実機チェックリスト D（仕上げ）」を足す）、確認で見つかった不具合の修正

チェックリスト D の項目: 新しいグッズを買って置くと、それぞれの遊び方をする（ほんだな、すべりだい、つりばし、ベッド、ピアノ、きんの まわしぐるま）／夜はベッドで眠り、ヘッドホンをつけるとときどき体をゆらす／ピアノの音が鳴り、「効果音」をオフにするか消音スイッチをオンにすると鳴らない／VoiceOver で、ちず、出題、結果、おへや、ショップ、保護者画面を操作でき、買う前の確認が読み上げられる／「さらに大きな文字」にしても文字が切れたり重なったりしない／Expo Go の一覧と読み込み中にハムスターのアイコンとスプラッシュが出る。

- [ ] **Step 1:** web 表示（幅 375、320、430）で、ショップの全商品、新しいグッズで遊ぶおへや、2 つのかべがみを見る
- [ ] **Step 2:** `bun run typecheck`、`bun test`、`bun run test:domain`、lint、`bun run export:ios`、`npx expo-doctor` を通す。直したものがあればコミットする（`fix: <見つかった不具合>`）
- [ ] **Step 3:** チェックリスト D を設計書に足してコミットする。メッセージ `docs(docs): add checklist D for the finishing phase`
