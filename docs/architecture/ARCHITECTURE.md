# LokalMind v2 - Architecture Overview

Version: 1.0.0 | Platform: iOS (Android - Phase 2) | License: MIT

> **Your mind. Your device. No cloud.**

---

## Documentation Index

| File | Contents |
|---|---|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | This file - overview, tech stack, layer rules |
| **[DATA-MODEL.md](./DATA-MODEL.md)** | SQLite schema, AsyncStorage keys, model registry |
| **[LLM-PIPELINE.md](./LLM-PIPELINE.md)** | ILLMEngine + IWhisperEngine interfaces, chat turn sequence, context budget, Whisper STT |
| **[FOLDER-STRUCTURE.md](../development/FOLDER-STRUCTURE.md)** | Full folder tree, DI container, dependencies, build phases |
| **[DESIGN-SYSTEM.md](../design/DESIGN-SYSTEM.md)** | Liquid Glass, color tokens, typography, navigation |
| **[FEATURES.md](../product/FEATURES.md)** | Feature showcase - every differentiating capability explained end-to-end |
| **[DEVELOPER-GUIDE.md](../development/DEVELOPER-GUIDE.md)** | Contributor reference, features, infrastructure, conventions |
| **[KNOWN-LIMITATIONS.md](../project/KNOWN-LIMITATIONS.md)** | Community-trackable limitations |
| **[SECURITY.md](../project/SECURITY.md)** | Vulnerability reporting |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Expo SDK 54 · React Native 0.81.5 · React 19.1 · New Architecture |
| Navigation | expo-router v6 (file-based, stack + tabs) |
| State Management | MobX 6 + mobx-react-lite (ViewModels only) |
| LLM Engine | llama.rn ^0.11.3 (GGUF inference via llama.cpp) |
| Voice / STT | whisper.rn ^0.5.5 (on-device Whisper; base model asset ~142MB when bundled) |
| Database | expo-sqlite ~16.0.10 (WAL mode, foreign keys) |
| Key-Value Store | @react-native-async-storage/async-storage 2.2.0 |
| File System | expo-file-system ~19.0.21 (new API, not /legacy) |
| Glass UI | expo-glass-effect (native iOS 26+ UIVisualEffectView) |
| Animations | react-native-reanimated · lottie-react-native |
| Gestures | react-native-gesture-handler |
| Lists | @shopify/flash-list 2.0.2 |
| Notifications | expo-notifications ~0.32.16 |
| Fonts | expo-font · Figtree family |
| Icons | react-native-svg + custom SVG icon set |
| Device Info | react-native-device-info (RAM detection) |

---

## Architecture Pattern: Clean Architecture + Feature Modules

LokalMind v2 follows Clean Architecture with Feature Modules. The codebase is organized by feature (`chat`, `models`, `onboarding`, `profile`, `tabs`), with each feature owning its own presentation, domain, and data layers. Shared infrastructure (LLM bridge, storage drivers, download service) lives in a dedicated `infrastructure/` layer.

```
Presentation  →  Domain  ←  Data  ←  Infrastructure
(screens, VMs)   (entities,    (repos,    (llama.rn,
                  use cases,    services)  SQLite,
                  interfaces)             AsyncStorage)
```

---

## Local Notifications

Port: `ILocalNotifications` (`src/core/ports`). Adapter: `ExpoNotificationsAdapter` (`src/infrastructure/notifications`). iOS only; all scheduling is on device.

| Kind | When | Tap opens |
|---|---|---|
| Chat done | Reply finished or failed while the app is in the background; sent immediately, deduped for 90 s | That chat |
| Reminder | Scheduled plan, see below | Chat tab |

**Reminder plan** (`reminderPlan.ts`, pure and unit tested; copy in `reminderCopy.ts`):
- 56 reminders, 3 or 4 a day, about 15 days. iOS holds at most 64 pending local notifications, so 56 leaves headroom.
- Four local-time windows: morning 08:30-10:30, midday 12:00-14:00, evening 17:30-19:30, night 20:30-21:45. Each reminder lands at a different minute in its window. The minutes come from a generator seeded with the calendar date, so rebuilding on the same day gives the same plan.
- The first reminder is at least 2 hours after "now".
- **Reset on every open and every background:** cancel all owned notifications, then schedule 56 new ones counted from that moment. A user who opens the app every day never sees a reminder.
- Owned notifications are found by asking the OS (`lm-reminder-N` ids, plus legacy `kind: 'inactivity'`), so a killed app still cancels its old plan.
- Rebuilds run one at a time; errors are swallowed so they never reach the app lifecycle.
- Nothing is scheduled without OS permission or when the user switch (`lm:notif:reminders:enabled`, Profile -> Account -> Reminders) is off.
- Copy is fixed text, never chat content. It must not claim memory, use price words or name other platforms (a test checks this).

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
