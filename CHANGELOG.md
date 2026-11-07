# Changelog

All notable changes to LokalMind. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Jest test harness (`npm test`) and tests for known memory and context bugs.
- GitHub Actions `CI` workflow (typecheck, lint, test) on pull requests to `main`.
- `src/core/logger.ts`: dev-only logging.
- `CODE_OF_CONDUCT.md`, pull request template, `.mailmap`.

### Changed
- **Reminder notifications redesigned:** 56 on-device reminders, 3-4 a day at varying times inside four daytime windows, about 15 days; every app open or background cancels the old plan and starts a new one. Replaces the 4-tier inactivity reminders, which were never cancelled after the app was killed. New **Reminders** switch in Profile -> Account; The privacy and support pages on the website describe it.
- Chat and regenerate replies now stop at `CHAT_MAX_TOKENS` (default 512) instead of running unbounded.
- Production build workflow now runs typecheck, lint and tests first, installs with `npm ci`, and pins EAS CLI.
- README, CONTRIBUTING and docs no longer mention RevenueCat or the removed `reset-project` script.

### Removed
- `PRIVACY.html` and `SUPPORT.html`: the privacy and support pages now live only in the website repo (`lokalmind-web`).
- **All memory:** cross-session memories, learned profile, pinned facts, in-chat summaries, MiniLM semantic search, the Memory screen, and the memory/profile notifications. Saved memory data stays in the on-device database but is no longer read. The MiniLM file (~21 MB) is deleted from the device on upgrade.
- Unused dependencies: `react-native-purchases`, `expo-av`, `expo-background-task`, `expo-web-browser`. A new native build is needed.
- Placeholder screens `model/[id]` and `profile/storage` (nothing linked to them).

### Fixed
- `tsc --noEmit` and `npm run lint` now pass.
