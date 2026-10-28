# Changelog

All notable changes to LokalMind. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Jest test harness (`npm test`) and tests for known memory and context bugs.
- GitHub Actions `CI` workflow (typecheck, lint, test) on pull requests to `main`.
- `src/core/logger.ts`: dev-only logging.
- `CODE_OF_CONDUCT.md`, pull request template, `.mailmap`.

### Changed
- Chat and regenerate replies now stop at `CHAT_MAX_TOKENS` (default 512) instead of running unbounded.
- Production build workflow now runs typecheck, lint and tests first, installs with `npm ci`, and pins EAS CLI.
- README, CONTRIBUTING and docs no longer mention RevenueCat or the removed `reset-project` script.

### Removed
- Unused dependencies: `react-native-purchases`, `expo-av`, `expo-background-task`, `expo-web-browser`. A new native build is needed.
- Placeholder screens `model/[id]` and `profile/storage` (nothing linked to them).

### Fixed
- `tsc --noEmit` and `npm run lint` now pass.
