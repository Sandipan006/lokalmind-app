# Decisions

One entry per choice, with the reason. Newest at the bottom.

1. **tsc fix via `paths`, not by editing `node_modules`.** `expo-file-system/legacy` ships raw `.ts` that breaks under `exactOptionalPropertyTypes`. `tsconfig.json` points that import at the compiled `build/legacy/index`. Keeps strict mode on.
2. **Jest 29 + `jest-expo` 54.** Matches Expo SDK 54. Jest 30 is not yet the supported pairing for this preset.
3. **`test.failing` for known bugs.** CI stays green while the bug exists, and the test flips red the moment a fix lands, so nobody forgets to update it.
4. **Production build is gated by a `checks` job**, not by a separate workflow, so the gate and the build live in one file and cannot drift.
5. **`npm ci` everywhere in CI.** Installs exactly what `package-lock.json` says. Verified with `npm ci --dry-run`.
6. **EAS CLI pinned to 26.0.0** (latest on npm today). `eas.json` still allows `>= 16`. Bump on purpose, not by accident.
7. **Logger = one `logger.debug` function.** The code already used `if (__DEV__) console.log(...)` everywhere. One helper does that check, so the 50 calls became one-liners. No log levels or sinks yet (YAGNI); add them if crash reporting is chosen.
8. **ESLint plugin registered by the owner** (config-protection hook blocks agent edits to `eslint.config.js`). The block is scoped to `**/*.ts, **/*.tsx` so plain `.js` files do not need the TS parser. Lint errors fixed in source (unused imports, `any` casts, type-only imports), not by loosening rules.
9. **2.6: `maxTokens` read from `env.models.chatMaxTokens` inside `SendMessageUseCase` and `RegenerateReplyUseCase`.** Default is 512 (`CHAT_MAX_TOKENS`). Domain code importing `env` is a small layering shortcut; the alternative (inject through the constructor) touches every caller. Revisit in 5.x if more config is needed there. Title (18), profile (150) and summary (80) calls already set their own limits.
10. **5.1 removed 4 packages, kept 5 "unused-looking" ones.** Removed `react-native-purchases`, `expo-av`, `expo-background-task` (plus its `app.json` plugin), `expo-web-browser`: zero imports, zero config. Kept `@react-navigation/bottom-tabs`, `@react-navigation/elements` (required by `expo-router`), `react-native-bottom-tabs` (peer of `@bottom-tabs/react-navigation`), `expo-linking` (required by `expo-router`), `react-native-web`/`react-dom` (needed by `expo start --web` and the Expo toolchain). Removing native modules means the next release needs a fresh native build, not an OTA update.
11. **5.9 deleted the two placeholder screens** instead of hiding links, because nothing linked to them and they were still reachable by deep link. Git history keeps them for G.7/G.8.
12. **5.5 `reset-project` script removed**, not recreated: the target file never existed and `scripts/clearLocalData.ts` already covers local resets.
13. **Code of Conduct = pointer to Contributor Covenant 2.1** plus a short summary, not a pasted copy. Same effect, no 130-line file to maintain.
14. **Model licenses written from memory and flagged as unchecked.** I could not verify the model cards offline. The doc says so and tells the maintainer to check before each release.
15. **Skipped for now (need a different kind of work):** 5.3 (touches the embedding code that 2.9 may delete), 5.4 (needs the 3.5 tests first), 5.7 and 5.8 (device and UX audit), 6.4 (your call), 6.5 and 6.6 (device work, moved to v1.1), 6.8 (final re-review).
