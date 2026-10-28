# LokalMind Review Fix List

Goal: raise the review score from 6.6 to 8-9.
Sources: `LokalMind Repository Review.md` (RR) and `LokalMind_Detailed_Review.md` (DR, findings F01-F13, cases C01-C05).
Work one item at a time, in order. Tick the box when done and verified.

## Rules for this list

- **Tick only after verification.** A task is done when its check passes (test, lint, typecheck, device run), not when the code is written. Scores in the reviews are goals, not predictions: re-score only after implementation and device testing.
- **Known-failing tests.** Bug tests written in 1.4 use `test.failing`, so CI stays green. When Phase 2 fixes a bug, switch that test to a normal `test`.
- **Regression reruns.** When a later stage (upgrades, redesign, Android) touches something already fixed, rerun its tests and checks before marking that stage complete.
- **Migration safety.** Existing chats, profile, settings and downloaded models must survive every change. See 3.6 and H.10.
- **Two releases.** v1.0.1 = Section A without 6.5-6.7 (bug-fix release). v1.1 = Sections B-G plus the website (I). See Section H.
- **One main checkbox per topic.** Voice = G.1. Storage and model-detail screens = G.7 and G.8. Device benchmarks = A 6.5. Other items only reference them.

## Phase 1 - Foundation (safety net first)

- [x] **1.1 Repair typecheck.** `tsc --noEmit` fails inside `node_modules/expo-file-system/src/legacy`. (RR DX)
  - Done on branch `fix/review-findings`: `tsconfig.json` paths map to `build/legacy/index`. Verified: `tsc --noEmit` exits 0. Needs commit.
- [x] **1.2 Repair ESLint (0 errors, 5 warnings left; warnings are real code issues, handled in Phase 5).** `npm run lint` crashes: `@typescript-eslint` plugin not registered. (RR DX)
  - Register the plugin in `eslint.config.js`; `@typescript-eslint/eslint-plugin` already added to devDependencies.
  - Then fix any real lint errors and the 76 `console.*` warnings or gate them (see 1.7, the logger, which is done right after this).
