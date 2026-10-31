---
title: Agent guide for hamzan
description: Rules for AI coding agents working on the hamzan Expo app
---

## Project

ハムざん is a mental-arithmetic training app for children. It is built with Expo SDK 54 and Expo Router and runs on iPhone through Expo Go. The learning engine in `src/domain/` comes from a tested web prototype (git tag `web-prototype`). Read `docs/superpowers/specs/` for the design and `docs/superpowers/plans/` for the implementation plans.

## Expo has changed: do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing code that touches an Expo, EAS, or React Native API:

1. Confirm the major version of `expo` in `package.json` (54).
2. Fetch <https://docs.expo.dev/llms.txt> and follow its links to the page you need; never answer from memory.

## SDK 54 is pinned

* The App Store build of Expo Go stops at SDK 54. Never upgrade `expo` past `~54.0`.
* Install packages with native code through `bunx expo install <package>` so versions match SDK 54.
* Use only native modules bundled in Expo Go (`node_modules/expo/bundledNativeModules.json`). No custom native code and no config plugins that need a prebuild.

## Commands

```bash
bun install --network-concurrency 4
bunx expo start
bun run typecheck
bun run lint
bun test
bun run test:domain
bun run export:ios
```

Run typecheck, lint, `bun test`, and the domain tests before declaring any task done.

## Rules

* Routes live in `src/app/`; every file there is a screen and `_layout.tsx` files define navigators. Keep components, hooks, and logic outside `src/app/`.
* Do not edit `src/domain/` or `src/domain/curriculum.json`. The domain tests (`bun run test:domain`) must stay green.
* Keep the logic `bun test` loads free of `react-native` and Expo imports: `src/game`, `src/session/requests.ts`, `src/platform/active-clock.ts`, `src/ui/font-scale.ts`, `src/features/room/stage-rules.ts`, and every module in `src/state` except `store.ts`. `src/state/store.ts` is the one state module that reaches the device: it hands AsyncStorage (through `src/platform/storage.ts`) to the store built in `create-store.ts`, and tests build that store with their own storage.
* Child-facing copy is hiragana-centred Japanese.
* Records stay on the device (AsyncStorage key `hamzan-ios-v1`).
