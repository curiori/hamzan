---
description: ハムざん Expo 版の段階 3（学習画面の移植）の実装計画
author: GitHub Copilot
ms.date: 2026-10-29
ms.topic: how-to
---

# ハムざん Expo 版 学習画面の移植 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web 版と同じ学習の流れ（初回の PIN とこども登録、入力テスト、診断、ちず、毎日のセッション、出題、結果、静的なおへや、保護者画面）を React Native の画面で動かす。

**Architecture:** 画面の振る舞い（入力欄、ヒントの進め方、出題の順番、ダッシュボードの集計）は React Native を import しない純粋な TS に置いて bun でテストし、画面部品は描画と操作の受け渡しだけにする。出題中の状態は保存しないストア（`src/state/play-store.ts`）に置き、`src/app/play.tsx` と `src/app/result.tsx` の 2 つの画面で共有する。移植元は `git show web-prototype:<path>`。

**Tech Stack:** Expo SDK 54、Expo Router 6、React Native 0.81、react-native-svg、react-native-reanimated、zustand、expo-keep-awake、expo-constants

**Spec:** `docs/superpowers/specs/2026-10-29-hamzan-ios-design.md`（前の計画: `docs/superpowers/plans/2026-10-29-hamzan-ios-foundation.md`）

## Global Constraints

- Global Constraints of the foundation plan apply（SDK 54 固定、Expo Go のモジュールだけ、bun、`src/domain` は変更しない、コミットの書式）
- 画面の文言は Web 版のものをそのまま使う（子ども向けはひらがな中心、保護者向けは漢字まじり）
- 縦向き、ライトテーマ。いちばん小さい画面は 375×667pt（iPhone SE）。出題画面はスクロールなしで収める
- 出題画面の文字は `maxFontSizeMultiplier` で拡大を 1.3 倍までにする
- 字体は iOS で本文 `HiraMaruProN-W4`、太字 `HiraginoSans-W7`。それ以外の環境（web 表示）はシステム字体と fontWeight
- テスト用の機能は `Constants.expoConfig?.extra?.enableTestTools === true` のときだけ出す
- React Native を import するファイルは bun のテストから読まない。振る舞いのテストは純粋な TS に対して書く
- 画面の確認は `bun run web`（Expo の web 表示）をブラウザで操作して行い、最後に `bun run export:ios` が通ること

## Review Focus

- 375×667 の画面で、ヒントモードの出題（問題、ヒント 2〜3 行、入力欄、キーパッド）がスクロールなしで収まる。Task 7 の画面確認で、ブラウザの表示を 375×667 にして確かめる
- 一時停止してから別アプリへ行って戻り、再開して答えても解答時間が正しい。ヒントで答えが出たあとに一時停止して再開しても不正解扱いのまま。Task 7 の画面確認で確かめる
- キーや OK を素早く 2 回押しても、二重に送信したり次の問題を飛ばしたりしない。Task 2 のテスト（送信後の入力を無視する）と Task 4 の画面（判定中は受け付けない）で押さえる
- 出題中に端から戻るジェスチャーをしても、黙ってセットが消えない。play 画面は `gestureEnabled: false`、やめるときは確認を出す（Task 4）
- 保存データの読み込みが終わる前に初回画面へ飛ばない。読み込み完了の印が立つまでスプラッシュを出したままにする（Task 3）

---

### Task 1: テーマ、共通部品、絵

**Files:**
- Create: `src/ui/theme.ts`、`src/ui/text.tsx`、`src/ui/button.tsx`、`src/ui/card.tsx`、`src/ui/progress-bar.tsx`、`src/ui/stars.tsx`、`src/ui/confirm.tsx`
- Create: `src/art/hamster.tsx`、`src/art/items.tsx`、`src/art/icons.tsx`、`src/art/room-scene.tsx`

**Interfaces:**
- Produces: `colors`（Web 版の配色を 16 進に直したもの。primary は `#8D5901` 付近）、`radius`、`space`、`fonts = { body, heavy }`
- Produces: `AppText`（Text に既定の字体と色）、`Button`（variant: `primary | outline | ghost | destructive`、size: `md | lg`、`icon?`、`onPress`、`disabled`）、`Card`、`ProgressBar({ value })`、`Stars({ n, size })`
- Produces: `ConfirmProvider` と `useConfirm(): (o: { title; description?; confirmLabel?; cancelLabel?; destructive? }) => Promise<boolean>`（Web 版 use-confirm と同じ呼び方）
- Produces: `HamsterBody({ mood, wear })`、`Hamster({ mood, wear, size })`、`ItemThumb({ id, size })`、`Paw`、`SeedIcon`、`RoomScene({ owned, wear, name, width })`。形と色は Web 版 hamster-art.tsx と同じ