- [x] **1.3 Add test harness.** Install `jest-expo`, add `npm test` script. (RR #3, DR F12)
- [x] **1.4 Write tests for reproduced bugs C01-C05** before fixing them. Mark each with `test.failing` (known failure, CI stays green); switch to a normal `test` when its Phase 2 fix lands:
  - [x] C01 context builder returns 10,001 tokens vs 3,800 budget (F02)
  - [x] C02 older summary kept, newer dropped (F03)
  - [x] C03 `extractNameFromText("I am tired")` returns "Tired" (F01)
  - [x] C04 drafting request stored as user fact (F01)
  - [x] C05 duplicated `User-stated facts:` prefix (F01)
- [ ] **1.5 Add PR CI workflow** (written, verify on first PR; lint step waits on 1.2) `.github/workflows/ci.yml`: `npm ci`, `tsc --noEmit`, `npm run lint`, `npm test` on every PR to `main`. (RR #3, DR F12)
- [ ] **1.6 Gate production (written: `checks` job, `npm ci`, EAS 26.0.0; verify on first prod run) workflow** on CI passing; use `npm ci` not `npm install`; pin EAS CLI version. (RR #3, DR Project health)
- [x] **1.7 Logger (moved here from 5.2).** Small logger silent in production; replace the 76 `console.*` calls. The ESLint rule is already `warn` for `no-console` (allows `warn` and `error`); do this right after 1.2 so CI is not noisy. (RR #6)

## Phase 2 - Memory and context correctness (P1/P2 bugs)

- [ ] **2.1 Context budget (F02, P1). Do after 2.6** (it needs the reserved output size that 2.6 sets); flip the C01 test to a normal test. `tokenBudget.ts`: take active model `n_ctx` and reserved output as inputs; remove the unconditional 4-turn history floor when it breaks the hard limit; apply budget to every section.
- [ ] **2.2 Summary order (F03, P2).** Keep newest summaries when budget is short; restore chronological order after selection.
- [ ] **2.3 Profile extraction (F01, P1).** Require explicit identity evidence for names ("my name is"); ignore commands, drafting requests, quoted or fictional text; no repeated prefix; explicit corrections replace old facts. Ideally structured fact records rendered into the profile.
- [ ] **2.4 Short replies (F04, P1).** Remove the `sure/ok/fine/no` -> "Got it." shortcut in `SendMessageUseCase`, or make it context-aware.
- [ ] **2.5 Long input (F05, P1).** Stop silent 900+900 char middle-cut; budget by tokens or tell the user input was shortened.
- [x] **2.6 Output limit (do first in Phase 2, before 2.1).** Pass `maxTokens` from `env.models.chatMaxTokens`; send path currently leaves `n_predict` at -1. (DR Performance)
- [ ] **2.7 Memory routing multilingual.** Heuristics are English-only; add tests with Bengali, Hindi, English, mixed. (DR AI quality)
- [ ] **2.8 Memory retrieval benchmark.** Small fixed prompt set with expected recalled facts, to prove the differentiator. (RR Innovation) Use it to make the 2.9 decision; run it before and after any change.
- [ ] **2.9 Local vector memory is not working: fix it or remove it (decision first, before 2.7 and 2.8).** Reported by the owner. What exists: `EmbeddingService` (MiniLM GGUF through `llama.rn`), vectors stored as JSON text in `session_memories.embedding`, brute-force cosine in `MemoryService` (up to 10 memories, so no real vector DB is needed), score-based fallback when embeddings are unavailable.
  - [ ] **2.9a Reproduce and diagnose** on a device with `__DEV__` logs. Suspects found while reading the code (all unverified):
    - Embeddings are released when the app goes to background (`releaseAllLlamaContextsIfReady` calls `embeddingService.release()`), but nothing re-initialises them afterwards: `initializeContainer()` returns early once initialised, and `ResolveInitialRouteUseCase` runs only at splash. After the first background the app may stay on score-based retrieval until restart.
    - Memories saved while `isReady()` is false get `embedding = null` and are never backfilled. Once embeddings work, those memories score semantic 0 and are dropped by the 0.3 confidence filter, so they are never retrieved.
    - The MiniLM model is downloaded silently alongside the first LLM; if that fails or is cancelled there is no retry or visible status. Also skipped when under 200 MB free RAM.
    - Embedding call details unchecked: pooling type for the embedding context, vector normalisation, and `text.slice(0, 1800)`.
    - Retrieval only runs when `requiresMemory()` matches English self-reference patterns, so many prompts never reach the vector step at all (see A 2.7).
    - The deterministic cross-session summary stores raw user sentences, which may embed poorly.
  - [ ] **2.9b Decide** with the 2.8 benchmark and the findings: **Fix** if semantic retrieval beats score-based on the benchmark; **Remove** if not, or if it costs too much RAM/battery/download size for the gain.
  - [ ] **2.9c If fixing:** lazy re-initialise inside `embed()`/`isReady()` path (and after foreground), backfill missing embeddings for old memories, retry/status for the MiniLM download, fix pooling/normalisation, unit tests for cosine ranking and the fallback, device test.
  - [ ] **2.9d If removing:** delete `EmbeddingService`, `IEmbeddingService`, the container wiring, `setLlmBusy` calls in `ChatViewModel`, the silent MiniLM download in `ModelRepositoryImpl`, its entry in `deleteDownloadedModelFiles`/`EMBEDDING_CONFIG`, and the `embedding` handling in `MemoryService`; keep the column (or migrate it away safely, see 3.6); delete the MiniLM file from users' devices on upgrade; use score/recency/keyword retrieval; update `docs/architecture/*`, README and `KNOWN-LIMITATIONS.md`. Also drops the "semantic memory" claim from store text and the website (F.12, I.8), so update those too.
  - Either way: existing users' memories must survive (3.6), and the README/store wording must match what ships.

## Phase 3 - Reliability and lifecycle

- [ ] **3.1 Save failures (F09, P1).** Check the `updateMessageContent` Result in `SendMessageUseCase` and `RegenerateReplyUseCase`; no success state or notification if save fails; allow retry.
- [ ] **3.2 Inference ownership (F10, P1).** Replace `completionEnd` promise with a real mutex/queue covering load, generate, stop, switch, release. Recheck requested model after waiting. Dispose late init after the 60 s timeout. Test pre-aborted signals and concurrent title/summary/user jobs. **Stop must interrupt active generation immediately, even when other inference tasks are queued**; queued tasks are cancelled or skipped, never waited on.
- [ ] **3.3 Unify turn handling and split `ChatViewModel` (merged with the ViewModel part of 5.4).** Send, edit, regenerate repeat orchestration with different busy-state handling; extract one turn coordinator and split `ChatViewModel` (616 lines) in the same pass so it is refactored once. Write the 3.5 tests first, then refactor under their protection. (DR Code quality)
- [ ] **3.4 OTA safe point (F08, P1).** `useOtaUpdates`: fetch, but reload only when not typing, generating, or downloading; dedupe overlapping checks.
- [ ] **3.5 Unit tests for 3.1-3.4** plus `SendMessageUseCase`, `SummarizeSessionUseCase`, `ChatViewModel`, `downloadService`, mocked at port interfaces. (RR #3)
- [ ] **3.6 Upgrade and migration check.** Install the current App Store build (v1.0), create chats, memories, pinned facts, profile, mode prompts, settings and a downloaded model, then upgrade to the new build and verify nothing is lost or corrupted. Repeat with a fresh install. Schema changes are inline `ALTER TABLE` checks per repository today; make them idempotent and consider a `PRAGMA user_version` table plus a DB backup before migrating.

## Phase 4 - Security and downloads

- [ ] **4.1 Download integrity (F07, P1).** Add `sha256` per model in metadata; download to temp path; verify HTTP status, byte length, digest; atomically move into `models/`; only then mark DB row downloaded; delete and offer re-download on mismatch. Same for MiniLM.
- [ ] **4.2 Download tests:** wrong digest, truncated file, non-success response, pause/resume, cancel.
- [ ] **4.3 Local threat model decision.** SQLite is unencrypted. Decide and document: encryption, app lock, backup behavior, notification previews. (DR Security)
- [ ] **4.4 Privacy wording.** README says "no API calls" but downloads and OTA use the network; align README and `PRIVACY.html` to "chat inference is on device". (DR Docs)

## Phase 5 - Code quality and docs

- [x] **5.1 Remove unused dependencies** after confirming no import: `react-native-purchases`, `expo-av`, `expo-background-task`, `expo-web-browser`; check `@react-navigation/bottom-tabs` and `react-native-bottom-tabs`. (RR #2)
- [x] ~~**5.2 Add logger**~~ moved to 1.7 (Phase 1). Nothing to do here.
- [ ] **5.3 DI cleanup.** Pass `EmbeddingService` to `MemoryService` through the constructor; container getters throw a clear error before init. (RR Architecture)
- [ ] **5.4 Split large files** (after the 3.5 tests exist): `ChatScreen` (599), `MessageRenderer` (454), `ChatRepositoryImpl` (452), `downloadService` (433). `ChatViewModel` is handled in 3.3, not here. (RR #6)
- [x] **5.5 README fixes (F13):** voice input marked "planned" (F06; change it back when G.1 ships voice); remove RevenueCat from stack; fix `SECURITY.md` link (`docs/project/SECURITY.md`); fix or remove `reset-project` script (points to missing `scripts/reset-project.js`).
- [x] **5.6 Verify RevenueCat license statement (RevenueCat removed with 5.1; model licenses in `docs/project/MODEL-LICENSES.md`, needs a model-card check before release)** in CONTRIBUTING against installed dependency; document bundled model licenses. (DR Docs)
- [ ] **5.7 Accessibility (F11, P2).** Labels, roles, disabled/busy state on send and stop controls; audit with VoiceOver, large text, touch targets, contrast; give long-press and swipe gestures an alternative.
- [ ] **5.8 UI states.** Review model-loading, empty library, download failure, interrupted generation screens. (DR UX)
- [x] **5.9 Placeholder screens.** `app/model/[id].tsx`, `app/profile/storage.tsx`: for v1.0.1 hide or remove any navigation to them. Building them is tracked in G.7 and G.8 (main items).

## Phase 6 - Release, community, evidence

- [x] **6.1 `CHANGELOG.md` started** (keep an "Unreleased" entry as each item lands). The actual `v1.0.1` tag and store upload moved to Section H at the end of this file. (RR #5)
- [ ] **6.2 Community files (files done: CODE_OF_CONDUCT, PR template, .mailmap; still open: the good-first-issue issues and labels, see MANUAL.md):** `CODE_OF_CONDUCT.md`, PR template, 3-5 "good first issue" issues and labels, `.mailmap` merging "Sanipan Bera" into "Sandipan006". (RR #7)
- [x] **6.3 Maintenance status note** in README: supported platforms and devices, current status. (DR Project health)
- [ ] **6.4 Cleanup root.** Decide whether the two review `.md` files and `message-fromDeveloper.md` stay in repo root.
- [ ] **6.5 Device benchmarks (main benchmark item; C.7 and I.28 reuse its results; NOT in v1.0.1, moves to v1.1).** Per supported model and device: cold-load time, time to first token, tokens/s, peak memory, thermal, battery, long-session stability; publish medians. (DR Performance)
- [ ] **6.6 Native smoke tests (NOT in v1.0.1, moves to v1.1; for v1.0.1 use the manual acceptance checks in H.2)** for critical flows (first download, first chat, background/foreground, history reopen).
- [x] ~~**6.7 Voice input**~~ tracked in G.1 (main item). Not in v1.0.1; README stays "planned" until then.
- [ ] **6.8 Re-review** after Phases 1-6 to confirm the new score.

## Review areas map (goals, not predictions)

Targets below are goals only. Do not assume they are reached: re-score after implementation and device testing, and tick tasks only after their checks pass.

| Area (RR) | Now | Target | Phases |
| --- | --- | --- | --- |
| Testing and CI | 2 | 7 | 1, 3.5, 4.2 |
| Developer experience | 6.5 | 8 | 1.1, 1.2, 5.5 |
| Security | 7 | 8.5 | 4 |
| Maintenance | 4.5 | 6.5 | 6.1, 6.3 |
| Code quality | 7.5 | 8.5 | 5.1-5.4 |
| Architecture | 8.5 | 9 | 3.2, 5.3 |
| Documentation | 8.5 | 9 | 5.5, 5.6, 4.4 |
| Community | 6.5 | 7 | 6.2 |
| Reliability and AI memory (DR 4.5 / 5.5) | low | 7+ | 2, 3 |

---

# Roadmap beyond the review fixes

The sections above are **Type: Fix** (Section A, from the two review docs). The sections below are new work, separated by type. Order of execution: A first (verified), then **release v1.0.1** (Section H, first pass; the current privacy and support pages are enough for its store listing). Then B to G, with I (website) in parallel, then **release v1.1** (Section H, second pass). The website must be live before v1.1, because the new store listing and localisations link to its privacy and support pages; the old HTML files are removed only then (I.6).

| Section | Type | Goal |
| --- | --- | --- |
| A | Fix | Review findings, phases 1-6 above |
| B | Tooling | npm to Bun |
| C | Models | Refresh model catalog (Gemma and others) |
| D | Design | New UI, light mode, Liquid Glass |
| E | Platform | Android |
| F | Localisation | App Store Connect localisation only (not in-app translation) |
| G | Features | New product features |
| I | Website, SEO, GEO | Real website for organic downloads; remove HTML files from the repo |
| H | Release | v1.0.1 (after Section A) and v1.1 (after B-G and I) |

## Section B - Tooling: npm to Bun

- [ ] **B.1 Check compatibility first.** Confirm Bun works with Expo SDK 54, EAS Build, `expo-dev-client` and Metro on a throwaway branch. Note: native builds still run Node tooling underneath; Bun replaces the package manager and script runner.
- [ ] **B.2 Install and lockfile.** `bun install`, commit `bun.lock`, delete `package-lock.json`, add `.npmrc`/`bunfig.toml` only if needed.
- [ ] **B.3 Scripts.** Update `package.json` scripts and the README quick start from `npm` to `bun` (`bun install`, `bun run lint`, `bun test` or keep Jest via `bun run test`). Decide: Bun test runner vs `jest-expo` (RN needs `jest-expo`; keep it unless Bun works).
- [ ] **B.4 Update CI.** `ci.yml` and `production.yml`: use `oven-sh/setup-bun`, `bun install --frozen-lockfile`; check EAS picks Bun from `bun.lock`; pin the Bun version.
- [ ] **B.5 Docs.** Update `CONTRIBUTING.md` and `docs/development/*` command examples.
- [ ] **B.6 Verify.** Fresh clone: `bun install`, typecheck, lint, tests, dev build and an EAS preview build all pass.

### Dependency upgrades (Type: Tooling)

Do these on their own branch, one group at a time, after B.1-B.6 and before Section C/D, so later work builds on current versions. Current stack: Expo ~54.0.33, React Native 0.81.5, React 19.1.0, `llama.rn` ^0.11.3, `whisper.rn` ^0.5.5, MobX 6, Reanimated ~4.1, Expo Router ~6.

- [ ] **B.7 Inventory.** Run `npx expo install --check` and `bun outdated`; list outdated and deprecated packages, with the changelog link and breaking-change notes for each. Note the deprecated transitive warnings seen at install (`inflight`, `rimraf@3`, `glob@7`).
- [ ] **B.8 Remove first.** Delete unused dependencies (A 5.1) before upgrading, so fewer packages to move.
- [ ] **B.9 `llama.rn` first (highest value).** Newer builds add support for new model architectures (needed for newer Gemma and others, see Section C). Read the release notes for API changes in `initLlama`, `completion`, multimodal, and check that `LlamaRnAdapter` and `EmbeddingService` still work. Re-test model load, stop tokens, think-tag stripping.
- [ ] **B.10 Expo SDK / React Native.** Check whether a newer Expo SDK is out; follow the Expo upgrade guide (`expo install expo@latest`, then `expo install --fix`), review RN and React 19 changes, New Architecture, and `expo-router`, `expo-file-system` (legacy API used by `downloadService`), `expo-notifications`, `expo-updates`. Upgrade only if it unlocks a needed feature (Android, Liquid Glass) or fixes a security/compat issue; otherwise stay on 54.
- [ ] **B.11 Other libs:** `react-native-reanimated`, `react-native-gesture-handler`, `react-native-screens`, `mobx`, `@shopify/flash-list`, `react-native-keyboard-controller`, `whisper.rn` (only if voice, G.1), `react-native-device-info`, `lottie-react-native`. Pin to versions matching the Expo SDK.
- [ ] **B.12 Dev tooling:** `typescript`, `eslint`, `eslint-config-expo`, `@typescript-eslint/*`, `jest-expo`. After upgrading, re-check the `expo-file-system/legacy` typecheck workaround in `tsconfig.json` (A 1.1) and remove it if no longer needed.
- [ ] **B.13 Native rebuild and regression pass** after each group: dev build, EAS preview build, and the release acceptance checks from the detailed review (chat, memory, downloads, lifecycle). Test on a low-RAM iPhone: a library bump can change memory use.
- [ ] **B.14 Security audit:** run the package manager audit and fix high-severity issues; commit the lockfile.
- [ ] **B.15 Schedule.** Add a recurring check (e.g. Renovate or Dependabot config, or a monthly checklist item) so upgrades do not pile up again.

## Section C - Models: refresh the catalog

Today the registry is hardcoded in `src/infrastructure/downloads/modelConfig.ts` (6 models: Qwen 3.5 0.8B/2B/4B, Qwen 3 4B, DeepSeek R1 1.5B, Gemma 3 4B).

- [ ] **C.1 Survey new releases.** List current small GGUF models (Google Gemma family and others: Qwen, Llama, Phi, SmolLM, etc.). Check each for a llama.cpp/llama.rn supported architecture, license and size. Do not assume names; verify on the model pages.
- [ ] **C.2 Selection criteria.** Size tiers by device RAM (about 2 / 3 / 5 / 8 GB), quality on chat, multilingual (Bengali, Hindi), coding, and reasoning. Pick a small set, not everything.
- [ ] **C.3 Update `modelConfig.ts`.** New entries with `filename`, `sizeBytes`, `minRamBytes`, `contextSize`, `stopTokens`, chat template needs, and `sha256` (ties to A 4.1). Retire weak models with a migration note for users who already downloaded them.
- [ ] **C.4 Move catalog out of the binary.** Serve `models/metadata.json` from the CDN so new models ship without an app update. Requirements: **signed catalog** (verify the signature in the app), `schemaVersion`, `minAppVersion` / minimum compatible runtime (`llama.rn`) version per model so old apps never offer a model they cannot run, per-file `sha256` (A 4.1), and a **bundled fallback** catalog used when the fetch or signature check fails. (`MODEL_METADATA_PATH` already exists in env.)
- [ ] **C.5 Upload GGUF files to the CDN** with the same folder layout `models/<id>/<filename>`.
- [ ] **C.6 Recommend by device.** Use `getRecommendedModelId` with the new list; show a "recommended for your phone" badge.
- [ ] **C.7 Test each model on device.** Load time, tokens/s, stop tokens, think-tag handling (`stripThinkingTags`), memory features. Use the A 6.5 benchmark procedure and record results there; do not keep a second benchmark list.
- [ ] **C.8 Vision or multimodal (stretch).** `LLMMessage.imagePath` already exists in the port; evaluate a small vision model.

## Section D - Design: new UI, light mode, Liquid Glass

- [ ] **D.1 Design direction.** Moodboard and screens in Figma or Paper for: onboarding, chat, history, models, memory, profile, support. Keep the orange accent unless the redesign changes it.
- [ ] **D.2 Theme system.** Today colors are constants in `src/design-system/tokens/colors.ts` (dark only, `BLACK_PRIMARY` etc. imported directly). Introduce semantic tokens (background, surface, text, accent) and a theme provider with `light`, `dark`, `system`.
- [ ] **D.3 Migrate all screens** off direct color constants and fix the `*Styles.ts` files to use themed styles.
- [ ] **D.4 Light mode.** Define the palette, check contrast (WCAG AA), status bar style (currently forced `light`), splash/onboarding images and Lottie for light.
- [ ] **D.5 Theme setting.** Add Appearance option in Profile (System / Light / Dark), persisted in AsyncStorage.
- [ ] **D.6 Liquid Glass.** Review `GlassSurface` and `NativeTabs` (iOS 26 native). Use `expo-glass-effect` where available; define fallbacks (blur or solid) for older iOS and for Android. Keep an on-device performance check.
- [ ] **D.7 Rebuild key components** to the new design: message bubbles, composer, model cards, tab bar, header.
- [ ] **D.8 Motion and haptics pass** (reanimated already installed).
- [ ] **D.9 Accessibility check** of the new UI (ties to A 5.7): Dynamic Type, VoiceOver, contrast in both themes.
- [ ] **D.10 Update screenshots and README images.**

## Section E - Platform: Android

Roadmap says v1.3, but `app.config.ts`, EAS and many files already carry Android fields.

- [ ] **E.1 Audit iOS-only code:** `ExpoNotificationsAdapter` (returns early when not iOS), `NativeTabs` with SF Symbols (`SymbolView`, `sfSymbol`), `ActionSheetIOS` in `ChatScreen`, `expo-glass-effect`, `expo-symbols`.
- [ ] **E.2 Replace/adapt:** cross-platform icons (vector icons already installed), Android tab bar, action sheet fallback (already `Alert`), notification channels and permission (Android 13+).
- [ ] **E.3 Native inference on Android.** Check `llama.rn` Android build, `n_gpu_layers`, thread counts (`N_THREADS` is 4 on Android), and RAM heuristics for the wide Android range. Test low-RAM devices; consider disabling big models there.
- [ ] **E.4 Downloads and storage on Android:** large files, scoped storage, background downloads, low-disk handling.
- [ ] **E.5 EAS Android profile:** `android.package`, signing keystore, `app-bundle` build, Play internal testing track.
- [ ] **E.6 Android UI pass:** edge-to-edge, back button behavior, keyboard handling, font scaling.
- [ ] **E.7 Test matrix:** at least low (4 GB), mid (6-8 GB) and high (12 GB+) devices.
- [ ] **E.8 Play Store listing:** data safety form, privacy policy link, screenshots (ties to Section F).

## Section F - Localisation

Scope: **App Store Connect localisation only.** The app UI stays English; no in-app translation, no i18n framework. Reference: Apple's App Store localizations page (https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations/). Check the current supported-locale list and field limits there before writing copy.

- [ ] **F.1 Pick store languages.** Start from the primary language (English) and add locales by audience and search value (e.g. Hindi, Bengali, plus the big App Store markets). Confirm each is on Apple's supported list.
- [ ] **F.2 Localise per-locale text fields** in App Store Connect for each language:
  - App name and subtitle (30-character limits; name is searchable)
  - Promotional text, description
  - Keywords (100-character limit, comma-separated, chosen per locale, no repeats of the name)
  - "What's new in this version" (needed for every release, ties to H.4)
- [ ] **F.3 Localise URLs** where useful: support URL, marketing URL, privacy policy URL. The repo has `PRIVACY.html` and `SUPPORT.html`; decide whether to translate them or keep English links.
- [ ] **F.4 Localised screenshots** per language (and per device size Apple requires). Add translated captions or text overlays; default falls back to the primary language if a locale has none. Cover light and dark mode after Section D.
- [ ] **F.5 App preview video** (optional) per locale.
- [ ] **F.6 Screenshot pipeline.** Script or template (Figma/Paper/Canva) so captions swap per language without redoing the capture.
- [ ] **F.7 Review translations** with native speakers; avoid machine-only copy for the description and keywords.
- [ ] **F.8 Keep a source file in the repo** (e.g. `docs/store/<locale>.md`) with all store text per locale, so releases are reproducible.
- [ ] **F.9 Play Store localisation** (only if Section E ships): same text set via Play Console listings.
- [ ] **F.10 (Note) Chat language is separate.** Model answers already follow the user's language; the English-only memory heuristics are tracked in A 2.7, not here.

### Organic download lessons (source: a solo developer's Reddit write-up, one app, Oct 2026)

Treat as a single case study, not proof: the author says the website and listing changes overlapped, so only the 10 Sep rename had a clean before/after (about 2.5 to 10 downloads a day). Ideas worth copying:

- [ ] **F.11 Baseline before changing anything.** Record current App Store Connect numbers: impressions, product page views, first downloads, conversion (the post's ratio: about 3 in 100 impressions become a page view; the search result is the whole listing for everyone else). Pull daily downloads from sales reports, not only the 90-day "% change" on the Overview page, which looks huge against a quiet baseline.
- [ ] **F.12 Rewrite name and subtitle as search phrases** (what users type), not brand slogans. Example of the pattern: "Brand: what it does + for whom" and a subtitle with a search phrase. Candidates for LokalMind: offline / private / on-device AI chat, local LLM, no internet. Test one change at a time so cause is visible.
- [ ] **F.13 Keyword field hygiene.** Apple indexes name, subtitle and keywords together, so never repeat words already in the name or subtitle; fill the 100 characters with new words (device terms, content terms, synonyms). No spaces after commas, no plurals if singular matches.
- [ ] **F.14 Make every locale count.** Each locale has its own name, subtitle and keyword field, so each added locale is extra indexed text. Order: locales where the website or existing users already come from (Search Console, App Store Connect territories), then the rest. Write keywords **per language**, do not translate the English list.
- [ ] **F.15 Local search wording.** Check how people phrase the search in each language (e.g. local word for "phone" or "AI"); use free tools (Search Console, Google Trends, autocomplete) or a short paid trial, as a proxy for App Store search. Verify against real App Store search suggestions.
- [ ] **F.16 Description matches the app.** Remove features that no longer exist; fill the promotional text field (it can change without a new build).
- [ ] **F.17 Screenshots per language,** produced by a repeatable script (the post renders them from widget tests, one command to redo all). First 2-3 screenshots matter most in search results.
- [ ] **F.18 Rating prompt** with the system dialog only (`expo-store-review`), after the first successful moment (e.g. first completed chat reply), never on launch. Check `expo-store-review` is not already installed before adding.
- [ ] **F.19 Campaign links.** Use App Store campaign links (provider/campaign tokens) on the website, README and GitHub buttons so web traffic can be separated from store search in Analytics.
- [ ] **F.20 Website / SEO support (optional).** The post's biggest traffic came from localised web pages with download buttons. A landing page per language with App Store links can feed installs.
- [ ] **F.21 App Review risk check before every submission.** The post reports two metadata rejections after earlier approval: other-platform names (e.g. "Android") in subtitle and description (Guideline 2.3.10), and price words such as "Free" in screenshot captions (2.3.7). Re-read the current App Review Guidelines 2.3.x and scan name, subtitle, description, keywords, screenshots and captions for: other platforms' names, competitor names, price/"free" claims, unverifiable claims ("no data leaves device" must match `PRIVACY.html`, see A 4.4). Passing review once does not make a choice safe.
- [ ] **F.22 Retention note.** Occasional-use apps get installed and forgotten. LokalMind is chat, so check day-1/day-7 retention in App Store Connect and use it to judge features in Section G (memory, notifications).
- [ ] **F.23 Measure.** After each store change, log date, change and daily downloads in `docs/store/changelog.md`; compare 7-day windows, not single days.

## Section G - Features (new)

Pick and order these with the user; not all need to ship in v1.0.1.

- [ ] **G.1 Voice input (Whisper) - main voice item.** Finish the stub adapter end to end (permission, model download, record, transcribe, cancel, cleanup, device test). When done, change the README from "planned" back to a feature (A 5.5).
- [ ] **G.2 Tool use** (roadmap v1.1): decide scope, safe on-device tools only.
- [ ] **G.3 Text to speech** (roadmap v1.2).
- [ ] **G.4 User-adjustable context length and generation settings** (temperature, max tokens).
- [ ] **G.5 Chat export / share and import.**
- [ ] **G.6 Memory UX improvements:** search, forget on request, per-fact source.
- [ ] **G.7 Storage screen - main item (also covers A 5.9)** (placeholder `profile/storage.tsx`): show model sizes, delete models, free space.
- [ ] **G.8 Model detail screen - main item (also covers A 5.9)** (placeholder `model/[id].tsx`): description, RAM fit, benchmarks.
- [ ] **G.9 Home screen widget / Shortcuts (stretch).**
- [ ] **G.10 Image reading / multimodal (DEFERRED, GitHub issue #46 "add multimodal image text recognition").** Previously built and **disabled because the app became slow and crashed** (vision projector adds RAM on top of the model). Revisit only after A 3.2 (inference queue), C (new models, `llama.rn` upgrade B.9) and device benchmarks (A 6.5). Needs: vision model plus `mmproj` in the catalog, `LlamaRnAdapter` to load the projector and pass `image_url` parts (it drops `imagePath` today), RAM gating in `resolveContextSize`, low `image_max_tokens`, attach UI, `image_uri` column. Alternative to test: on-device OCR feeding text to any model. Acceptance: no slowdown or crash on the lowest supported iPhone.

## Section I - Website, SEO and GEO (Type: Marketing / Web)

Goal: organic downloads from Google search and from AI answers (ChatGPT, Perplexity, Google AI Overviews, Gemini), with every page pushing to the App Store. The Reddit case study in Section F got most of its traffic from localised web pages with download buttons.

Today the repo holds `PRIVACY.html` (227 lines) and `SUPPORT.html` (183 lines) at the root. No file in the repo links to them, so the live URLs are most likely stored in App Store Connect (and possibly GitHub Pages). Do not delete until the new site serves the same pages.

### I1 - Site setup and migration

- [ ] **I.1 Pick domain and host.** Buy a domain, choose a host (Vercel, Cloudflare Pages, GitHub Pages) and framework (static site: Astro or Next.js static export). Keep it in a separate repo, e.g. `lokalmind-web`, or a `/website` folder; decide before starting.
- [ ] **I.2 Find the live URLs.** Check App Store Connect (Privacy Policy URL, Support URL, Marketing URL), the README, GitHub repo "website" field, the in-app Support screen (`env.support.*`, `GITHUB_REPO_URL`) and any Play listing. List every place that links to the old pages.
- [ ] **I.3 Rebuild Privacy and Support pages** on the new site at stable URLs (e.g. `/privacy`, `/support`), content reviewed against A 4.4 (accurate privacy wording: chat on device, network only for model downloads and OTA updates).
- [ ] **I.4 Redirect old URLs** (301) from the old locations to the new ones, if the old URLs are served anywhere.
- [ ] **I.5 Update every reference** to the new URLs: App Store Connect, README, `SECURITY.md`/docs, GitHub repo settings, env vars.
- [ ] **I.6 Delete `PRIVACY.html` and `SUPPORT.html` from this repo** only after I.3-I.5 are live and verified (open the new URLs, confirm App Store Connect saves them). Update docs that mention them (RR/DR docs mention `PRIVACY.html`).

### I2 - Pages and content

- [ ] **I.7 Home page.** One clear promise ("private AI that runs on your iPhone, offline"), App Store badge, screenshots, short demo video or GIF, model list with RAM guidance, FAQ.
- [ ] **I.8 Feature pages** for the search terms people use: offline AI on iPhone, run LLM on iPhone, Gemma/Qwen/DeepSeek on iPhone, private AI chat no internet, AI with memory, which model for 4 GB/6 GB iPhone.
- [ ] **I.9 Model pages** (one per model in the catalog): size, RAM needed, strengths, license. Update with Section C.
- [ ] **I.10 Guides / blog** with real how-to content (top results for these queries are often thin): how local LLMs work, battery and heat, best small models, privacy comparison. Update when new models ship.
- [ ] **I.11 Comparison page** (honest, factual; avoid competitor names in the App Store listing itself, see F.21, but fine on the website).
- [ ] **I.12 Changelog / what's new page** linked from release notes (H.4).
- [ ] **I.13 Localised pages** for the same store languages as Section F, with per-language wording (not machine-translated copy), `hreflang` tags and language folders.
- [ ] **I.14 Download buttons everywhere** with App Store campaign links (F.19) and a smart app banner (`apple-itunes-app` meta tag); Play button when Section E ships.

### I3 - Technical SEO

- [ ] **I.15 Crawlability:** `sitemap.xml`, `robots.txt`, clean URLs, canonical tags, HTTPS, no duplicate pages, 404 page.
- [ ] **I.16 Metadata:** unique title and meta description per page, Open Graph and Twitter card images (also feeds link previews).
- [ ] **I.17 Structured data (JSON-LD):** `SoftwareApplication` / `MobileApplication` (name, OS, price, rating, download URL), `FAQPage`, `Organization`, `BreadcrumbList`, `Article` for guides. Validate with Google's Rich Results Test.
- [ ] **I.18 Performance:** Core Web Vitals (LCP, INP, CLS), compressed images (WebP/AVIF), minimal JavaScript, fonts self-hosted; check with Lighthouse and PageSpeed on mobile.
- [ ] **I.19 Accessibility and mobile-first layout,** which also helps ranking.
- [ ] **I.20 Internal linking:** hub-and-spoke (home, features, models, guides), breadcrumbs, no orphan pages.
- [ ] **I.21 Search Console and Bing Webmaster Tools:** verify domain, submit sitemap, watch coverage, queries, countries. Use query data to choose App Store locales and keywords (F.14, F.15).
- [ ] **I.22 Analytics (privacy-friendly):** Plausible/Umami or Cloudflare analytics, no invasive tracking, consistent with the privacy-first brand. Track clicks on App Store buttons by campaign link.
- [ ] **I.23 Backlinks and listings:** GitHub README link, Product Hunt, Hacker News "Show HN", Reddit (r/LocalLLaMA, r/iphone, r/privacy, respecting each sub's self-promotion rules), AlternativeTo, awesome-lists for on-device LLM apps, YouTube/blog reviews.

### I4 - GEO (generative engine optimisation: appearing in AI answers)

- [ ] **I.24 Answer-first content.** Short, factual, self-contained passages that answer one question each (what it is, which models, RAM needs, is it private, is it free), with the key fact in the first sentence. AI engines quote passages, not pages.
- [ ] **I.25 Clear entity facts** repeated consistently everywhere (site, GitHub, App Store, socials): app name, developer, platform, price, license (MIT), model list, release date. Add an "About" page and a facts/press-kit page.
- [ ] **I.26 Allow AI crawlers deliberately.** Decide in `robots.txt` for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc. (allow if you want citations). Check server logs for their visits.
- [ ] **I.27 `llms.txt` (optional).** Add a short markdown summary of the site for AI tools; low cost, but treat as unproven (some engines ignore it).
- [ ] **I.28 Cite-worthy content:** original data (e.g. tokens/s per model per iPhone from A 6.5 / C.7, RAM fit tables), dated and versioned, with methodology. Benchmarks are what AI answers and journalists cite.
- [ ] **I.29 Third-party mentions.** Reddit, GitHub, Wikipedia-style listings, reviews and directories feed AI answers more than the site alone; keep the GitHub README strong and linked to the site.
- [ ] **I.30 Test visibility.** Monthly: ask ChatGPT, Perplexity, Gemini, Google AI Overviews fixed questions ("best offline AI app for iPhone", "run Gemma on iPhone", etc.); log whether LokalMind is mentioned or cited, and which sources appear. Adjust content from results.

### I5 - Measure

- [ ] **I.31 Baseline and monthly review:** impressions, clicks, top queries and countries (Search Console); site visits to App Store clicks (campaign links); App Store downloads by source (App Store Connect); keep numbers next to F.23 log.

## Section H - Release: v1.0.1, then v1.1

Two releases. **v1.0.1** = Section A without 6.5-6.7, shipped right after Section A so the gap since April does not grow. **v1.1** = Sections B-G plus website I. Run H.1-H.12 for v1.0.1 first, then again for v1.1.

- [ ] **H.1 Freeze scope.** v1.0.1 = Section A minus 6.5-6.7; B to G go to v1.1 (split v1.1 further if it is too big). Do not add features to v1.0.1.
- [ ] **H.2 Quality gate.** Section A done except 6.5-6.7 (for v1.1: B-G and I done too), CI green, release acceptance checks from the detailed review pass (chat, memory, downloads, lifecycle, accessibility).
- [ ] **H.3 Bump version** in `app.json`/`package.json`; check `eas.json` `appVersionSource`, build number.
- [ ] **H.4 Finalize `CHANGELOG.md`** and write release notes (localised "What's new").
- [ ] **H.5 TestFlight build** (`testflight` profile), test on real devices, fix blockers.
- [ ] **H.6 Android internal test** build, if Section E is in scope.
- [ ] **H.7 Store submission.** Upload v1.0.1 to App Store (and Play Store); update screenshots, metadata and privacy answers.
- [ ] **H.8 Tag `v1.0.1`, publish GitHub release,** update README badges and status note.
- [ ] **H.9 Post-release watch.** Crash reports, reviews, first-week fixes.
- [ ] **H.10 Release recovery plan** (write down before shipping, test where possible):
  - Failed OTA update: confirm `expo-updates` runtime-version policy so an OTA never reaches a binary it is incompatible with; know how to roll back or republish a previous update on the channel; embedded update is the fallback.
  - Interrupted DB migration: migrations idempotent and re-runnable, DB backed up before migrating, app starts safely if a migration stops halfway (see 3.6).
  - Incompatible model changes: never delete a user's working model file until its replacement is downloaded and verified (A 4.1); catalog `minAppVersion` stops old apps from offering models they cannot run (C.4); clear message and re-download path for a model that fails to load.
  - Store: ability to pull or expedite a fix release; keep the previous build available in TestFlight.
- [ ] **H.11 Regression rerun.** Before marking v1.1 ready, rerun the Section A tests and acceptance checks (chat, memory, downloads, lifecycle, accessibility) against the upgraded packages, new UI and Android build; anything touched by B to G must be re-verified.
- [ ] **H.12 Upgrade test on the released build.** Install the previous public version (v1.0 for v1.0.1, v1.0.1 for v1.1), populate data, upgrade, verify (same as 3.6) before submission.
