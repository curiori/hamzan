---
description: はむ算 Expo 版の手直し（レビューで持ち越した小さな点と、ゴールのたねの判断）の実装計画
author: GitHub Copilot
ms.date: 2026-10-31
ms.topic: how-to
---

# はむ算 Expo 版 手直し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 段階 1〜6 の最終レビューで「あとまわし」にした小さな点を片づけ、持ち主の判断を待っていた「最後の区切りを中断した日のゴールのたね」（Plan D の M4）を決めて直す。設計にない機能は足さない。

**Architecture:** たねと判定の記録は純粋な TS（`src/game/economy.ts`、`src/state/record-set.ts`）で直し、bun でテストする。画面の手直し（出題画面、確認の窓とシート、保護者の画面、ショップ、おへや）は、決まりを純粋なモジュール（`src/platform/active-clock.ts`、`src/features/room/stage-rules.ts`、`src/game/hamster-brain.ts`）に出せるものは出してテストし、見た目と動きはヘッドレス Chrome での web 表示の確認で確かめる。

**Tech Stack:** Expo SDK 54、React Native 0.81、react-native-reanimated 4.1、react-native-svg、zustand、bun test

**Spec:** `docs/superpowers/specs/2026-10-29-hamzan-ios-design.md`（「たねのもらい方」「おへや：動き回るハムスター」「テストと確認」「実機チェックリスト A〜D」）。持ち越しの出どころは、`docs/superpowers/plans/` の Plan A〜E の最終レビュー

**扱う持ち越し:**

- Plan A: recordSet に診断の完了、チャレンジのベスト、復習の合格のテストがない（Task 1）
- Plan B: 確認の窓が既定のラベルに戻りながら消え、レベルのシートが空で下がる（Task 4）。「やめる？」の「つづける」で一時停止のまま（Task 3）。250 ms ごとに出題画面全体を描き直し、createClock が毎回動く（Task 3）。使っていないコードと、PIN を設定し直すときの不一致で何も出ないこと（Task 5）。5-10 のきまりのカードで最後の行が 1 字になること（Task 5）
- Plan D: 夜もまどに太陽が出て、夜の色が灰色に見える（Task 6）。テスト用の全グッズ表示で seen が上書きされる（Task 7）。最後の区切りを中断した日のゴールのたね（Task 2）
- Plan E: コースの遊びをスポットから少しずれて始めると、終わりと周の切り替わりでとび、奥ではグッズがハムスターの前に描かれる（Task 7）。AGENTS.md のテスト対象の一覧（Task 8）。置けなかったときの「いっぱい」の案内が 2 回出る（Task 5）。きんの まわしぐるまで転んでも「きらきら」が残る（Task 7）

**扱わない持ち越し:**

- AppState の名前が React Native の AppState と同じ（Plan A）: いまは両方を読むファイルがなく、ぶつからない
- VS Code のブラウザでアイコンフォントの読み込みが時間切れになる（Plan B）: アプリではなく環境の問題

## Global Constraints

- 前の計画の Global Constraints を引き継ぐ（SDK 54 固定、Expo Go のモジュールだけ、bun、`src/domain` と `curriculum.json` は変更しない、コミットの書式、React Native を import するファイルは bun のテストから読まない、新しい依存は入れない）
- たねの数（`SEEDS`）、売り物と値段（`SHOP`）、スロット 11 か所、グッズごとの遊び方は変えない
- 中断したセット（判定しないセット）は、そのセットの分は 0。そのセットでその日のゴールに届いたときだけ、ゴールの +20 を出す（Task 2 の判断）
- ゴールのたねは 1 日 1 回。じゆう れんしゅう（extra）でゴールに届くことはない
- 記録は端末の中だけ（AsyncStorage のキー `hamzan-ios-v1`、persist の version 2）。保存の形は変えない
- テスト用の「おへやに すべての グッズを置いて見る」は記録を変えない（README の約束）
- iPhone SE（375×667pt）で、ヒントモードの出題（5-10 を含む）はスクロールなしで収まる
- 子ども向けの文言はひらがな中心、保護者向けは漢字まじり。新しい文言は各 Task に書いたとおり

