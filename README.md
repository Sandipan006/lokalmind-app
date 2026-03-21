# LokalMind

**On-device AI for your phone** — private, offline-capable chat and tooling built with **Expo** and **React Native**. Inference runs locally via **llama.rn**; speech uses **whisper.rn**. The app uses **Clean Architecture**, **MobX** view models, and **expo-router** for navigation.

---

## Highlights

| | |
| :--- | :--- |
| **Privacy** | Models and data stay on device; no cloud inference required for core chat |
| **Stack** | Expo 54 · RN 0.81 · React 19 · Expo Router 6 |
| **Patterns** | Domain / data / presentation · `Result<T>` flows · DI in `src/core/di/container.ts` |

---

## Tech stack

- **Runtime:** Expo ~54, React Native 0.81, React 19  
- **Navigation:** Expo Router ~6  
- **State (UI):** MobX 6, mobx-react-lite  
- **AI:** llama.rn (GGUF), whisper.rn (STT)  
- **Storage:** expo-sqlite, AsyncStorage  
- **Monetization / misc:** RevenueCat, design-system tokens under `src/design-system/`

---

## Quick start

```bash
git clone <repo-url>
cd lokalmind-app
npm install
npx expo start
```

**Native modules** (`llama.rn`, `whisper.rn`, dev client): use a dev build, not only Expo Go.

```bash
npx expo run:android
# or
npx expo run:ios
```

---

## Environment

1. Copy `.env.example` → `.env` and fill values.  
2. `app.config.ts` exposes values via Expo `extra`; runtime reads from `src/config/env.ts`.

Key variables include `EAS_PROJECT_ID`, bundle IDs, Hetzner / WebDAV model hosting, `CTX_SIZE_DEFAULT`, `CHAT_MAX_TOKENS`, download tuning, and credentials as needed.

---

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run start` | Expo dev server |
| `npm run android` / `npm run ios` / `npm run web` | Platform targets |
| `npm run lint` | ESLint (expo config) |
| `npm run reset-project` | Reset helper script |

---

## Repository layout

```text
app/                 Expo Router routes
src/
  core/              DI, ports, shared types (e.g. Result)
  features/          Feature slices — domain / data / presentation
  infrastructure/    Adapters only (llama, whisper, storage, downloads)
  design-system/     Tokens and UI primitives
  config/            Env and app config helpers
docs/                Architecture, PRD, conventions, feature notes
```

Deeper detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/FOLDER-STRUCTURE.md`](docs/FOLDER-STRUCTURE.md), [`docs/LLM-PIPELINE.md`](docs/LLM-PIPELINE.md).

---

## Architecture (short)

- **Domain** — pure TypeScript; no React / native SDK imports.  
- **Presentation** — screens + MobX VMs; calls use cases and repository interfaces only.  
- **Data** — implements repositories; infra injected via constructors.  
- **Infrastructure** — only layer that touches llama.rn, whisper.rn, sqlite, etc.  
- **Composition root** — `src/core/di/container.ts`.

---

## Status

Core flows: onboarding, model download/management, local chat with streaming UI, profile and settings surfaces. See `docs/` and issue tracker for roadmap and in-progress work.
