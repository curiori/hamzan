---
title: ハムざん
description: 中学受験向けの暗算トレーニングアプリ（Expo 版。iPhone と iPad の Expo Go で動かし、家族の端末向けの本番版を EAS で作る）
---

## ハムざんについて

中学受験向けの暗算トレーニングアプリです。89 のレベル（10 ステージ）を「ちず」でたどり、ヒント・メモ・スピードの 3 つのモードで練習します。毎日の「きょうの れんしゅう」では、ウォームアップのあとに、いま取り組んでいるレベル、ステージのまとめのチェック、復習を組み合わせて出題します。

89 のレベルは 1 本のコースです。整数の暗算（数の感覚から 3 けたと大きな数まで）のあとに、小数と分数、円周率の計算、単位の換算を学び、受験の技（計算を短くする技）と見積もり（答えのだいたいの大きさをつかむ）で終わります。

練習すると、ひまわりの たねが たまります。たねは「ショップ」で、おへやの グッズ、きせかえ、かべがみ・ゆか、おやつと交換できます。「おへや」では、ハムスターが歩き回り、グッズで遊び、夜はベッドやおうちで眠ります。★2 やマスターなどの節目には、ごほうびの グッズも届きます。

保護者の画面（PIN で守られています）では、練習の記録、設定、プロフィール、データの消去と、記録の書き出し・読み込みを扱います。VoiceOver と大きな文字にも対応しています。

Web 版のプロトタイプ（タグ `web-prototype`）を、iPhone の Expo Go で動く Expo アプリへ作り替えたものです。設計は [docs/superpowers/specs](docs/superpowers/specs/)、実装計画は [docs/superpowers/plans](docs/superpowers/plans/) にあります。

## 必要なもの

