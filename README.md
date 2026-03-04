# LokalMind

A privacy-first, fully on-device AI assistant for Android and iOS. All inference runs locally — no cloud, no data leaving your device.

Built with Expo (React Native), `llama.rn` for LLM inference, `whisper.rn` for voice input, MobX for state, and Clean Architecture.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Expo ~54 / React Native 0.81 |
| Routing | Expo Router ~6 |
| State | MobX 6 + mobx-react-lite |
| LLM | llama.rn ^0.11 |
| STT | whisper.rn ^0.5 |
| Storage | expo-sqlite + AsyncStorage |
| UI | expo-blur, expo-glass-effect, Reanimated 4 |

---

## Getting Started

```bash
npm install
npx expo start
```

For a native dev build (required for `llama.rn` / `whisper.rn`):

```bash
npx expo run:android
# or
npx expo run:ios
```

---

## Project Structure

```
src/
  core/          # DI container, ports (ILLMEngine, IWhisperEngine), shared types
  features/      # Feature slices — domain / data / presentation
  infrastructure/# llama.rn adapter, whisper.rn adapter, SQLite, storage
  design-system/ # Tokens (colors, spacing, typography) + components
app/             # Expo Router file-based routes
```

---

## Architecture

Clean Architecture with strict layer boundaries:

- **Domain** — plain TypeScript entities, use cases, repository interfaces. Zero third-party deps.
- **Data** — repository implementations. Receives infrastructure via constructor injection.
- **Infrastructure** — only layer that touches `llama.rn`, `whisper.rn`, `expo-sqlite`.
- **Presentation** — MobX ViewModels + React screens. Never imports infrastructure directly.

---

## Environment

Copy `.env.example` to `.env` and fill in:

```
EAS_PROJECT_ID=
APP_OWNER=
```