- [ ] **Step 1:** Web 版 index.css の配色を 16 進に直して theme.ts に置く（oklch から sRGB への変換を一度だけ行い、値を書き込む）
- [ ] **Step 2:** 共通部品と confirm を作る
- [ ] **Step 3:** hamster-art.tsx を react-native-svg（`G`、`Circle`、`Ellipse`、`Path`、`Rect`、`Text`）へ写す。まわしぐるまの回転は Reanimated の回転で表す
- [ ] **Step 4:** `bun run typecheck`、`bun run lint`、`bun run export:web` が通ることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: add theme, ui kit and hamster art for react native`

### Task 2: 入力欄とヒントと出題の順番（純粋なロジック）

**Files:**
- Create: `src/features/play/field-set.ts`、`src/features/play/hint-flow.ts`、`src/features/play/play-queue.ts`
- Test: `tests/features/field-set.test.ts`、`tests/features/hint-flow.test.ts`、`tests/features/play-queue.test.ts`

**Interfaces:**
- Produces（field-set.ts）: `FieldDef = { kind: "num" | "bool"; digits: number; label: string; role: "plain" | "q" | "r" }`、`Key = "0" … "9" | "del" | "rem" | "ok" | "o" | "x"`、`FieldSet = { vals: string[]; active: number; done: boolean }`、`defsForAnswer(a: Answer | StepValue, label?: string): FieldDef[]`、`emptyFields(defs): FieldSet`、`pressKey(fs, defs, key, autoSubmit): FieldSet`、`toAnswer(defs, vals, like: Answer): Answer`、`toStep(vals, like: StepValue): StepValue`
- Produces（hint-flow.ts）: `HintState = { filled: (StepValue | null)[]; revealed: boolean[]; tries: number; attempt: number; missed: boolean; msg: string | null }`、`initHint(stepCount): HintState`、`activeStep(s): number`、`expectedStep(inst, sc: Scaffold, s, i): StepValue`、`submitHintStep(s, inst, sc, value): { state: HintState; event: "next" | "retry" | "revealed" | "estimateRetry" | "done"; correct?: boolean }`
- Produces（play-queue.ts）: `QueueItem = { inst; requeue: boolean }`、`PlayQueue = { items: QueueItem[]; pos: number; results: ProblemResult[] }`、`initQueue(problems): PlayQueue`、`currentItem(q): QueueItem | null`、`answerCurrent(q, r: { correct; given; latencyMs }, warm: boolean): PlayQueue`、`advance(q): PlayQueue`、`isFinished(q): boolean`、`firstAnswered(q): number`
- 規則は Web 版 play.tsx の useFieldSet、HintSolver、PlayScreen と同じ

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("autoSubmit sends when the answer's digit count is typed", () => {
  // defsForAnswer({ kind: "number", value: 42 }) に "4","2" → done === true
});
test("keys after done are ignored", () => {});
test("あまり moves to the remainder field only when the quotient is typed", () => {});
test("del on an empty field moves back to the previous field", () => {});
test("two misses on a hint step reveal the value and mark the problem missed", () => {
  // 2 回目のまちがいで event "revealed"、revealed[i] true、残りを正しく埋めると event "done" で correct false
});
test("a wrong estimate in ESTIMATE_DIVIDE clears the steps and keeps the miss flag", () => {});
test("a wrong first answer is asked again at the end without being recorded twice", () => {
  // answerCurrent(..., correct false, warm false) で items が 1 つ増え、results は 1 つ
});
test("warm-up never requeues", () => {});
```