* iPhone と、App Store 版の [Expo Go](https://expo.dev/go)（SDK 58 に対応）
* PC に [Bun](https://bun.sh) と [Node.js](https://nodejs.org)（LTS）
* Expo のアカウント（無料。PC の Expo CLI と iPhone の Expo Go で同じものを使います）
* PC と iPhone が同じネットワークにつながっていること（つながらないときは下の `--tunnel` を使います）

App Store 版の Expo Go は、最新の SDK（いまは 58）のプロジェクトしか開けず、iPhone には古い版を入れられません。Expo Go の SDK が上がったら、`bunx expo install expo@^<SDK>.0.0` と `bunx expo install --fix` でプロジェクトも上げてください。

## 動かし方

```bash
bun install
bunx expo start
```

1. PC で `bunx expo login` を実行し（ブラウザでサインインします）、iPhone の Expo Go でも同じ Expo アカウントでサインインします
2. `bunx expo start` で表示される QR コードを、iPhone のカメラで読みます。Expo Go でアプリが開きます
3. 社内ネットワークなどで iPhone からつながらないときは、`bunx expo start --tunnel` を使います
4. `bun install` が接続エラーで止まるときは、`bun install --network-concurrency 4` で同時に開く接続を減らします

## テスト

```bash
bun test
bun run test:domain
bun run typecheck
node node_modules/eslint/bin/eslint.js src tests
bun run export:ios
```

* `bun test` は、記録、たね、ショップ、おへや、ハムスターの動き、効果音、アイコンなどのテストです。小数と分数・円周率・単位・見積もりの 28 レベルの出題、ヒント、判定、ミスの種類と、コースの並び、記録の合わせ込み、新しいレベルのチェック、記録のファイル、ビルドの種類（`app.config.ts` と `eas.json`）もここで確かめます
* `bun run test:domain` は学習エンジン（ステージ0〜5）のテストです。見本 1,757 問との一致、61 レベルの問題づくり、ヒントの途中式、★の判定などの規則を確かめます。Python 3 があると、添付の Python 参照実装とも突き合わせます
* `bun run typecheck` は TypeScript の型を、ESLint の行はコードの書き方を確かめます（`bun run lint` でも同じ ESLint が動きます）
* `bun run export:ios` は、iPhone 用のバンドルが作れることを確かめます

画面の並びは、`bun run web` でブラウザに出して確かめることもできます。

## コースの並びとコンテンツの更新

コースの形（ステージの並び、レベルの ID の付け替え、外した ID、これまでに使ったすべての ID）は [src/course/course.json](src/course/course.json) が決めます。レベルの中身は [src/domain/curriculum.json](src/domain/curriculum.json) と [src/juku/juku.json](src/juku/juku.json) にあります。

| 番号 | ステージ                       | レベル数 | ステージ ID |
|------|--------------------------------|---------|------------|
| 0    | 数の感覚                       | 5       | 0          |
| 1    | たし算・ひき算の基本（20まで）  | 10      | 1          |
| 2    | 九九とわり算の基本             | 9       | 2          |
| 3    | 2桁の暗算                      | 14      | 3          |
| 4    | 3桁と大きな数                  | 12      | 4          |
| 5    | 小数と分数                     | 8       | 6          |
| 6    | 円周率の計算                   | 7       | 8          |
| 7    | 単位の換算                     | 7       | 7          |
| 8    | 受験の技                       | 11      | 5          |
| 9    | 見積もり                       | 6       | 9          |

* 記録はレベルとステージの ID で残し、画面の番号（ステージ5、レベル5-2 など）は並びの位置から毎回つくります。並びを変えても記録はずれません
* 記録を読み込むたびに、コースへ合わせ込みます（[src/state/reconcile.ts](src/state/reconcile.ts)）。付け替えた ID は新しい ID に移り、アプリの知らない ID の記録も消さずに残します
* 子どもの位置より前に新しいレベルが入ると、そのレベルは「チェック待ち」になり、きょうの れんしゅうの最初のメインで、1 日 1 ステージずつ、各レベル 5 問で確かめて始める位置を決めます
* レベルを足す・並べ替える・付け替える・外すときの手順は [AGENTS.md](AGENTS.md) の「Changing content」にあります。まちがった変更（ID を消す、使い回す、前提がうしろ、画面の文がコースにないレベルを書く）は `bun test` が止めます。配った ID は [tests/course/shipped-ids.json](tests/course/shipped-ids.json) にも写してあり、`course.json` だけを削っても止まります
* 並び順の理由と記録の扱いは、[設計](docs/superpowers/specs/2026-11-04-hamzan-one-course-design.md)にあります
* 出題のしくみ（`src/juku/generators.ts`）を変えたら、`bun run scripts/calibrate-juku.ts` で `src/juku/juku.json` の書く桁数（D）を計算し直します

## たねと値段の調整

* 練習でもらえる たねの数と、自由練習の 1 日の上限は、[src/game/economy.ts](src/game/economy.ts) の `SEEDS` にまとめてあります
* ショップの品物と値段は、[src/game/shop.ts](src/game/shop.ts) の `SHOP` にあります
* グッズを足すときは、置き場所の種類（[src/game/room.ts](src/game/room.ts) の `GOOD_KIND` と `DEFAULT_SLOT`）と絵（[src/art/items.tsx](src/art/items.tsx)）も足します

## 効果音とアイコンの作り直し

効果音（答えの `ok`、`miss`、`clear` と、ピアノの `key1` から `key5`）は、[scripts/make-sounds.ts](scripts/make-sounds.ts) が [assets/sounds](assets/sounds/) に WAV で書き出します。

```bash
bun run scripts/make-sounds.ts
```

アイコンの元の絵は [assets/icon/icon.svg](assets/icon/icon.svg)（1024 四方）です。絵を変えたら、ブラウザで SVG を開いてスクリーンショットを撮るなどして、次の PNG を書き出し直します。大きさは `bun test` が確かめます。

* `assets/images/icon.png`: 1024 四方。透明な部分を残さない（角は iOS が丸めます）
* `assets/images/splash-icon.png`: 512 四方。`#background` のグループを消して、背景を透明にする（スプラッシュの背景色 `#FFF4E2` は `app.json` にあります）
* `assets/images/favicon.png`: 48 四方

## テスト用の機能

保護者の画面の「テスト用」で、次のことができます。この欄は Expo Go、web 表示、開発ビルドで出ます。本番ビルド（`eas.json` の `production`、`APP_VARIANT=production`）では出ません。どちらにするかは [app.config.ts](app.config.ts) が決めます。

* アプリの日付を進める（復習、マスター、週 1 回のチャレンジを試せます）
* すべてのレベルを開放する、診断を短くする、診断をとばして選んだレベルから始める
* おへやに すべての グッズを置いて見る（記録は変わりません）、たねを 100 ふやす
* web では、大きな文字のときの見た目を確かめる

## 記録

記録は端末の中だけに保存し（AsyncStorage のキー `hamzan-ios-v1`、保存の形は version 3）、外部へは送信しません。保存の形を変えるときは、[src/state/migrate.ts](src/state/migrate.ts) に 1 つ前の版からの移行を足します。

保護者の画面の「データ」で、記録を 1 つのファイルに書き出し、別の端末で読み込めます。ファイルには PIN、すべてのお子さまの記録、選んでいる子が入り、テスト用の設定は入りません。読み込むと、その端末の記録はファイルの記録に置き換わります（確かめの窓が出ます）。ハムざんのものでないファイル、こわれたファイル、新しい版のアプリが書き出したファイルは読み込みません。古い版のファイルは、今の形に移してから読み込みます。

## 本番版を家族の端末に入れる

PC のサーバーなしで遊べる本番版を EAS（Expo のクラウドのビルド）で作り、お子さんの iPhone と iPad に直接入れます（内部配布）。お子さんの Apple アカウントは 13 歳未満の子ども用なので、TestFlight は使いません。

準備（一度だけ）

1. Apple Developer Program に個人で登録します（年 12,800 円。iPhone の Apple Developer アプリから登録できます）。内部配布にはこの登録が要ります
2. PC で EAS にログインします。Expo Go と同じ Expo のアカウントを使います

   ```bash
   bunx eas-cli@latest login
   ```

3. プロジェクトを EAS につなぎます。`app.json` の `expo.extra.eas.projectId` に ID が書かれます。書けなかったと出たときは、表示された ID をそこに書きます。書かれた `app.json` はコミットします

   ```bash
   bunx eas-cli@latest init
   ```

4. お子さんの iPhone と iPad を登録します。表示されるリンク（または QR コード）を各端末の Safari で開き、案内に従って設定用のプロファイルを入れます

   ```bash
   bunx eas-cli@latest device:create
   ```

ビルドして入れる

1. 本番版を作ります。初めてのときは Apple のアカウントでサインインし、証明書と配布用のプロファイルを EAS に作ってもらいます。ビルドの番号は EAS が上げます

   ```bash
   bunx eas-cli@latest build --platform ios --profile production
   ```

2. ビルドが終わると出るリンク（または QR コード）を各端末で開き、アプリを入れます
3. 初めて開く前に、端末の「設定」→「プライバシーとセキュリティ」→「デベロッパモード」をオンにします（再起動とパスコードが要ります）

記録を移す

1. Expo Go のハムざんで、保護者の画面の「データ」→「記録を書き出す」を押し、AirDrop かファイル App で保存します。iPad と iPhone の記録は別々なので、続けたいほうを書き出します（ファイル名の終わりが `ipad` か `iphone` です）。書き出したあとに Expo Go で練習した分はファイルに入らないので、読み込む直前に書き出します
2. 本番版の最初の画面で「書き出した記録を読み込む」を押し、そのファイルを選びます。同じファイルを iPhone と iPad の両方で読み込めば、どちらも同じところから始まります
3. ファイルは消さずに取っておくと、記録の控えになります

> [!IMPORTANT]
> アプリ ID（`com.mahori.hamzan`、開発ビルドは `com.mahori.hamzan.dev`）は、最初のビルドのあとは変えられません。別の ID にしたいときは、最初のビルドの前に `app.json` の `expo.ios.bundleIdentifier` を変えます。

> [!NOTE]
> 端末を足したときは、`device:create` で登録してから、もう一度ビルドします（配布用のプロファイルに端末が入るため）。開発ビルド（`--profile development`）は、iCloud 同期の作業で expo-dev-client を入れてから使います。

## フォルダの中身

| 場所              | 内容                                                                   |
|-------------------|------------------------------------------------------------------------|
| src/app/          | 画面と画面のつながり（Expo Router）                                    |
| src/features/     | 画面ごとの部品（ちず、出題、結果、おへや、ショップ、保護者の画面、初回の設定） |
| src/art/          | ハムスター、グッズ、おへやの絵（SVG）                                  |
| src/domain/       | 学習エンジン（整数の暗算の 6 ステージ。画面なし、外部ライブラリなし）。仕様は curriculum.json |
| src/juku/         | 小数と分数・円周率・単位・見積もりの学習エンジン（画面なし）。仕様は juku.json |
| src/course/       | コース（course.json：並び、ID の付け替え）と、2 つのエンジンをまとめて扱う層（進み方、チェック、診断、きょうの れんしゅう） |
| src/game/         | たね、ショップ、ごほうび、おへやの置き場所、ハムスターの動きの決め方   |
| src/session/      | 練習の組み立てと、セットからセットへの進め方                           |
| src/state/        | 記録と設定（zustand）。端末への保存をつなぐのは store.ts だけ          |
| src/platform/     | 効果音と振動、読み上げ、保存、時計、記録のファイルの受け渡しなど、端末とのやりとり |
| src/ui/           | ボタンやシートなどの共通部品、色、文字                                 |
| src/i18n/ja.ts    | 子ども向けのレベル名など                                               |
| tests/            | `bun test` のテスト。tests/domain は学習エンジンのテストと参照ファイル |
| scripts/          | 効果音を作るスクリプト、juku.json の D を計算し直すスクリプト           |
| assets/           | アイコンの元の絵（icon）、画像（images）、効果音（sounds）            |
| docs/superpowers/ | 設計と実装計画                                                         |
| app.json          | アプリの設定。ビルドの種類（本番と開発）は app.config.ts が決める      |
| eas.json          | EAS Build の設定（本番と開発のビルド、内部配布）                       |