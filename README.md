# LokalMind

LokalMind is a privacy-first, on-device AI assistant built with Expo + React Native.
Inference uses `llama.rn`, voice transcription uses `whisper.rn`, and the app follows Clean Architecture with MobX ViewModels.

## Tech Stack

- Expo `~54`, React Native `0.81`, React `19`
- Expo Router `~6`
- MobX `6` + `mobx-react-lite`
- `llama.rn` (LLM), `whisper.rn` (STT)
- `expo-sqlite` + AsyncStorage

## Current Status

- Onboarding flow is implemented (`splash` -> `welcome` -> `username` -> `model setup`).
- Model setup + download orchestration is implemented in `features/models`.
- Core DI and infra adapters are wired in `src/core/di/container.ts`.
- Chat, Models tab, Profile tab, and some profile routes are placeholders for upcoming phases.

## Quick Start

```bash
npm install
npx expo start
```

For native modules (`llama.rn`, `whisper.rn`), use a native dev build:

```bash
npx expo run:android
# or
npx expo run:ios
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill required values

```env
EAS_PROJECT_ID=
APP_OWNER=
IOS_BUNDLE_IDENTIFIER=
ANDROID_PACKAGE=
HETZNER_BASE_URL=
HETZNER_WEBDAV_URL=
MODEL_METADATA_PATH=
CTX_SIZE_DEFAULT=
CHAT_MAX_TOKENS=
DOWNLOAD_CHUNK_SIZE=
DOWNLOAD_CONCURRENCY=
HETZNER_WEBDAV_USERNAME=
HETZNER_WEBDAV_PASSWORD=
```

`app.config.ts` injects these values into Expo `extra`, and runtime access is centralized in `src/config/env.ts`.

## Scripts

- `npm run start` - start Expo
- `npm run android` - start Expo for Android
- `npm run ios` - start Expo for iOS
- `npm run web` - start Expo for web
- `npm run lint` - run ESLint

## Project Structure

```text
app/                     expo-router routes
src/
  core/                  DI container, ports, shared Result/AppError types
  features/              feature slices (domain/data/presentation)
  infrastructure/        platform adapters (llama, whisper, downloads, storage)
  design-system/         UI primitives and tokens
  config/                runtime environment config
```

## Architecture Rules

- Domain layer stays pure TypeScript (no framework/native SDK imports).
- Presentation calls use cases/repositories only, never infrastructure directly.
- Data layer implements repository contracts and receives infra via constructor injection.
- `src/core/di/container.ts` is the single composition root.
