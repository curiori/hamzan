# ハムざん — 中学受験向け 暗算トレーニング（ソースコード）

App Builder で作った Web アプリ（React + TypeScript + Vite + Tailwind CSS）のソースコードです。
2026年10月28日時点の版で、まだ公開していません。

記録はブラウザの localStorage（キー `hamzan-anzan-v2`）だけに保存し、外部へは送信しません。

## フォルダの中身

| 場所 | 内容 |
|---|---|
| `src/domain/` | 学習エンジン（画面なし・外部ライブラリなし） |
| `src/domain/curriculum.json` | 仕様（6ステージ・61レベル）。ルールの数値はすべてここから読みます |
| `src/domain/generators.ts` / `scaffolds.ts` | 61レベルの問題づくり／ヒントの途中の数とメモ |
| `src/domain/` のほかのファイル | ★の判定、モードとレベルの進み方、復習、セットの作り方、1日のセッション、診断、ミスの分類、時間の目安 |
| `src/features/` | 画面：問題（`play.tsx`）、結果、ホームとおへや、はじめの設定と診断、保護者画面、ヒントの図、効果音 |
| `src/pages/home.tsx` | 画面の切り替えと、1日のセッションの進行 |
| `src/lib/store.ts` | 記録の保存と更新 |
| `src/lib/rewards.ts` | ハムスターのごほうび（学習の節目で届く） |
| `src/i18n/ja.ts` | 子ども向けのひらがなのレベル名など |
| `src/components/hamster-art.tsx` | ハムスターとおへやの絵（SVG） |
| `tests/domain/` | 学習エンジンのテスト |
| `tests/domain/reference/` | テストで使う参照ファイル（いただいた仕様一式のうち、仕様・参照実装・見本） |

## 動かし方

[Bun](https://bun.sh) を使います。

```
bun install
bun run dev      # 開発用サーバー
bun run build    # 本番用ビルド（dist/ に出力）
bun run check    # 型チェック・ビルド確認・lint
```

App Builder のテンプレートをもとにしているため、package.json には App Builder 用のパッケージも入っています。
手元の環境でそれらをインストールできない場合でも、`src/domain/` は外部ライブラリを使っていないので、
そのまま別のプロジェクト（たとえば仕様書の Expo アプリ）に移せます。

## テスト

プロジェクトのフォルダで実行します。Python 3 があると、添付の Python 参照実装とも突き合わせます。

```
bun run tests/domain/golden.ts      # 見本の1,757問と、答え・途中の数・メモが一致するか
bun run tests/domain/generators.ts  # 61レベルの範囲・除外・比率・答え
bun run tests/domain/scaffolds.ts   # ヒントの途中式が正しいか
bun run tests/domain/rules.ts       # ★の判定・進み方・復習・診断など（71件）
```

## 試すときの便利機能

「おうちの かたへ」→ PIN →「テスト用」タブで、次のことができます。

- 日付を1日・7日進める（マスター・復習・チャレンジの確認用）
- すべてのレベルを開放する
- 診断を短くする
- 診断をとばして、選んだレベルから始める