## Review Focus

- その日の最後の区切りが中断になった（60 秒以上バックグラウンドにいた）とき、ゴールの +20 はちょうど 1 回出て、同じ区切りをもう一度やっても 2 回目は出ない。残りの区切りに出す問題がなければ、問題のあった最後のセットでゴールに届き、そのあと「つぎへ」でホームに戻っても 2 回目は出ない。Task 2 のテストで押さえる
- 出題中に「やめる」から「つづける」を押すと、押す前の一時停止の状態に戻る（自分で止めていなければ再開、止めていたら止めたまま）。確認の窓が出ている間は解答時間に数えない。Task 3 の web 確認で押さえる
- 時間の表示を出題画面から切り離しても、ウォームアップは一時停止とバックグラウンドを数えずに決まった時間で終わり、一時停止中は表示が止まる。Task 3 の `liveMs` と `warmupLeftMs` のテストと web 確認で押さえる
- 閉じる途中の確認の窓とシートは、閉じきるまで前の中身を出し、その間に押しても効かない。続けて別の中身で開くと、すぐに新しい中身が出る。Task 4 の web 確認で押さえる
- すべりだい、ピアノ（ゆか・大の 3 か所）とつりばし（てんじょうの 2 か所）は、スポットから少しずれたところから遊び始めても、遊びの前にスポットへ歩き、グッズより手前に描かれる。Task 7 のテストで押さえる

---

### Task 1: recordSet の診断、チャレンジ、復習の合格のテスト

設計の「recordSet：Web 版と同じ結果になる（★判定、マスター、復習の降格、ステージチェック、診断の完了、セッションのゴール、ごほうび）」のうち、テストのない 3 つを足す。製品のコードは変えない。

**Files:**

- Test: `tests/state/record-set.test.ts`

**Interfaces:**

- Consumes: `recordSet(p0, run, ctx)`（`src/state/record-set.ts`）、`startPlacement`、`applyPlacementResult`（`src/domain/placement.ts`）、`applyReview`、`scheduleOnMastery`（`src/domain/review.ts`）、テストの補助 `profileWith`、`results`、`mkRun`、`ctx`
- Produces: テストだけ

- [ ] **Step 1: テストを書く**

```ts
describe("recordSet: diagnosis, challenge and reviews", () => {
  test("the set that finishes the diagnosis applies its result and marks it done", () => {
    // p.placement = startPlacement(4)。区切りの種類（placementPhase）は p.placement.phase に合わせ、phase が "done" になるまで
    // recordSet で診断のセットを続ける（上限 40 セット。超えたらテストを失敗させる）
    // 最後の summary.placement.phase は "done"、profile.placementDone は true
    // profile.progress と profile.reviews は applyPlacementResult(最後の状態, DATE) の progress と reviews に等しい
    // "done" の前のセットでは placementDone は false
  });
  test("an interrupted diagnosis set adds its time but does not move the diagnosis on", () => {
    // interrupted: true、activeSec 30 のセット（同じ日）: profile.placement.phase は前と同じ、placementDone は false、
    // profile.placement.secondsToday は 30 ふえる
  });
  test("a clean challenge sets the best, and a slower, wrong or interrupted one keeps it", () => {
    // まちがいなし、latencyMs 1500: summary.challengeBest = { sec: 1.5, isNew: true }、profile.challenge = { lastDate: DATE, bestSec: 1.5 }
    // そのあと、まちがいなしで 2000: { sec: 1.5, isNew: false }。まちがい 1 つで 1000: { sec: 1.5, isNew: false }
    // interrupted で 1000: { sec: 1.5, isNew: false }。どれも profile.challenge.lastDate は DATE
  });
  test("a passed review keeps the mastery and moves the review to its next date", () => {
    // マスター済みの "1-1"、item = scheduleOnMastery("1-1", DATE)、p.reviews = [item]。item.dueDate の日に、まちがいなし、latencyMs 100 の review セット
    // summary.reviews = [{ levelId: "1-1", passed: true, demoted: false }]
    // profile.reviews = [applyReview(item, true, item.dueDate).item]、profile.progress["1-1"].masteredAt は DATE のまま
    // summary.seeds.lines = [{ kind: "review", seeds: 5 }]
  });
});
```

