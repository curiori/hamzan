---
title: Agent guide for hamzan
description: Rules for AI coding agents working on the hamzan Expo app
---

## Project

ハムざん is a mental-arithmetic training app for children. It is built with Expo SDK 58 and Expo Router and runs on iPhone through Expo Go. The learning engine for stages 0–5 in `src/domain/` comes from a tested web prototype (git tag `web-prototype`). Stages 6–9 (塾の単元: decimals and fractions, units, pi, estimation) live in `src/juku/`, and `src/course/` joins both into one course of 89 levels for the screens and the records. Read `docs/superpowers/specs/` for the design and `docs/superpowers/plans/` for the implementation plans.

## Expo has changed: do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing code that touches an Expo, EAS, or React Native API:

1. Confirm the major version of `expo` in `package.json` (58).
2. Fetch <https://docs.expo.dev/llms.txt> and follow its links to the page you need; never answer from memory.

## The SDK follows the App Store Expo Go

* The App Store build of Expo Go opens only projects on its own SDK, and an iPhone cannot install an older Expo Go. Since November 2026 that SDK is 58, so keep `expo` on `~58.0`. When Expo Go moves to a newer SDK, upgrade the project with `bunx expo install expo@^<sdk>.0.0` and `bunx expo install --fix`.
* Install packages with native code through `bunx expo install <package>` so versions match SDK 58.
* When `bunx expo install --fix` asks for a version the package registry does not have yet (a registry mirror can lag npm by days), run it as `EXPO_OFFLINE=1 bunx expo install --fix` to use the versions bundled with the installed `expo`.
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
* Import navigation APIs from `expo-router` or `expo-router/react-navigation`, never from `@react-navigation/*`.
* Do not edit `src/domain/` or `src/domain/curriculum.json`. The domain tests (`bun run test:domain`) must stay green.
* Stage 6–9 rules live in `src/juku/juku.json` (the same shape as `curriculum.json`, plus `R`, `units` and two mistake types). Screens and records reach levels, problems, sets, targets and mistakes through `src/course/`, never through only one of the two engines. After changing a generator in `src/juku/generators.ts`, run `bun run scripts/calibrate-juku.ts` to recompute `D` in `juku.json`; `bun test` fails when it drifts.
* Keep every module a test in `tests/` imports free of `react-native` and Expo imports. Today these are `src/domain`, `src/juku`, `src/course`, `src/game`, `src/i18n/ja.ts`, `src/session/requests.ts`, `src/platform/active-clock.ts`, `src/ui/font-scale.ts`, the pure helpers in `src/features` (`play/field-set.ts`, `play/hint-flow.ts`, `play/juku-fields.ts`, `play/juku-hint-flow.ts`, `play/play-queue.ts`, `onboarding/gate.ts`, `onboarding/input-test-flow.ts`, `onboarding/pin-entry.ts`, `parent/dashboard-data.ts`, `parent/juku-data.ts`, `result/result-text.ts`, `room/stage-rules.ts`), and every module in `src/state` except `store.ts`. `src/state/store.ts` is the one state module that reaches the device: it hands AsyncStorage (through `src/platform/storage.ts`) to the store built in `create-store.ts`, and tests build that store with their own storage.
* Child-facing copy is hiragana-centred Japanese.
* Records stay on the device (AsyncStorage key `hamzan-ios-v1`).
