---
title: ハムざん
description: 中学受験向けの暗算トレーニングアプリ（Expo 版。iPhone の Expo Go で動かす）
---

## ハムざんについて

中学受験向けの暗算トレーニングアプリです。61 のレベルを「ちず」でたどり、ヒント・メモ・スピードの 3 つのモードで練習します。毎日の「きょうの れんしゅう」では、ウォームアップのあとに、いま取り組んでいるレベル、ステージのまとめのチェック、復習を組み合わせて出題します。

練習すると、ひまわりの たねが たまります。たねは「ショップ」で、おへやの グッズ、きせかえ、かべがみ・ゆか、おやつと交換できます。「おへや」では、ハムスターが歩き回り、グッズで遊び、夜はベッドやおうちで眠ります。★2 やマスターなどの節目には、ごほうびの グッズも届きます。

保護者の画面（PIN で守られています）では、練習の記録、設定、プロフィール、データの消去を扱います。VoiceOver と大きな文字にも対応しています。

Web 版のプロトタイプ（タグ `web-prototype`）を、iPhone の Expo Go で動く Expo アプリへ作り替えたものです。設計は [docs/superpowers/specs](docs/superpowers/specs/)、実装計画は [docs/superpowers/plans](docs/superpowers/plans/) にあります。

## 必要なもの

* iPhone と、App Store 版の [Expo Go](https://expo.dev/go)（SDK 54 に対応）
* PC に [Bun](https://bun.sh) と [Node.js](https://nodejs.org)（LTS）
* PC と iPhone が同じネットワークにつながっていること（つながらないときは下の `--tunnel` を使います）

App Store 版の Expo Go は SDK 54 までなので、`expo` の版は上げないでください。

## 動かし方

```bash
bun install
bunx expo start
```

1. `bunx expo start` で表示される QR コードを、iPhone のカメラで読みます。Expo Go でアプリが開きます
2. 社内ネットワークなどで iPhone からつながらないときは、`bunx expo start --tunnel` を使います
3. `bun install` が接続エラーで止まるときは、`bun install --network-concurrency 4` で同時に開く接続を減らします

PC で `bunx expo login` を実行し、iPhone の Expo Go でも同じ Expo アカウントでサインインしておくと、Expo Go の画面から開き直せます。

## テスト

```bash
bun test
bun run test:domain
bun run typecheck
node node_modules/eslint/bin/eslint.js src tests
bun run export:ios
```

* `bun test` は、記録、たね、ショップ、おへや、ハムスターの動き、効果音、アイコンなどのテストです
* `bun run test:domain` は学習エンジンのテストです。見本 1,757 問との一致、61 レベルの問題づくり、ヒントの途中式、★の判定などの規則を確かめます。Python 3 があると、添付の Python 参照実装とも突き合わせます
* `bun run typecheck` は TypeScript の型を、ESLint の行はコードの書き方を確かめます（`bun run lint` でも同じ ESLint が動きます）
* `bun run export:ios` は、iPhone 用のバンドルが作れることを確かめます

画面の並びは、`bun run web` でブラウザに出して確かめることもできます。

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

保護者の画面の「テスト用」で、次のことができます。この欄は `app.json` の `expo.extra.enableTestTools` が `true` のときだけ出ます。配布するときは `false` にしてください。

* アプリの日付を進める（復習、マスター、週 1 回のチャレンジを試せます）
* すべてのレベルを開放する、診断を短くする、診断をとばして選んだレベルから始める
* おへやに すべての グッズを置いて見る（記録は変わりません）、たねを 100 ふやす
* web では、大きな文字のときの見た目を確かめる

## 記録

記録は端末の中だけに保存し（AsyncStorage のキー `hamzan-ios-v1`）、外部へは送信しません。Expo Go で練習した記録は Expo Go の中にあるため、あとで App Store で配るアプリを作っても、そちらへは移りません。

## フォルダの中身

| 場所              | 内容                                                                   |
|-------------------|------------------------------------------------------------------------|
| src/app/          | 画面と画面のつながり（Expo Router）                                    |
| src/features/     | 画面ごとの部品（ちず、出題、結果、おへや、ショップ、保護者の画面、初回の設定） |
| src/art/          | ハムスター、グッズ、おへやの絵（SVG）                                  |
| src/domain/       | 学習エンジン（画面なし、外部ライブラリなし）。仕様は curriculum.json   |
| src/game/         | たね、ショップ、ごほうび、おへやの置き場所、ハムスターの動きの決め方   |
| src/session/      | 練習の組み立てと、セットからセットへの進め方                           |
| src/state/        | 記録と設定（zustand）。端末への保存をつなぐのは store.ts だけ          |
| src/platform/     | 効果音と振動、読み上げ、保存、時計など、端末とのやりとり              |
| src/ui/           | ボタンやシートなどの共通部品、色、文字                                 |
| src/i18n/ja.ts    | 子ども向けのレベル名など                                               |
| tests/            | `bun test` のテスト。tests/domain は学習エンジンのテストと参照ファイル |
| scripts/          | 効果音を作るスクリプト                                                 |
| assets/           | アイコンの元の絵（icon）、画像（images）、効果音（sounds）            |
| docs/superpowers/ | 設計と実装計画                                                         |