- [ ] **Step 2: 通るのを確かめる**

Run: `bun test tests/state/record-set.test.ts`
Expected: 新しい 4 件を含めてすべて PASS。いまの動きを押さえるテストなので、失敗したら recordSet の不具合として、`src/` を変えずに失敗した assertion を報告する（DONE_WITH_CONCERNS）

- [ ] **Step 3: コミットする**

メッセージ `test: cover the diagnosis, the challenge best and passed reviews in recordSet`

### Task 2: 中断した最後の区切りと、出す問題のない残りの区切りでも、ゴールのたねを出す（M4）

判断: その日のゴールは、学習側（Web 版と同じ recordSet）が、最後の区切りが中断でも「たっせい」にする。中断は「60 秒以上バックグラウンドにいた」セットで、問題はすべて答えている（「やめる」は記録しないので区切りは進まない）。ゴールの +20 は日の節目なので、そのセットの分（せいかい、さいごまで、★2 など）は 0 のまま、ゴールの +20 だけを出す。結果画面の「きょうの ゴール たっせい！」と、たねの行がそろう。もう 1 つ、残りの区切りに出す問題がない（あとで自動でとばす）とき、いまは「つぎへ」のあとに黙ってゴールになり、たねも結果画面の案内も出ない。問題のあった最後のセットを記録するときに、出す問題のない区切りを先に済ませ、そのセットでゴールに届くようにする。

**Files:**

- Modify: `src/game/economy.ts`（`awardSeeds`）、`src/state/record-set.ts`（`recordSet`）、`src/state/create-store.ts`（`recordSet` の action）、`docs/superpowers/specs/2026-10-29-hamzan-ios-design.md`（「たねのもらい方」の箇条）
- Test: `tests/game/economy.test.ts`、`tests/state/record-set.test.ts`、`tests/state/store.test.ts`

**Interfaces:**

- Consumes: `sessionPartPlan(part: SessionPart, idx: number, p: Profile, date: LocalDate, unlockAll: boolean): PlayPlan | null`（`src/session/requests.ts`。null は出す問題がない区切り）
- Produces: `recordSet(p0: Profile, run: SetRun, ctx: { date: LocalDate; now: number; unlockAll?: boolean })`。`unlockAll` を省くと false
- Produces: `awardSeeds` は `interrupted` のとき、`goalReached` なら lines `[{ kind: "goal", seeds: SEEDS.goal }]`、そうでなければ空を返す。wallet の `earnedToday` と `bestToday` は変えない

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/game/economy.test.ts
test("an interrupted set pays only the day's goal it reaches", () => {
  // 区切りのセット（inSession: true）で interrupted: true、firstCorrect 10、events ["star2"]、goalReached: true
  // → lines [{ kind: "goal", seeds: 20 }]、total 20、wallet.seeds は +20、wallet.earnedToday はそのまま
  // goalReached: false なら lines []、total 0
});

// tests/state/record-set.test.ts
test("an interrupted last part reaches the goal once and pays only the goal", () => {
  // plan [{ kind: "warmup" }, { kind: "slot", slot: "frontier" }]、done 1。sessionPart 1 の S セットを interrupted: true で記録
  // summary.result "interrupted"、summary.goalReached true、summary.seeds.lines [{ kind: "goal", seeds: 20 }]、wallet.seeds は +20
  // 同じ sessionPart をもう一度記録すると goalReached false で、"goal" の行はない
});
test("parts left with nothing to ask are passed, so the set before them reaches the goal", () => {
  // plan [warmup, slot frontier, { kind: "review", levelIds: ["1-1"] }]、done 1、p.reviews は空（review の区切りに出す問題がない）
  // sessionPart 1 の S セット: profile.sessions[DATE] は { plan, done: 3, goal: true }、summary.goalReached true、seeds に { kind: "goal", seeds: 20 }
});
test("a later part with something to ask keeps the goal for later", () => {
  // 上と同じ plan で、p.reviews = [scheduleOnMastery("1-1", DATE, 0)]: done 2、goal false、goalReached false
});

