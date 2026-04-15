<div align="center">

# LokalMind

**Private AI chat that runs entirely on your phone.**  
No cloud. No subscriptions for core chat. Your data never leaves your device.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-iOS-lightgrey)](#)
[![Built with Expo](https://img.shields.io/badge/built%20with-Expo%2054-black?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react)](https://reactnative.dev)

</div>

---

## What is LokalMind?

LokalMind brings large language models directly onto your phone. Pick a model, download it once, and chat completely offline - no API keys, no data leaving your device, no servers listening in.

- **Local inference** via [llama.rn](https://github.com/mybigday/llama.rn) (GGUF models)
- **On-device memory** - the app remembers facts across conversations using semantic search, entirely local
- **Streaming UI** with haptic feedback as the model generates
- **Multiple models** - swap between Qwen, DeepSeek, Gemma and more
- **Chat modes** - General, Code, Reasoning, Creative, and more

---

## Models

| Model | Size | RAM | Best for |
|-------|------|-----|----------|
| Qwen 3.5 - 0.8B | 550 MB | 2 GB+ | Fast everyday chat |
| Qwen 3.5 - 2B | 1.3 GB | 3 GB+ | Summaries, multilingual |
| DeepSeek R1 - 1.5B | 1.1 GB | 3 GB+ | Coding, math, reasoning |
| Qwen 3.5 - 4B | 2.9 GB | 5 GB+ | Complex tasks, creative |
| Qwen 3 - 4B | 2.5 GB | 5 GB+ | Thinking mode, coding |
| Gemma 3 - 4B | 2.5 GB | 5 GB+ | Long context, analysis |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Expo ~54 · React Native 0.81 · React 19 |
| Navigation | Expo Router ~6 |
| State | MobX 6 · mobx-react-lite |
| Inference | llama.rn (GGUF) |
| Storage | expo-sqlite · AsyncStorage |
| Architecture | Clean Architecture · `Result<T>` flows · DI container |

---

## Quick start

```bash
git clone https://github.com/Sandipan006/lokalmind-app.git
cd lokalmind-app
npm install
cp .env.example .env
npx expo run:ios
```

> Expo Go is **not supported** - native modules (`llama.rn`) require a dev build.

The `.env.example` ships with all public defaults pre-filled. Model downloads work out of the box - no credentials needed.

---

## Environment

`app.config.ts` injects env vars at build time via Expo `extra`. Runtime reads them from `src/config/env.ts`.

```bash
cp .env.example .env
# Fill in:
#   IOS_BUNDLE_IDENTIFIER / ANDROID_PACKAGE  - your bundle ID
#   EAS_PROJECT_ID / APP_OWNER               - only for EAS cloud builds
```

Everything else (CDN URL, LLM defaults, download settings) works without changes.

---

## Repository layout

```
app/                    Expo Router routes (thin - no business logic)
src/
  core/                 DI container, ports (interfaces), shared Result<T> type
  features/             Feature slices
    chat/               └── domain / data / presentation
    memory/             └── cross-session memory & embeddings
    models/             └── download, manage GGUF models
    onboarding/         └── first-run flow
    profile/            └── settings, pinned facts, storage
  infrastructure/       Adapters - llama.rn, whisper.rn, SQLite, downloads
  design-system/        Tokens (colors, typography, spacing, glass)
  config/               env.ts - runtime config
```

---

## Architecture

```
Presentation  →  Use Cases  →  Domain entities
                    ↕
              Repository interfaces
                    ↕
           Data layer (implements repos)
                    ↕
         Infrastructure (llama.rn, SQLite…)
```

- **Domain** - pure TypeScript, zero third-party imports
- **Presentation** - screens + MobX ViewModels, calls use cases only
- **Data** - implements repository interfaces, receives infra via constructor injection
- **Infrastructure** - the only layer that imports `llama.rn`, `whisper.rn`, `expo-sqlite`
- **Composition root** - `src/core/di/container.ts`

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run start` | Expo dev server |
| `npm run ios` | Run on device / simulator |
| `npm run lint` | ESLint |
| `npm run reset-project` | Reset local state |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, branch conventions, and code style.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

---

## Built by

**Sandipan Bera** - React Native developer & UI/UX designer from India.

LokalMind is an open source project, built in public.  
If it's useful to you, a ⭐ on GitHub goes a long way.

Follow the journey on X → [@hey_sandipan](https://x.com/hey_sandipan)

Support the project:
- [PayPal](https://paypal.me/sandipan804)
- [Other payment options](https://checkout.dodopayments.com/buy/pdt_IEOG0s908rxVulWQVLxkV?quantity=1)

## License

[MIT](LICENSE)
