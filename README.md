---
title: ハムざん
description: 中学受験向けの暗算トレーニングアプリ（Expo 版。iPhone の Expo Go で動かす）
---

## ハムざんについて

中学受験向けの暗算トレーニングアプリです。Web 版のプロトタイプ（タグ `web-prototype`）を、iPhone の Expo Go で動く Expo アプリへ作り替えています。設計は [docs/superpowers/specs](docs/superpowers/specs/)、実装計画は [docs/superpowers/plans](docs/superpowers/plans/) にあります。

記録は端末の中だけに保存し（AsyncStorage のキー `hamzan-ios-v1`）、外部へは送信しません。

## 動かし方

[Bun](https://bun.sh) と、iPhone の [Expo Go](https://expo.dev/go)（App Store 版。SDK 54 に対応）を使います。

```bash
bun install --network-concurrency 4
bunx expo start
```

1. PC で `bunx expo login` を実行し、iPhone の Expo Go でも同じ Expo アカウントでサインインする
2. `bunx expo start` で表示される QR コードを、iPhone のカメラで読む
3. 同じ Wi-Fi でつながらないときは `bunx expo start --tunnel` を使う

App Store 版の Expo Go は SDK 54 までなので、`expo` の版は上げないでください。

## テスト

```bash
bun run typecheck
bun run lint
bun test
bun run test:domain
```

`test:domain` は学習エンジンのテストです。見本 1,757 問との一致、61 レベルの問題づくり、ヒントの途中式、★の判定などの規則を確かめます。Python 3 があると、添付の Python 参照実装とも突き合わせます。

## フォルダの中身

| 場所              | 内容                                                         |
|-------------------|--------------------------------------------------------------|
| src/app/          | 画面（Expo Router）                                          |
| src/domain/       | 学習エンジン（画面なし、外部ライブラリなし）。仕様は curriculum.json |
| src/game/         | ごほうび（ショップとおへやも追加予定）                       |
| src/i18n/ja.ts    | 子ども向けのレベル名など                                     |
| tests/domain/     | 学習エンジンのテストと参照ファイル                           |
| docs/superpowers/ | 設計と実装計画                                               |