// tests/state/store.test.ts
test("a set recorded through the store reaches the goal when the rest of the session has nothing to ask", () => {
  // テスト用の保存先でストアを作り、こどもの今日の sessions に上の plan（done 1、reviews なし）を入れ、sessionPart 1 のセットを recordSet
  // 返った summary.goalReached は true、ストアのこどもの sessions[今日].goal は true
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `bun test tests/game/economy.test.ts tests/state/record-set.test.ts tests/state/store.test.ts`
Expected: 新しいテストのうち「a later part with something to ask」以外が FAIL（goal の行がない、done が 2 のまま）

- [ ] **Step 3: 実装する**

- `awardSeeds`: `interrupted` のときの早い return で、ゴールに届いたら goal の行だけを返す
- `recordSet`: 区切りを進めたあと、`done` が plan の長さに届くまで、`sessionPartPlan(d.plan[done], done, p, day, ctx.unlockAll ?? false)` が null の区切りを済ませる（`day` は `run.sessionDate ?? date`、`p` はこのセットを反映したあとのプロフィール）。`goal` と `summary.goalReached` はその `done` から決める
- create-store の `recordSet`: `unlockAll: get().dev.unlockAll` を渡す
- 設計の「たねのもらい方」の箇条: 「中断したセット（判定しないセット）は 0」を「中断したセット（判定しないセット）は 0。ただし、そのセットでその日のゴールに届いたときは、ゴールの +20 を出す」にし、「残りの区切りに出す問題がないときは、問題のあった最後のセットでゴールに届く」を足す

- [ ] **Step 4: 通るのを確かめる**

Run: `bun test`、`bun run test:domain`、`bun run typecheck`
Expected: すべて PASS

- [ ] **Step 5: コミットする**

メッセージ `fix: pay the day's goal when its last part is interrupted or the rest has nothing to ask`

### Task 3: 出題画面で「つづける」から再開し、時間の表示だけを刻む

**Files:**

- Modify: `src/platform/active-clock.ts`、`src/features/play/play-screen.tsx`
- Test: `tests/platform/active-clock.test.ts`

**Interfaces:**

- Produces（`active-clock.ts`）: `liveMs(c: ClockState, now: number, asking: boolean): number`。`c.activeTotal` に、`asking` のときだけ `itemElapsedMs(c, now)` を足す
- Produces（`active-clock.ts`）: `warmupLeftMs(c: ClockState, now: number, asking: boolean, warmupSec: number): number`。`Math.max(0, warmupSec * 1000 - liveMs(c, now, asking))`

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("live time adds the open item only while a problem is asked, and never the paused time", () => {
  // c = createClock(0)（itemStart は 150）: liveMs(c, 1150, true) = 1000、liveMs(c, 1150, false) = 0
  // c2 = pauseFor(c, "user", 1150): liveMs(c2, 3150, true) = 1000
  // c3 = resumeFor(c2, "user", 3150): liveMs(c3, 4150, true) = 2000
});
test("the warm-up time left leaves out the background and stops at zero", () => {
  // c = createClock(0): warmupLeftMs(c, 20150, true, 60) = 40000
  // c2 = pauseFor(c, "background", 20150): warmupLeftMs(c2, 50150, true, 60) = 40000
  // c3 = resumeFor(c2, "background", 50150): warmupLeftMs(c3, 100150, true, 60) = 0
});
```

- [ ] **Step 2:** `bun test tests/platform/active-clock.test.ts` が、`liveMs` と `warmupLeftMs` がないことで失敗するのを確かめる
- [ ] **Step 3: 時計の関数を実装する**
- [ ] **Step 4: 出題画面を直す**

- `clock` は最初の 1 回だけ作る: `const [firstClock] = useState(() => createClock(clockNow()))` と `useRef(firstClock)`
- 250 ms ごとの `setNow` をやめる。`now` の state は、答え、一時停止、バックグラウンド、ウォームアップの終わりのときだけ変わる
- 時間の表示（タイマーがオンのときの「〇.〇びょう」）とウォームアップの ProgressBar（label「ウォームアップの のこり」）は、play-screen.tsx の中の小さな部品 `LiveTime` と `WarmupBar` にし、それぞれが 250 ms ごとに自分だけを描き直す。値は `liveMs(clock.current, Date.now(), phase === "ask")` から。見た目と文字の大きさの上限はいまと同じ
- ウォームアップの終わり: phase が "ask" で一時停止していない間、`warmupLeftMs` の残りのあとに `now` を進めるタイマーを置き、残りが 0 なら `finish(queue)`。一時停止やバックグラウンドで残りが変わったら、タイマーを置き直す
- `quit`: 確認の前に一時停止していたかを覚え、「つづける」（`ok` が false）なら、確認のために止めたときだけ `setUserPause(false)` で再開する

- [ ] **Step 5: 通るのを確かめる**

Run: `bun test`、`bun run typecheck`
Expected: PASS

- [ ] **Step 6: web で確かめる（375×667）**

- 出題中に「やめる」→「つづける」: 一時停止の幕が出ず、そのまま答えられる。タイマーは確認の窓の間止まり、閉じると進む
- 「いちじ ていし」→「やめる」→「つづける」: 幕が出たまま
- タイマーがオンのとき、`AnswerSolver` の描き直しが答えたときだけ増える（確認の間だけ一時的に `console.count` を入れ、3 秒で増えないこと。コミットの前に消す）
- ウォームアップ: 「いちじ ていし」したまま残りの時間より長く待っても終わらず、ProgressBar も進まない。再開すると、残りの時間がたったあとに結果画面に移る

- [ ] **Step 7: コミットする**

メッセージ `fix: resume a set from the quit question and tick only the time on the play screen`

### Task 4: 閉じる途中の確認の窓とシートは、前の中身のまま下がる

**Files:**

- Create: `src/ui/use-kept.ts`
- Modify: `src/ui/confirm.tsx`、`src/ui/sheet.tsx`、`src/features/home/level-sheet.tsx`

**Interfaces:**

- Produces: `useKept<T>(value: T | null): T | null`。value が null でなければ value。null のあいだは、最後に null でなかった値（はじめから null なら null）。ref に入れて返すだけで、state は使わない（毎回新しいオブジェクトを渡しても描き直しが続かない）
- `ConfirmProvider`: 表示（題、説明、2 つのラベル、destructive）は `useKept(open)` から。`visible={!!open}` のまま。閉じる途中（open が null）の箱は `pointerEvents="none"`
- `Sheet`: `visible` のときの `{ title, subtitle, children }` を `useKept` で持ち、閉じる途中も出す。閉じる途中の中身は `pointerEvents="none"`、`accessibilityElementsHidden`、`importantForAccessibility="no-hide-descendants"`
- `LevelSheet`: 中身は `useKept(levelId)` のレベルから作り、`visible={!!levelId}` のまま。閉じる途中は押せない

- [ ] **Step 1: 実装する**
- [ ] **Step 2:** `bun run typecheck` と `bun test` が通るのを確かめる
- [ ] **Step 3: web で確かめる（375×667）**

閉じる操作のあと 40 ms ごとに画面を撮り、次を見る。

- 出題中の「やめる」→「つづける」: 消えていく窓に「とちゅうで やめますか？」「やめる」「つづける」が出たままで、「キャンセル」「OK」が一度も出ない
- ちずでレベルを開いて「とじる」: 下がっていくシートにレベルの名前と「れんしゅうする」が出たまま
- ショップで品物を開いて「とじる」: 下がっていくシートに品物の名前と中身が出たまま
- 閉じてすぐ別のレベルを開くと、はじめから新しいレベルの中身が出る

- [ ] **Step 4: コミットする**

メッセージ `fix: keep dialogs and sheets filled while they close`

### Task 5: 保護者の画面、ショップ、ヒントの小さな手直しと、使っていないコード

**Files:**

- Modify: `src/features/parent/parent-gate.tsx`、`src/features/shop/item-preview.tsx`、`src/features/shop/shop-view.tsx`、`src/features/play/hint-solver.tsx`、`src/features/play/play-queue.ts`、`src/state/play-store.ts`、`tests/features/play-queue.test.ts`
- Delete: `src/ui/card.tsx`

**Interfaces:**

- Produces: `ItemPreview` の props に `showFull?: boolean`（省くと true）

- [ ] **Step 1: PIN を設定し直すときの不一致を伝える**

`parent-gate.tsx` の「もう一度入力」で 1 回目とちがうとき、`error` に「一致しませんでした。最初からやり直してください」（`setup.tsx` と `parent-area.tsx` と同じ文言）を入れて「新しいPIN（4桁）」に戻し、その PinPad に `error` を渡す。新しい PIN を入れ直したら `error` を消す。コミット `fix: say so when the new PIN does not match`

- [ ] **Step 2: 置けなかったときの案内を 1 つにする**

`shop-view.tsx` は `ItemPreview` に `showFull={flow.step !== "done"}` を渡す。done の画面には、結果の「おく ばしょが いっぱい。もようがえで いれかえてね」だけが出る（読み上げも 1 回）。コミット `fix: show the no-room note once after buying`

- [ ] **Step 3: 5-10 のきまりのカードを、きまりの切れ目でだけ改行する**

`RULE_CARD` の文字列を 5 つのきまり（`2・5は いちのくらい`、`4は したの 2けた`、`8は したの 3けた`、`3・9は かくくらいの かずを たす`、`6は 2と 3の りょうほう`）の配列にし、`flexDirection: "row"`、`flexWrap: "wrap"` の View に、きまりごとの AppText（最後以外は末尾に「／」）を並べる。カードの見た目（背景、余白、文字の大きさ、`compact` のときの大きさ、`maxFontSizeMultiplier`）はいまと同じ。View は `accessible`、`accessibilityLabel` はきまりを「、」でつないだもの。コミット `fix: break the 5-10 rule card only between rules`

- [ ] **Step 4: 使っていないコードを消す**

`src/ui/card.tsx`、`usePlayStore` の `clear`、`play-queue.ts` の `firstAnswered` と、`tests/features/play-queue.test.ts` の `firstAnswered` の import と assertion を消す。コミット `refactor: remove the unused card, play store clear and firstAnswered`

- [ ] **Step 5:** `bun test`、`bun run typecheck`、`node node_modules/eslint/bin/eslint.js src tests` が通るのを確かめる
- [ ] **Step 6: web で確かめる**

- 保護者の画面で「PINを忘れたとき（3秒長押し）」から設定し直し、1111 のあと 2222: 「新しいPIN（4桁）」に戻り、不一致の文言が出る
- 置き場所がいっぱいのときにグッズを買って「おく」まで進める: done の画面に「いっぱい」の文言が 1 つだけ
- 375×667 と 320×568（テスト用の「すべてのレベルを開放する」で 5-10 をヒントモードに）: きまりのカードの各行が、きまりの途中で切れず、出題の画面はスクロールなしで収まる（ScrollView の中身の高さが見える高さ以下）

### Task 6: 夜のおへやは、まどに月と星が出て、青い夜の色になる

**Files:**

- Modify: `src/art/room-scene.tsx`（`RoomBackground`）、`src/features/room/room-stage.tsx`（`Background` に夜を渡し、夜の色を stage-rules から使う）、`src/features/room/stage-rules.ts`
- Test: `tests/features/stage-rules.test.ts`

**Interfaces:**

- Produces（`stage-rules.ts`）: `export const NIGHT_BLUE = "#1C3AB0"`（room-stage.tsx の夜の色をこれに替える。濃さ `nightTint` の 0.3 と 0.12 は変えない）
- Produces: `RoomBackground({ wallpaper, floor, night = false }: { wallpaper?: string | null; floor?: string | null; night?: boolean })`。ショップのプレビュー（`RoomScene`）は昼のまま
- 夜のまど: 空 `#2E3F7F`、太陽は出さない。三日月は `#FFF1B5` の円（中心 222, 40、半径 9）に、空の色の円（中心 226, 37、半径 8）を重ねる。星は白い円（半径 1.3）を (166, 34)、(184, 58)、(204, 30)、(176, 76) に。わくは昼と同じ

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("the night blue reads blue, not gray, over the plain wall", () => {
  // かべ #FBF1DF に NIGHT_BLUE を nightTint(true, false) の濃さで重ねた色（チャンネルごとに (1 - a) * かべ + a * 夜）で、
  // 青が赤より 20 以上、緑より 15 以上大きい
  // ランプがあるとき（nightTint(true, true)）の色は、ないときより明るい（r + g + b が大きい）
});
```

- [ ] **Step 2:** `bun test tests/features/stage-rules.test.ts` が、`NIGHT_BLUE` がないことで失敗するのを確かめる
- [ ] **Step 3: 実装する**
- [ ] **Step 4:** `bun test` と `bun run typecheck` が通るのを確かめる
- [ ] **Step 5: web で確かめる**

時間帯を夜（21 時以降）にして、ランプなし、ランプあり、昼のおへやを撮る。夜はまどに三日月と星が見え、部屋が灰色ではなく青っぽく暗い。昼はいまと同じ。撮った画像の場所を報告に書く

- [ ] **Step 6: コミットする**

メッセージ `fix: show the moon in the window and a blue night in the room`

### Task 7: おへやの動き（コースはスポットから、転んだら吹き出しを消す、テスト用の表示は seen を変えない）

**Files:**

- Modify: `src/game/hamster-brain.ts`（`playPlan`）、`src/features/room/stage-rules.ts`、`src/features/room/room-stage.tsx`
- Test: `tests/game/hamster-brain.test.ts`、`tests/features/stage-rules.test.ts`

**Interfaces:**

- `playPlan`: コースのあるグッズ（`src/game/room.ts` の `COURSES` にあるもの: slide、bridge、piano）は、スポットまでの距離が 1 以上なら、`MIN_WALK` より近くてもスポットへ歩いてから遊ぶ（1 未満のずれは見えないので歩かない）。ほかのグッズはいまと同じ（`MIN_WALK` より近ければ歩かない）
- Produces（`stage-rules.ts`）: `surprisedLook(lk: Look): Look`。`{ ...lk, view: "front", mood: "oops", pose: undefined, bubble: null }`。room-stage.tsx の `HamsterSprite` は、`surprised` のときこれで描く（いまの view、mood、pose の置きかえをこれにまとめる）
- Produces（`stage-rules.ts`）: `roomSeenToSave(allGoods: boolean, shown: string[]): string[] | null`。テスト用の全グッズ表示のときは null（記録を変えない）、そうでなければ shown。room-stage.tsx は null でないときだけ `markRoomSeen` を呼ぶ

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/game/hamster-brain.test.ts
test("a course play starts on its spot, even from a step away", () => {
  // slide と piano はゆか・大の 3 か所、bridge はてんじょうの 2 か所それぞれで、World の goods を [{ id: good, spot: SLOTS[s].spot }] にし、
  // スポットから x に 10 ずれたところで tapGood → 計画は [{ kind: "walk", to: スポット, ... }, { kind: "play", good, ... }]
  // wheel（floorL2）は同じずれで walk なしの [{ kind: "play", ... }]（いまと同じ）
});
// いまの「never stalls ... walks cover at least MIN_WALK」の World にはコースのあるグッズがないので、そのまま通る。変えない

// tests/features/stage-rules.test.ts
test("a hamster on a course is drawn in front of its good in every slot of the good's kind", () => {
  // slide、piano: floorL1〜3 で hamsterDepth({ kind: "play", good, variant: "normal", ms: 3000 }, SLOTS[s].spot) > SLOTS[s].depth
  // bridge: ceil1、ceil2 で ABOVE_ALL
});
test("a surprised hamster shows no bubble", () => {
  // surprisedLook(look({ kind: "play", good: "goldwheel", variant: "tumble", ms: 3000 })): bubble null、view "front"、mood "oops"、pose undefined
});
test("the test view of every good leaves the room's seen list alone", () => {
  // roomSeenToSave(true, ["bowl", "wheel"]) は null、roomSeenToSave(false, ["bowl", "wheel"]) は ["bowl", "wheel"]
});
```

- [ ] **Step 2:** `bun test tests/game/hamster-brain.test.ts tests/features/stage-rules.test.ts` で、コースのテスト、`surprisedLook`、`roomSeenToSave` のテストが失敗するのを確かめる（手前に描くテストは、いまのスポットの位置で通る）
- [ ] **Step 3: 実装する**
- [ ] **Step 4:** `bun test` と `bun run typecheck` が通るのを確かめる
- [ ] **Step 5: web で確かめる**

- すべりだいとピアノを、スポットから少しずれたところ（ゆかをタップしてずらす）から遊ばせる: 遊びの前に少し歩き、周の切り替わりと終わりでハムスターがとばない
- きんの まわしぐるまで転ぶまで待つ: びっくり顔のとき「きらきら」が出ていない
- テスト用の全グッズ表示をオンにしておへやを開き、オフに戻す: 保存の `room.seen` が、オンにする前と同じ

- [ ] **Step 6: コミットする**

コミットを 3 つに分ける。`fix: start course plays on their spot`、`fix: drop the sparkle bubble when the golden wheel throws the hamster out`、`fix: leave the seen goods alone in the test view of every good`

### Task 8: 文書と通しの確認

**Files:**

- Modify: `AGENTS.md`、`docs/superpowers/specs/2026-10-29-hamzan-ios-design.md`（実機チェックリスト）

- [ ] **Step 1: AGENTS.md の bun test の決まりを正しくする**

「Keep the logic `bun test` loads free of…」の行を、「`tests/` のテストが import するモジュールには `react-native` と Expo を import しない」という決まりと、いまの一覧にする。一覧は `src/domain`、`src/game`、`src/i18n/ja.ts`、`src/session/requests.ts`、`src/platform/active-clock.ts`、`src/ui/font-scale.ts`、`src/features` の純粋な補助（`play/field-set.ts`、`play/hint-flow.ts`、`play/play-queue.ts`、`onboarding/gate.ts`、`onboarding/input-test-flow.ts`、`onboarding/pin-entry.ts`、`parent/dashboard-data.ts`、`result/result-text.ts`、`room/stage-rules.ts`）、`src/state` の `store.ts` 以外。書く前に `tests/` の import を数え直し、この計画で増えたものがあれば足す。`store.ts` の説明の文はいまのまま残す

- [ ] **Step 2: 実機チェックリストに手直しの確認を足す**

- A: 「やめる」の確認で「つづける」を押すと、すぐに続きから再開する（自分で一時停止していたときは止めたまま）
- A: 確認の窓やシートを閉じるとき、閉じきるまで中身が見えている
- A: PIN を忘れたときの設定し直しで、2 回目の入力がちがうと「一致しませんでした。最初からやり直してください」が出る
- A: 5-10 のヒントで、きまりのカードがきまりの切れ目で改行される
- B: 夜はまどに月と星が出て、部屋が青っぽく暗くなる（ランプがあると明るめ）
- B: すべりだい、ピアノ、つりばしで遊ぶとき、始めと終わりと周の切り替わりで、ハムスターがとばない。きんの まわしぐるまで転んだとき、吹き出しが残らない
- C: その日の最後の区切りの途中で 60 秒以上ほかのアプリにいても、結果画面に「きょうの ゴール +20」が出る
- C: 置き場所がいっぱいのグッズを買ったあと、「いっぱい」の案内は 1 つだけ

- [ ] **Step 3: 通しで確かめる**

Run: `bun run typecheck`、`bun test`、`bun run test:domain`、`node node_modules/eslint/bin/eslint.js src tests`、`bun run export:ios`、`npx expo-doctor`（ネットが切れたら 1 回やり直す）
Expected: すべて通る（expo-doctor は 18/18）

- [ ] **Step 4: コミットする**

AGENTS.md は `docs: list every module bun test loads in AGENTS.md`、設計は `docs(docs): add the polish checks to the device checklists`