- [ ] **Step 2:** テストが失敗することを確かめる
- [ ] **Step 3:** Web 版 play.tsx の該当部分を写して実装する
- [ ] **Step 4:** テストが通ることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: add pure play input, hint and queue logic`

### Task 3: 画面の土台（読み込み待ち、出題ストア、セッションの進行）

**Files:**
- Create: `src/state/play-store.ts`（保存しない zustand）、`src/session/use-session-runner.ts`、`src/platform/use-app-state.ts`
- Modify: `src/app/_layout.tsx`（スプラッシュを読み込み完了まで出す。ConfirmProvider、GestureHandlerRootView、Stack に `play`、`result`、`onboarding`、`parent` を追加）

**Interfaces:**
- Consumes: foundation plan の `useAppStore`、`activeProfile`、`nextSessionPlan`、`levelPlan`、`challengePlan`、`placementPlan`
- Produces（play-store.ts）: `usePlayStore` 状態 `{ plan: PlayPlan | null; summary: SetSummary | null; resultCtx: PlayContext | null }`、操作 `begin(plan)`、`showResult(summary, ctx)`、`clear()`
- Produces（use-session-runner.ts）: `useSessionRunner()` が返す `{ startNextPart(): void; startPlan(plan: PlayPlan): void; finish(outcome: PlayOutcome): void; quit(): void; goHome(): void }`。`PlayOutcome = { results: ProblemResult[]; interrupted: boolean; activeSec: number }`
- Produces（use-app-state.ts）: `useAppActive(onChange: (active: boolean) => void)`（AppState の active 以外を非アクティブとみなす）

- [ ] **Step 1:** play-store とセッション進行を作る。進行の規則は Web 版 pages/home.tsx の nextSessionPart、finish、goHome と同じ（飛ばした部分は `skipSessionPart`、終わったら `router.dismissAll()` でちずへ戻る）
- [ ] **Step 2:** ルートの layout を直す。`useAppStore` の `hydrated` が true になるまで `SplashScreen.preventAutoHideAsync()` のまま待つ
- [ ] **Step 3:** `bun run typecheck`、`bun run lint`、`bun test` が通ることを確かめる
- [ ] **Step 4:** コミットする。メッセージ `feat: add play store, session runner and hydration gate`

### Task 4: 出題画面と結果画面

**Files:**
- Create: `src/features/play/problem-text.tsx`、`src/features/play/field-box.tsx`、`src/features/play/keypad.tsx`、`src/features/play/answer-solver.tsx`、`src/features/play/memo-solver.tsx`、`src/features/play/hint-solver.tsx`、`src/features/play/visuals.tsx`、`src/features/play/play-screen.tsx`
- Create: `src/features/result/result-screen.tsx`
- Create: `src/app/play.tsx`、`src/app/result.tsx`

**Interfaces:**
- Consumes: Task 2 の純粋ロジック、foundation plan の active-clock と feedback、Task 3 の play-store と runner
- Produces: `PlayScreen({ req, settings, wear, onFinish, onQuit })`、`ResultScreen({ summary, title, wear, nextLabel, onNext, onRetry, onHome })`

- [ ] **Step 1:** 出題画面を作る。時計は active-clock（AppState とボタンの一時停止をそれぞれ理由として渡す）。一時停止中は回答部品を消さず、上に「いちじ ていし ちゅう」の幕をかぶせて問題を隠す。判定中（正解の 450ms、不正解の表示中）はキーを受け付けない。出題中は expo-keep-awake で画面を消さない
- [ ] **Step 2:** 「やめる」は確認を出す。play 画面は `gestureEnabled: false` の全画面表示
- [ ] **Step 3:** ヒントの図（10 のわく、ドット、数直線、位取り、九九の段）を View と SVG で写す。「半分」「倍数」のふりがなは小さい文字を上に置いて表す
- [ ] **Step 4:** 結果画面を写す（★、まちがい、1 もんあたり、じこベスト、復習、ステージチェック、メモ、ごほうび、つぎへ、もういちど、ホームへ）
- [ ] **Step 5:** `bun run typecheck`、`bun run lint`、`bun run export:web` が通ることを確かめる
- [ ] **Step 6:** コミットする。メッセージ `feat: port play and result screens`

### Task 5: 初回の流れと診断

**Files:**
- Create: `src/features/onboarding/pin-pad.tsx`、`src/features/onboarding/intro.tsx`、`src/features/onboarding/child-form.tsx`、`src/features/onboarding/input-test.tsx`、`src/features/onboarding/first-steps.tsx`、`src/features/onboarding/placement-view.tsx`
- Create: `src/app/onboarding.tsx`
- Modify: `src/app/(tabs)/_layout.tsx`（PIN かプロフィールがない、または診断が終わっていないときは `/onboarding` へ移る）

**Interfaces:**
- Produces: `PinPad({ title, note?, error?, onComplete(pin) })`（4 けた目のあとは 120ms 待ってから 1 回だけ呼ぶ。待っている間の入力は無視）、`InputTest({ onDone(perDigitSec: number[]) })`
- 初回の画面の分かれ方は Web 版 pages/home.tsx と同じ（PIN またはプロフィールがない → はじめに、入力テスト未実施 → FirstSteps、診断が終わっていないか終わり画面を見ていない → PlacementView）

- [ ] **Step 1:** PinPad、はじめに、PIN 2 回、こども登録を写す
- [ ] **Step 2:** 入力テストと FirstSteps を写す（キーパッドだけで入力する）
- [ ] **Step 3:** 診断の画面を写す。セットは Task 3 の runner で始め、結果のあとは診断の画面へ戻る
- [ ] **Step 4:** `bun run typecheck`、`bun run lint`、`bun run export:web` が通ることを確かめる
- [ ] **Step 5:** コミットする。メッセージ `feat: port onboarding, input test and placement`

### Task 6: ちず、おへや、保護者画面

**Files:**
- Create: `src/features/home/today-card.tsx`、`src/features/home/stage-map.tsx`、`src/features/home/level-sheet.tsx`、`src/features/home/header-actions.tsx`
- Create: `src/features/room/room-view.tsx`
- Create: `src/features/parent/dashboard-data.ts`、`src/features/parent/parent-gate.tsx`、`src/features/parent/parent-area.tsx`、`src/features/parent/dashboard.tsx`、`src/features/parent/trend-chart.tsx`、`src/features/parent/settings-pane.tsx`、`src/features/parent/profiles-pane.tsx`、`src/features/parent/data-pane.tsx`、`src/features/parent/test-pane.tsx`
- Create: `src/app/parent.tsx`
- Modify: `src/app/(tabs)/index.tsx`、`src/app/(tabs)/room.tsx`、`src/app/(tabs)/_layout.tsx`（右上にこどもの切り替えと「おうちの かたへ」）
- Test: `tests/features/dashboard-data.test.ts`

**Interfaces:**
- Produces（dashboard-data.ts）: `calendarDays(date, weeks = 5): { date: LocalDate; goal: boolean; practiced: boolean }[]`（引数にプロフィールも取る）、`trendSeries(p, levelId, limit = 20): { date: string; sec: number; errors: number }[]`、`speedLevels(p): LevelSpec[]`、`weakFactsTop(p, n = 10)`、`errorCounts(p, date, days = 30): Record<ErrorTypeId, number>`
- 保護者画面の入力テストは、表示中のこどもの ID を `saveInputTest` に渡す（Web 版の不具合 3 の修正）

- [ ] **Step 1: 失敗するテストを書く**（dashboard-data）

```ts
test("calendarDays covers five weeks ending today with goal and practice flags", () => {});
test("trendSeries keeps the last 20 S sets of a level and skips interrupted and placement sets", () => {});
test("errorCounts counts mistakes of the last 30 days by type", () => {});
```

- [ ] **Step 2:** テストが失敗することを確かめ、dashboard-data を実装して通す
- [ ] **Step 3:** ちず（きょうの れんしゅう、ゴールのしるし、チャレンジ、ステージの地図、レベルの詳細）を写す
- [ ] **Step 4:** おへや（静的な部屋の絵、ごほうびの一覧、きせかえ）を写す。動き回る部屋は段階 4 で作る
- [ ] **Step 5:** 保護者画面（PIN ゲート、PIN を忘れたとき、ダッシュボード、設定、プロフィール、データ、テスト用、アプリ情報）を写す。グラフは react-native-svg の折れ線
- [ ] **Step 6:** `bun test`、`bun run typecheck`、`bun run lint`、`bun run export:web` が通ることを確かめる
- [ ] **Step 7:** コミットする。メッセージ `feat: port map, room and parent screens`

### Task 7: 画面の通し確認

**Files:**
- Modify: 確認で見つかった不具合の修正（あれば）

- [ ] **Step 1:** `bun run web` を起動し、ブラウザを 375×667 にして、初回の流れ（PIN、こども登録、入力テスト、短い診断）からちずまでを通す
- [ ] **Step 2:** スピード、ヒント、メモの各モードで 1 セットずつ行い、まちがえた問題が最後にもう一度出ることと、結果画面を確かめる
- [ ] **Step 3:** ヒントで答えが出たあとに一時停止、再開して、不正解扱いのままであることを確かめる。一時停止中に画面を隠して戻し、解答時間が 0 にならないことを確かめる
- [ ] **Step 4:** 保護者画面で別の子を選んで入力テストをし、その子に保存されることを確かめる
- [ ] **Step 5:** `bun run export:ios` が通ることを確かめ、修正があればコミットする。メッセージ `fix: <見つかった不具合>`
