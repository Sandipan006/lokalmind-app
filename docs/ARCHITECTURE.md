# LokalMind v2 - Architecture Overview

Version: 2.0.0 | Platform: iOS (Android - Phase 2) | License: MIT

> **Your mind. Your device. No cloud.**

---

## Documentation Index

| File | Contents |
|---|---|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | This file - overview, tech stack, layer rules |
| **[FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md)** | Full folder tree, DI container, dependencies, build phases |
| **[DATA-MODEL.md](./DATA-MODEL.md)** | SQLite schema, AsyncStorage keys, model registry |
| **[LLM-PIPELINE.md](./LLM-PIPELINE.md)** | ILLMEngine + IWhisperEngine interfaces, chat turn sequence, memory pipeline, Whisper STT |
| **[DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)** | Liquid Glass, color tokens, typography, navigation |
| **[FEATURES.md](./FEATURES.md)** | Feature showcase - every differentiating capability explained end-to-end |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Expo SDK 54 · React Native 0.81 · React 19.1 · New Architecture |
| Navigation | expo-router v6 (file-based, stack + tabs) |
| State Management | MobX 6 + mobx-react-lite (ViewModels only) |
| LLM Engine | llama.rn ^0.7.0 (GGUF inference via llama.cpp) |
| Voice / STT | whisper.rn (on-device Whisper base model, .bin, 142MB) |
| Database | expo-sqlite ~16.0.8 (WAL mode, foreign keys) |
| Key-Value Store | @react-native-async-storage/async-storage 2.2.0 |
| File System | expo-file-system ~19.0.17 (new API, not /legacy) |
| Glass UI | expo-glass-effect (native iOS 26+ UIVisualEffectView) |
| Animations | react-native-reanimated · lottie-react-native |
| Gestures | react-native-gesture-handler |
| Lists | @shopify/flash-list 2.0.2 |
| Monetisation | react-native-purchases (RevenueCat) |
| Notifications | expo-notifications ~0.32.12 |
| Fonts | expo-font · Figtree family |
| Icons | react-native-svg + custom SVG icon set |
| Device Info | react-native-device-info (RAM detection) |

---

## Architecture Pattern: Clean Architecture + Feature Modules

LokalMind v2 follows Clean Architecture with Feature Modules. The codebase is organized by feature (`chat`, `models`, `profile`, `memory`), with each feature owning its own presentation, domain, and data layers. Shared infrastructure (LLM bridge, storage drivers, download service) lives in a dedicated `infrastructure/` layer.

```
Presentation  →  Domain  ←  Data  ←  Infrastructure
(screens, VMs)   (entities,    (repos,    (llama.rn,
                  use cases,    services)  SQLite,
                  interfaces)             AsyncStorage)
```

---

## Layer Rules (strictly enforced)

1. **Domain layer** (`features/*/domain/`) has **zero third-party dependencies**. Pure TypeScript entities, use cases, and repository interfaces only.

2. **Presentation layer** (`features/*/presentation/`) **never imports from `infrastructure/` directly**. Only calls domain use cases and repository interfaces.

3. **Data layer** (`features/*/data/`) implements domain repository interfaces. ViewModels never know SQLite or AsyncStorage exist.

4. **Infrastructure layer** (`infrastructure/`) is injected into data repositories via constructor - never imported globally or from presentation/domain.

5. **`ILLMEngine`** is the only LLM contract. `llama.rn` is swappable. No file outside `infrastructure/llm/` imports `llama.rn`.

6. **`IWhisperEngine`** is the only Whisper contract. `whisper.rn` is swappable. No file outside `infrastructure/whisper/` imports `whisper.rn`.

7. **Glass surfaces** always use `GlassSurface` from `design-system/components/`. No direct `GlassView` or `expo-blur` imports in feature code.

8. **No hardcoded colors, font names, or spacing values** anywhere outside `design-system/tokens/`.
