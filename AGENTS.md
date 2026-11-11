---
title: Agent guide for hamzan
description: Rules for AI coding agents working on the hamzan Expo app
---

## Project

ハムざん is a mental-arithmetic training app for children. It is built with Expo SDK 58 and Expo Router. The family plays it on iPhone and iPad through Expo Go; `eas.json` and `app.config.ts` also build an internal (ad hoc) production version for the family's devices once the owner has an Apple Developer account (README, 「本番版を家族の端末に入れる」). The learning engine in `src/domain/` (`curriculum.json`, stage ids 0–5) comes from a tested web prototype (git tag `web-prototype`). The decimal, pi, unit and estimation stages (stage ids 6–9) have their own engine in `src/juku/` (`juku.json`). `src/course/` joins both into one course of 10 stages and 89 levels; `src/course/course.json` gives its order. Read `docs/superpowers/specs/` for the design and `docs/superpowers/plans/` for the implementation plans.

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
APP_VARIANT=production bunx expo config --type public
bun run scripts/clear-lockfile-urls.ts
bash scripts/setup-mac.sh
```

Run typecheck, lint, `bun test`, and the domain tests before declaring any task done. The production config command prints the app config a production build gets (in PowerShell, set `$env:APP_VARIANT = "production"` first). The last two keep `bun.lock` free of registry URLs and set up a fresh clone on a Mac.

## Rules

* Routes live in `src/app/`; every file there is a screen and `_layout.tsx` files define navigators. Keep components, hooks, and logic outside `src/app/`.
* Import navigation APIs from `expo-router` or `expo-router/react-navigation`, never from `@react-navigation/*`.
* Do not edit `src/domain/` or `src/domain/curriculum.json`. The domain tests (`bun run test:domain`) must stay green.
* The rules of the decimal, pi, unit and estimation stages live in `src/juku/juku.json` (the same shape as `curriculum.json`, plus `R` and two mistake types). Screens and records reach levels, problems, sets, targets, progress, plans and the diagnosis through `src/course/`, never through only one of the two engines. After changing a generator in `src/juku/generators.ts`, run `bun run scripts/calibrate-juku.ts` to recompute `D` in `juku.json`; `bun test` fails when it drifts.
* Level and stage ids are keys, never numbers to show. The number on screen comes from `levelLabel(id)` and `stageNo(id)` (the position in the course), names from `levelName(id)` and `stageName(id)`, and texts that mention levels go through `displayText()`. Never split an id to get a number.
* Keep every module a test in `tests/` imports free of `react-native` and Expo imports. Today these are `src/domain`, `src/juku`, `src/course`, `src/game`, `src/i18n/ja.ts`, `src/session/requests.ts`, `src/platform/active-clock.ts`, `src/ui/font-scale.ts`, the pure helpers in `src/features` (`play/field-set.ts`, `play/hint-flow.ts`, `play/juku-fields.ts`, `play/juku-hint-flow.ts`, `play/play-queue.ts`, `onboarding/gate.ts`, `onboarding/input-test-flow.ts`, `onboarding/pin-entry.ts`, `parent/dashboard-data.ts`, `parent/records-text.ts`, `result/result-text.ts`, `room/stage-rules.ts`), and every module in `src/state` except `store.ts`. `src/state/store.ts` is the one state module that reaches the device: it hands AsyncStorage (through `src/platform/storage.ts`) to the store built in `create-store.ts`, and tests build that store with their own storage.
* Child-facing copy is hiragana-centred Japanese.
* Records stay on the device (AsyncStorage key `hamzan-ios-v1`, persist version `SAVE_VERSION` = 3 in `src/state/migrate.ts`). Every load runs `reconcileProfile()` (`src/state/reconcile.ts`) on each profile; it never deletes a record, and screens and plans pass over ids the course does not have.
* The parent moves records between devices with a file (`src/state/backup.ts`: `backupText`, `readBackup`). The file holds the PIN, every profile and the active child, never the test settings. Reading refuses other files, damaged files and newer save versions, migrates older ones and reconciles every profile. A file replaces the records only through `replaceRecords` after the parent confirms. Only `src/platform/records-file.ts` touches expo-file-system, expo-sharing and expo-document-picker.
* Build variants come from `APP_VARIANT` in `app.config.ts`, which the `eas.json` profiles set: `production` has no test tools, `development` sits beside it as `app.curiori.hamzan.dev`, and without a variant (Expo Go, the web preview, `expo export`) the app is set up as `app.json` says, with the test tools. Never put `enableTestTools` in `app.json`, and never change `ios.bundleIdentifier` (`app.curiori.hamzan`) once the first EAS build exists.
* Do not install `expo-dev-client` before the release design's stage ② (iCloud sync) needs a development build; the family's devices run the app through Expo Go until then.
* `bun.lock` names no registry: the second field of every package is `""`, so each machine installs the same versions from its own registry (npm on a Mac, Expo's npm cache on its build servers, the private registry on a PC whose `.npmrc` sets one), and the public repository shows no private registry. Bun writes that registry's URL into every package whenever it rewrites the lockfile there (`bun add`, `bunx expo install`), so run `bun run scripts/clear-lockfile-urls.ts` before committing; `bun test` fails while a URL is left. A fresh clone on a Mac is set up with `bash scripts/setup-mac.sh`.

## Changing content

Content ships inside the app, so children who update keep their records. Keep it that way:

* Add a level: put it in its spec and in a stage (`course.json` `stages[].levels`, or the spec stage's `levelIds`), add its id to `levelIdsEverUsed` and to `tests/course/shipped-ids.json`, give it a child's name in `src/i18n/ja.ts`, and add its generator. A level that lands before where a child already is waits for a 5-problem check after the update.
* Reorder: change `course.json` only. Prerequisites must stay earlier; `validateCourse()` checks it. Unpractised levels moved before a child are checked like new ones.
* Rename a level of `juku.json`: change the id everywhere it is a key (the level, its stage's `levelIds` and `stageCheck.levels`, other levels' `prerequisites`, `{id}` in texts, `KID_LEVEL_NAME` in `src/i18n/ja.ts`, and the maps in `src/juku/generators.ts`), add `"old": "new"` to `renamedLevels`, and add the new id to `levelIdsEverUsed` and `tests/course/shipped-ids.json`. Records move on the next load, and an `{old}` left in a text still shows the right number.
* Retire a level: take it out of its stage, of `stageCheck.levels`, of other levels' `prerequisites` and of texts that name it, and add its id to `retiredLevels` and `tests/course/shipped-ids.json`. Records stay and rewards keep counting it.
* Levels of `curriculum.json` keep their ids, since the file does not change. Retire one only through `stages[].levels` in `course.json`, and only when nothing in `curriculum.json` (stage checks, prerequisites, texts) names it; the tests stop you otherwise.
* Stages: use a new number for a new stage and add it to `stageIdsEverUsed` and `tests/course/shipped-ids.json`; retire a stage with `retiredStages`. Never reuse an id.
* Bump `version` in `course.json` with every change to it.
* Texts that name levels (level examples, mistake remedies) write `{id}` and are shown through `displayText()`. Add a new kind of such text to the list in the "every level a shown text names" test.
* Change what is saved: raise `SAVE_VERSION` in `src/state/migrate.ts` (the store and the records file both use it), add a step from the previous version to `migrate()`, and test it with a saved record of the previous version. `migrate()` must keep accepting every older version, so records files written by older apps still read.
* `bun test` (`tests/course/content.test.ts`) fails when an id disappears without being renamed or retired, when a retired id comes back, when a new id is not recorded, when `course.json` drops or changes anything `tests/course/shipped-ids.json` has, or when a shown text names a level the course does not show. Never remove anything from the id lists of `course.json` or from `tests/course/shipped-ids.json`.
