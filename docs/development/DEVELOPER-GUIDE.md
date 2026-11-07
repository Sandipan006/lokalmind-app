# LokalMind - Complete Developer Guide

> LokalMind has no memory feature. Cross-session memories, the learned profile, pinned facts, in-chat summaries and embeddings were removed. A turn sends only the system prompt, recent history and the current message.

> **Your mind. Your device. No cloud.**
>
> A comprehensive reference for contributors, forkers, and developers building on or studying LokalMind's architecture.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start](#2-quick-start)
3. [Repository Layout](#3-repository-layout)
4. [Architecture Deep Dive](#4-architecture-deep-dive)
5. [Feature Modules](#5-feature-modules)
   - 5.1 [Chat](#51-chat)
   - 5.2 [Models](#52-models)
   - 5.3 [Onboarding](#53-onboarding)
   - 5.4 [Profile](#54-profile)
   - 5.5 [Tabs](#55-tabs)
6. [Infrastructure Layer](#6-infrastructure-layer)
   - 6.1 [LLM (llama.rn)](#61-llm-llamarn)
   - 6.2 [Whisper (STT)](#62-whisper-stt)
   - 6.3 [Downloads](#63-downloads)
   - 6.4 [Storage (SQLite + AsyncStorage)](#64-storage-sqlite--asyncstorage)
   - 6.5 [Device Capability](#65-device-capability)
7. [Core Layer - Ports, Types, DI](#7-core-layer--ports-types-di)
8. [Design System](#8-design-system)
9. [Navigation (expo-router)](#9-navigation-expo-router)
10. [State Management (MobX)](#10-state-management-mobx)
11. [LLM Pipeline - End to End](#11-llm-pipeline--end-to-end)
12. [Download Pipeline](#12-download-pipeline)
13. [Environment & Configuration](#13-environment--configuration)
14. [Build System (EAS)](#14-build-system-eas)
15. [Coding Conventions](#15-coding-conventions)
16. [Testing Strategy](#16-testing-strategy)
17. [Git Conventions](#17-git-conventions)
18. [Known Limitations](#18-known-limitations)
19. [Roadmap & Future Work](#19-roadmap--future-work)

---

## 1. Project Overview

LokalMind is an **iOS-first, offline-capable AI chat app** built with React Native and Expo. It runs open-weight LLMs (GGUF format) entirely on-device using [llama.rn](https://github.com/mybigday/llama.rn). No prompt ever leaves the phone for inference. The app includes:

- **Streaming chat** with multiple downloadable models
- **Whisper STT** (infrastructure wired, UI rolling out)
- **Clean Architecture** with strict layer separation
- **Apple Liquid Glass UI** (iOS 26+ native, expo-blur fallback)

### Tech Stack at a Glance

| Concern | Technology |
|---|---|
| Runtime | Expo SDK 54 · React Native 0.81 · React 19.1 |
| Navigation | expo-router v6 (file-based) |
| State | MobX 6 + mobx-react-lite |
| LLM inference | llama.rn ^0.11.3 (GGUF via llama.cpp) |
| STT | whisper.rn ^0.5.5 (Phase 3, stub only) |
| Database | expo-sqlite ~16 (WAL, FK ON) |
| Key-value | @react-native-async-storage/async-storage 2.2.0 |
| File system | expo-file-system ~19 (new API, not /legacy) |
| Glass UI | expo-glass-effect ~0.1.9 + expo-blur ~15 fallback |
| Animations | react-native-reanimated ~4 |
| Lists | @shopify/flash-list 2.0.2 |
| Fonts | Figtree, Instrument Serif, Bricolage Grotesque |

---

## 2. Quick Start

### Prerequisites

- macOS with Xcode 16+ installed
- Node.js 20+
- EAS CLI (`npm install -g eas-cli`) - only needed for cloud builds

### Steps

```bash
git clone https://github.com/Sandipan006/lokalmind-app.git
cd lokalmind-app

npm install

cp .env.example .env
# Fill in IOS_BUNDLE_IDENTIFIER (e.g. com.yourname.lokalmind)
# Everything else in .env.example works out of the box

# Build a development client (Expo Go is NOT supported - llama.rn needs native linking)
npx expo run:ios
```

> **Why not Expo Go?** `llama.rn` and `whisper.rn` are native modules that must be compiled into the binary. Expo Go only supports pure JS modules.

### Simulator vs Device

The app works on both simulator and device. Large models (4B) may be slow or fail on simulators due to RAM limits. The 0.8B Qwen model runs fine on simulator for development.

---

## 3. Repository Layout

```
lokalmind-app/
│
├── app/                          # expo-router routes (thin - zero business logic)
│   ├── _layout.tsx               # Root Stack: fonts, OTA updates, app-state listener
│   ├── index.tsx                 # Entry → SplashScreen
│   ├── onboarding/
│   │   ├── _layout.tsx           # Onboarding stack (no header)
│   │   ├── welcome.tsx           # Step 1: value prop
│   │   ├── username.tsx          # Step 2: display name entry
│   │   └── model-setup.tsx       # Step 3: first model download
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab navigator (NativeTabs)
│   │   ├── chat.tsx              # Chat history tab
│   │   ├── models.tsx            # Model browser tab
│   │   └── search.tsx            # Support tab
│   ├── chat/
│   │   └── [id].tsx              # Active chat session route
│   └── profile/
│       ├── ai-behavior.tsx       # Profile / account screen
│       ├── mode-system-prompts.tsx  # Per-mode system prompt editor
│       └── support.tsx           # Support / donate
│
├── src/
│   ├── core/
│   │   ├── constants/            # Shared constants (USER_AVATAR_COUNT)
│   │   ├── di/
│   │   │   └── container.ts      # Single composition root - DI wiring
│   │   ├── ports/                # App-level interfaces (ILLMEngine, IWhisperEngine, …)
│   │   └── types/                # Result<T>, AppError, ok(), err()
│   │
│   ├── config/
│   │   └── env.ts                # Runtime env via expo-constants
│   │
│   ├── design-system/
│   │   ├── components/           # GlassSurface, ErrorBoundary, PrimaryButton, NativeTabs
│   │   └── tokens/               # colors, typography, spacing, glass
│   │
│   ├── features/
│   │   ├── chat/                 # Chat sessions, messages, streaming, queue
│   │   ├── models/               # Model registry, downloads, browser UI
│   │   ├── onboarding/           # Splash, welcome, username screens
│   │   ├── profile/              # Settings, system prompts, data reset
│   │   └── tabs/                 # TabsTopHeader component + assets
│   │
│   ├── infrastructure/
│   │   ├── device/               # deviceCapability - RAM detection, n_ctx sizing
│   │   ├── downloads/            # DownloadService, modelConfig, types
│   │   ├── llm/                  # llamaRnAdapter (serial native-call queue)
│   │   ├── storage/              # sqliteDriver, asyncStorageDriver, localDataResetAdapter
│   │   └── whisper/              # whisperRnAdapter (stub, Phase 3)
│   │
│   ├── hooks/                    # (future shared hooks)
│   └── providers/
│       ├── useFontLoader.ts      # Loads all custom fonts at startup
│       └── useOtaUpdates.ts      # expo-updates OTA check on foreground
│
├── assets/                       # Static assets: fonts, images, splash
├── docs/                         # Typed docs: architecture/, development/, design/, product/, project/
├── scripts/                      # clearLocalData utility
│
├── app.config.ts                 # Expo config (reads from .env)
├── app.json                      # Static Expo config (plugins, iOS info.plist)
├── babel.config.js               # Expo preset + reanimated plugin
├── eas.json                      # EAS build profiles
├── eslint.config.js              # Flat ESLint config with layer import rules
└── tsconfig.json                 # Strict TypeScript (noUncheckedIndexedAccess etc.)
```

---

## 4. Architecture Deep Dive

LokalMind follows **Clean Architecture** with **Feature Modules**.

### Layer Rules (strictly enforced by ESLint)

```
Presentation   →   Use Cases   →   Domain entities
                       ↕
              Repository interfaces
                       ↕
           Data layer (implements repos)
                       ↕
         Infrastructure (llama.rn, SQLite…)
```

| Layer | Location | Rules |
|---|---|---|
| **Domain** | `features/*/domain/` | Zero third-party deps. Pure TypeScript. No MobX, no React. |
| **Presentation** | `features/*/presentation/` | Never imports from `infrastructure/`. Only calls use cases and repo interfaces. MobX allowed here only. |
| **Data** | `features/*/data/` | Implements repository interfaces. Receives infra via constructor. Never imported by presentation directly. |
| **Infrastructure** | `infrastructure/` | The ONLY layer that imports `llama.rn`, `whisper.rn`, `expo-sqlite`, `AsyncStorage`. Injected via DI container. |

### Composition Root

`src/core/di/container.ts` is the **single place** where infrastructure adapters are instantiated and injected into data repositories. Nothing outside `container.ts` creates infrastructure objects.

```typescript
// Instantiation order in container.ts:
const sqliteDriver = new SQLiteDriver();
const asyncStorageDriver = new AsyncStorageDriver();
const llmEngine = new LlamaRnAdapter();
const whisperEngine = new WhisperRnAdapter();
const downloadService = new DownloadService(asyncStorageDriver);

// … then lazy-init repositories via initializeContainer():
chatRepository = new ChatRepositoryImpl(sqliteDriver);
modelRepository = new ModelRepositoryImpl(downloadService, sqliteDriver);
// etc.
```

`initializeContainer()` is idempotent - safe to call multiple times, only runs once.

### Result Type Pattern

All use cases return `Result<T>` - they never throw.

```typescript
// src/core/types/Result.ts
type Result<T> = { success: true; data: T } | { success: false; error: AppError };

const ok  = <T>(data: T): Result<T> => ({ success: true, data });
const err = <E>(error: E) => ({ success: false, error });
```

ViewModels always handle both branches:

```typescript
const result = await sendMessageUseCase.execute(params);
runInAction(() => {
  if (!result.success) { this.error = result.error.message; return; }
  this.messages.push(result.data);
});
```

---

## 5. Feature Modules

### 5.1 Chat

**Location:** `src/features/chat/`

The most complex feature. Handles streaming inference, session management, message queue, reply threading, and regeneration.

#### Domain Entities

| Entity | File | Description |
|---|---|---|
| `ChatSession` | `domain/entities/ChatSession.ts` | id, modelId, title, isTitleLocked, lastTitleBucket |
| `ChatMessage` | `domain/entities/ChatMessage.ts` | role, content, status (sending/streaming/done/error), replyToMessageId, alternateContents |
| `ChatMode` | `domain/entities/ChatMode.ts` | `general \| coding \| creative \| marketing` |

#### Use Cases

| Use Case | Purpose |
|---|---|
| `CreateSessionUseCase` | Creates a new chat row in SQLite |
| `GetSessionUseCase` | Fetches a single session by ID |
| `GetMessagesUseCase` | Fetches all messages for a session |
| `SendMessageUseCase` | Saves user message, calls LLM, streams response |
| `RegenerateReplyUseCase` | Re-runs the last LLM turn, saves alternate in DB |
| `EditMessageUseCase` | Rewrites a past user message, deletes later messages |
| `GenerateChatTitleUseCase` | Uses LLM to auto-name session at turn buckets (1–4, 5–10, 15–20) |
| `UpdateSessionModelUseCase` | Switches the model for an existing session |
| `SearchChatsUseCase` | Full-text search across session titles and message content |

#### ChatViewModel - Key State

```typescript
messages: ChatMessage[]          // Full thread
session: ChatSession | null
streamingContent: string         // Live token buffer (never mutates messages during stream)
isStreaming: boolean
isModelLoading: boolean          // True from send → first token
pendingQueue: QueuedMessage[]    // FIFO queue (max 3) while LLM is busy
regeneratingMessageId: string | null
editingMessage: ChatMessage | null
replyTarget: MessageReplyDraft | null
```

#### Message Queue

While the LLM is generating, up to 3 user messages can be enqueued. They appear in `MessageQueueStrip`, can be edited or removed, and are sent FIFO after each turn completes. The queue is in-memory only.

#### Reply Threading (WhatsApp-style)

Swipe right on any bubble or long-press → Reply. Saves `replyToMessageId`, `replyPreview` (max 400 chars), `replyToRole` on the user message. The LLM sees a prefix like:

```
[Replying to an earlier assistant message:
"<preview>"]

<actual user message>
```

#### Regeneration

Long-press the last assistant bubble -> shows `RegenerateControls`. Each regeneration adds an entry to `message_alternates` (SQLite). The pager shows `1/N` and lets users flip versions. There is no hard-coded max regeneration cap in the current implementation.

#### System Prompt Resolution

```
Per-mode override (AsyncStorage) → if non-empty, use it
                                 → else use built-in MODE_SYSTEM_PROMPTS[mode]
```

Built-in prompts live in `domain/config/mode-prompts/`.

---

### 5.2 Models

**Location:** `src/features/models/`

Manages the catalog of downloadable GGUF models.

#### Domain Entity - `Model`

```typescript
interface Model {
  id: string;
  displayName: string;
  filename: string;              // GGUF filename on CDN
  sizeBytes: number;
  description: string;
  ramRequirement: string;        // Human-readable e.g. "3–4 GB"
  minRamBytes: number;           // Total device RAM threshold for compatibility check
  isPaid: boolean;
  isDownloaded: boolean;
  isCompatibleWithDevice: boolean;  // totalRam >= minRamBytes
}
```

#### Model Catalog (`src/infrastructure/downloads/modelConfig.ts`)

Six models currently registered:

| ID | Display Name | Size | Min RAM |
|---|---|---|---|
| `qwen3.5-0.8b` | Qwen 3.5 - 0.8B | ~524 MB | 2 GB |
| `qwen3.5-2b` | Qwen 3.5 - 2B | ~1.3 GB | 3 GB |
| `deepseek-r1-1.5b` | DeepSeek R1 - 1.5B | ~1.1 GB | 3 GB |
| `qwen3.5-4b` | Qwen 3.5 - 4B | ~2.8 GB | 5 GB |
| `qwen3-4b` | Qwen 3 - 4B | ~2.5 GB | 5 GB |
| `gemma3-4b` | Gemma 3 - 4B | ~2.5 GB | 5 GB |

Additional config: `WHISPER_CONFIG` (Whisper base, STT). `LEGACY_EMBEDDING_FILENAME` names the MiniLM file that older versions downloaded; it is deleted from devices at startup.

#### Use Cases

`StartDownloadUseCase`, `PauseDownloadUseCase`, `ResumeDownloadUseCase`, `CancelDownloadUseCase`, `DeleteDownloadedModelUseCase`, `GetAllModelsUseCase`, `SubscribeToDownloadProgressUseCase`.

#### Download Flow

1. `ModelSetupViewModel.startDownload(modelId)` calls `StartDownloadUseCase`
2. `ModelRepositoryImpl.startDownload()` resolves CDN URL from env, calls `DownloadService.startDownload()`
3. `DownloadService` creates a resumable `expo-file-system` download to `<filename>.part`, throttles progress updates, persists resume state in AsyncStorage
4. When the download ends, the HTTP status and the file length are checked (`downloadVerification.ts`); a bad file is deleted and the download fails
5. `finalizeDownload()` moves the `.part` file to its final name, then `markDownloaded()` writes the SQLite `models` row

---

### 5.3 Onboarding

**Location:** `src/features/onboarding/`

Three screens: **Welcome → Username → ModelSetup**.

`ResolveInitialRouteUseCase` decides the first route on every app launch:

```
onboarding NOT complete  →  /onboarding/welcome
onboarding complete:
  hasDownloadedModel     →  /chat/new
  hasAnyChats            →  /(tabs)/chat
  else                   →  /onboarding/model-setup
```

`SaveDisplayNameUseCase` trims the name (2–30 chars), assigns a random avatar index (1–21), and marks `onboarding_complete = 1` in SQLite.

---

### 5.4 Profile

**Location:** `src/features/profile/`

#### ProfileAccountScreen

- Shows user avatar (21 bundled PNGs, assigned randomly at onboarding), display name, "Member since" ring (SVG TextPath).
- Links to the AI behavior and System Prompts screens, GitHub, developer contact email.
- **Erase all data** - calls `ResetAllLocalDataUseCase` which unloads models, clears AsyncStorage, wipes all SQLite tables, and deletes all downloaded GGUF/bin files.

#### ModeSystemPromptsScreen

Horizontal chip row to select mode (General / Coding / Creative / Marketing). TextInput for custom system prompt. Reset clears the stored override (uses built-in default). Save writes to AsyncStorage key `settings:mode:<mode>:systemPrompt`.

#### SupportScreen

PayPal and "Other" payment links configured via `.env` (`SUPPORT_PAYPAL_URL`, `SUPPORT_OTHER_PAYMENT_URL`). Hidden when env vars are blank.

---

### 5.5 Tabs

**Location:** `src/features/tabs/`

`TabsTopHeader` renders the logo, a search icon (opens `ChatSearchModal` in a `Modal`), and the user avatar (taps to Profile). Lives outside the tab bar itself, mounted in `(tabs)/_layout.tsx` as a fixed header above the `NativeTabs` navigator.

`NativeTabs` wraps `@bottom-tabs/react-navigation`'s `createNativeBottomTabNavigator` via `withLayoutContext` from expo-router - gives native iOS tab bar appearance with SF Symbols.

---

## 6. Infrastructure Layer

### 6.1 LLM (llama.rn)

**File:** `src/infrastructure/llm/llamaRnAdapter.ts`

`LlamaRnAdapter` implements `ILLMEngine`. It is the **only** file in the codebase that imports `llama.rn`.

#### Key Behaviours

**Model loading (`initialize`)**
- Resolves GGUF file path from `expo-file-system` document directory
- Calls `resolveContextSize()` to compute a safe `n_ctx` based on device RAM
- Races against a 60-second timeout to prevent hangs on corrupt files
- Sets `ctx_shift: false` (avoids context corruption on some models), `n_gpu_layers: 99` (auto-capped by llama.cpp to what the device supports)

**Completion serialisation**
- `completionEnd: Promise<void>` is a chain lock - new completions wait for the previous to fully unwind before starting. This prevents "Context is busy" native errors.

**Stop tokens**
- Per-model stop tokens from `modelConfig.ts` are passed to `context.completion()`. Defaults: `['<|im_end|>', '</s>']`.

**`<think>` tag stripping**
- `stripThinkingTags()` removes DeepSeek R1's chain-of-thought blocks from the final response text before returning to the caller (the UI still shows them live via `ThinkBlock` in `MessageRenderer`).

**`isGenerating()`**
- `private generating = false` flag set true at generation start, false in `finally`. Used to avoid starting other work on a busy context.

---

### 6.2 Whisper (STT)

**File:** `src/infrastructure/whisper/whisperRnAdapter.ts`

Currently a stub - `initialize()` and `transcribe()` throw `TRANSCRIPTION_ERROR`. The `IWhisperEngine` interface is fully defined and the adapter skeleton is in place. Phase 3 work: implement `initWhisper()` from `whisper.rn`, wire mic permissions, hold-to-talk UI in `ChatInputBar`.

> **Note for contributors:** Adding `NSMicrophoneUsageDescription` to `app.json` must only happen when the mic feature ships.

---

### 6.3 Downloads

**Files:** `src/infrastructure/downloads/downloadService.ts`, `types.ts`, `modelConfig.ts`

`DownloadService` wraps `expo-file-system/legacy`'s `createDownloadResumable`.

**Features:**
- Start, pause, resume, cancel per model
- Rolling 8-sample window for speed/ETA smoothing
- Progress throttled to emit every 3 seconds during active download (prevents JS thread overload)
- Resume state persisted in AsyncStorage with key prefix `download_resume_<modelId>`
- `hydratePersistedStates()` called at app init to restore in-flight downloads after app kill
- External listener subscriptions (`subscribeToProgress`) survive navigation away and back

**Background / terminated-app behaviour:** iOS `UIBackgroundModes: [processing, fetch]` are registered. `expo-background-task` identifiers `com.lokalmind.download-continuation` and `com.lokalmind.download-check` are declared. Downloads using `NSURLSession` (via expo-file-system) continue in background. On relaunch, `hydratePersistedStates()` restores paused state and the user can manually resume.

---

### 6.4 Storage (SQLite + AsyncStorage)

#### SQLiteDriver (`src/infrastructure/storage/sqliteDriver.ts`)

Thin wrapper around `expo-sqlite`. Opens `lokalmind.db` with WAL journal mode and foreign keys ON. Provides `execute()`, `query<T>()`, and `transaction()`.

#### AsyncStorageDriver (`src/infrastructure/storage/asyncStorageDriver.ts`)

Wraps `@react-native-async-storage/async-storage` with a simple in-memory write cache. Typed helpers: `getString`, `setString`, `getNumber`, `getBoolean`, `getObject`.

**Key registry (`STORAGE_KEYS`):**

| Key | Purpose |
|---|---|
| `settings:mode:<mode>:systemPrompt` | Per-mode system prompt override |
| `download_resume_<modelId>` | Download resume state (managed by DownloadService) |

#### SQLite Schema (abbreviated)

```sql
chat_sessions       - id, model_id, title, is_title_locked, last_title_bucket
chat_messages       - id, session_id, role, content, status, created_at, reply_*
message_alternates  - id, message_id, content, seq   (regeneration history)
(session_summaries and session_memories exist from older versions; the app no longer uses them)
users               - id=1, display_name, avatar_index, onboarding_complete
models              - id, filename, is_downloaded, file_path
```

All tables are created lazily in repository `ensureInitialized()` methods with `CREATE TABLE IF NOT EXISTS`. Migration columns are added via `ALTER TABLE … ADD COLUMN` after checking `PRAGMA table_info`.

---

### 6.5 Device Capability

**File:** `src/infrastructure/device/deviceCapability.ts`

- `getTotalRamBytes()` - cached after first call. Falls back to 3 GB if native call fails.
- `getUsableRamBytes()` - total × 0.55 (conservative: OS + background apps consume ~1.5–2 GB).
- `resolveContextSize(modelWeightBytes, maxContextSize)` - computes safe `n_ctx` based on remaining RAM after subtracting model weights. KV cache estimated at ~500 bytes/token. Result rounded to the nearest power of 2, clamped to [2048, maxContextSize].

---

## 7. Core Layer - Ports, Types, DI

### Interfaces (Ports)

| Interface | File | Description |
|---|---|---|
| `ILLMEngine` | `ports/ILLMEngine.ts` | The only LLM contract. Implemented by `LlamaRnAdapter`. |
| `IWhisperEngine` | `ports/IWhisperEngine.ts` | The only STT contract. Implemented by `WhisperRnAdapter`. |
| `IAppSettingsRepository` | `ports/IAppSettingsRepository.ts` | Mode prompt overrides and other settings. |
| `ILocalDataReset` | `ports/ILocalDataReset.ts` | `resetAllLocalData()` - wipes everything. |

### Result Type

```typescript
type Result<T, E = AppError> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

const ok  = <T>(data: T): Result<T, never> => ({ success: true, data });
const err = <E>(error: E): Result<never, E> => ({ success: false, error });
```

### AppError Codes

`VALIDATION_ERROR` · `STORAGE_ERROR` · `MODEL_NOT_LOADED` · `MODEL_LOAD_FAILED` · `GENERATION_ERROR` · `GENERATION_CANCELLED` · `DOWNLOAD_FAILED` · `DOWNLOAD_PAUSED` · `TRANSCRIPTION_ERROR` · `NOT_FOUND` · `UNKNOWN_ERROR`

---

## 8. Design System

**Location:** `src/design-system/`

### Tokens

Never use raw hex values, font names, or pixel values in component files. Always import from tokens.

#### Colors (`tokens/colors.ts`)

```typescript
PRIMARY_ORANGE       = '#FF420B'   // CTAs, user bubbles, active states
BLACK_PRIMARY        = '#0F0F0F'   // Root background
CHAT_BACKGROUND_COLOR = '#1A1A1A' // Chat screen background
INPUT_BOX_COLOR      = '#2A2A2A'  // Input fields, cards
WHITE_PRIMARY        = '#FFFFFF'
TEXT_WHITE_60        = '#9E9E9E'   // Placeholder, captions
TEXT_WHITE_40        = '#6E6E6E'   // Disabled
ERROR_RED            = '#FF3B30'
SUCCESS_GREEN        = '#34C759'
```

#### Typography (`tokens/typography.ts`)

Fonts: **Figtree** (primary UI), **Instrument Serif** (display/accent), **Bricolage Grotesque** (secondary display).

```typescript
FONTS = {
  figtree:              { regular, medium, semiBold, bold, extraBold, black, light, italic, … }
  instrumentSerif:      { regular, italic }
  bricolageGrotesque:   { light, regular, medium, semiBold, bold, extraBold }
}

fontSizes = { xxs:10, xs:12, sm:14, md:16, lg:18, xl:20, xxl:24, xxxl:32, … }
```

The `typography` object provides semantic presets: `typography.heading.h1`, `typography.body.semiBold`, `typography.caption.small`, `typography.button.large`, etc.

#### Spacing (`tokens/spacing.ts`)

```typescript
spacing  = { xxxs:2, xxs:4, xs:8, sm:12, md:16, lg:20, xl:24, xxl:32, … }
borderRadius = { none:0, xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, full:9999 }
```

All values are normalised for the device screen width (base width: 393pt, iPhone 15).

#### Glass (`tokens/glass.ts`)

| Tier | Blur | Fallback BG | Usage |
|---|---|---|---|
| `ultra` | 40px | rgba(255,255,255,0.08) | Modals, overlays |
| `heavy` | 24px | rgba(255,255,255,0.12) | Cards, sidebars |
| `medium` | 16px | rgba(255,255,255,0.16) | Input bars, nav |
| `light` | 8px | rgba(255,255,255,0.20) | Highlights |

Tints: `default` (neutral) · `brand` (rgba(255,66,11,0.15) - orange-warmed, for active/selected states).

### GlassSurface Component

```tsx
import { GlassSurface } from '@/src/design-system/components';

// iOS 26+ → native UIVisualEffectView
// iOS < 26 → expo-blur BlurView
// No expo-glass-effect → plain View with rgba background

<GlassSurface tier="heavy" tint="brand" style={styles.card}>
  {children}
</GlassSurface>
```

**Rule:** Feature code must NEVER import `GlassView` or `BlurView` directly. All glass surfaces go through `GlassSurface`.

### Animations

Use `react-native-reanimated` **only**. Never `Animated` from `react-native`. Lottie only for splash and specific branded moments.

---

## 9. Navigation (expo-router)

All routes are file-based. No `@react-navigation` packages are imported in feature code.

```
/               → app/index.tsx         → SplashScreen
/onboarding/welcome
/onboarding/username
/onboarding/model-setup
/(tabs)/chat
/(tabs)/models
/(tabs)/search
/chat/[id]      → ChatScreen (with ChatViewModel)
/profile/ai-behavior
/profile/mode-system-prompts
/profile/support
```

### `app/` File Rules

- **Max 30 lines** per route file
- **Zero business logic** - only imports one Screen component
- **Default exports only** (expo-router requirement)
- No state, no use case calls, no repository calls

### `app/chat/[id].tsx` - The Exception

This route is slightly more complex because it must:
1. Await `container.initializeContainer()` before creating the ViewModel
2. Handle `id === 'new'` by creating a session and redirecting to its real ID
3. Resolve the preferred `modelId` query param
4. Load user display name for the ViewModel

All of this is route plumbing, not business logic, so it stays in the route file.

---

## 10. State Management (MobX)

ViewModels use MobX 6 with `makeAutoObservable`. All screens are wrapped with `observer()` from `mobx-react-lite`.

### ViewModel Template

```typescript
import { makeAutoObservable, runInAction } from 'mobx';

export class ExampleViewModel {
  data: Item[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private readonly useCase: SomeUseCase) {
    makeAutoObservable(this);  // ALWAYS first in constructor
  }

  async loadData() {
    this.isLoading = true;
    const result = await this.useCase.execute();
    runInAction(() => {           // ALL async state mutations in runInAction
      this.isLoading = false;
      if (!result.success) { this.error = result.error.message; return; }
      this.data = result.data;
    });
  }

  get hasData() { return this.data.length > 0; }  // computed = getter
}
```

### Hard Rules

1. `makeAutoObservable(this)` - always the **first statement** in constructor
2. Async mutations - always in `runInAction()`
3. Computed - getter syntax only, no `@computed` decorator
4. All screens reading VM state - must be wrapped with `observer()`
5. MobX only in `presentation/` - never in `domain/`, `data/`, `infrastructure/`
6. No `useState` / `useReducer` for state that belongs in a ViewModel

---

## 11. LLM Pipeline - End to End

When the user taps Send in `ChatInputBar`:

```
ChatInputBar.onSend()
  → ChatScreen.handleSend()
  → ChatViewModel.sendMessage()
    ├── if isStreaming: enqueue in pendingQueue → return
    └── ChatViewModel.runSendTurn(text, mode)
        ├── add the optimistic user bubble, set isStreaming and isModelLoading
        └── runStreamedTurn()             (shared by send, edit and regenerate)
            └── SendMessageUseCase.execute(params)
                ├── save userMessage + assistant placeholder (failure → return error)
                ├── llmEngine.initialize(modelId, config)  if not already loaded
                ├── fit the current message to the input limit
                ├── appSettings.getModeSystemPromptOverride(mode)
                ├── resolveSystemPromptForChat(mode, modeOverride)
                ├── buildContextMessages({ systemPrompt, history, currentMessage,
                │                          contextSize, reservedOutputTokens })
                ├── llmEngine.generateResponse(llmMessages, config, onToken, signal)
                │   └── streams tokens → onToken → ChatViewModel.streamingContent +=
                └── save final content (failure → return error)
        ├── runInAction: isStreaming=false, update messages with result.data
        ├── fire-and-forget: generateChatTitleUseCase.execute(...)
        └── flushNextQueuedAfterTurn()
```

See `docs/architecture/LLM-PIPELINE.md` for the full sequence and the native-call queue.

#### Token Debouncing

`ChatViewModel` accumulates tokens in `streamingContent` (MobX observable). The `StreamingBubble` component reads this and re-renders. No per-token `runInAction` - the observer re-renders are already batched by MobX's scheduler.

#### AbortSignal

Every `generateResponse()` call receives an `AbortSignal` from `AbortController`. `ChatViewModel.stopGeneration()` calls `abortController.abort()`. The adapter calls `context.stopCompletion()` on the signal's `abort` event. Partial content is preserved on abort.

#### Context Window Budget (tokenBudget.ts)

```
Hard prompt limit: min(3800, n_ctx - reserved output - 64)
├── System:   300   (capped)
├── History:  800   soft budget (oldest pairs cut, floor = 4 turns; the floor
│                   gives way when the hard limit would be exceeded)
└── Current message: cut by tokens to fit, and the user is told
```

`estimateTokens(text)` uses a single-pass codepoint scan: Indic = 1 char/token, CJK = 1.5, Arabic = 2, Latin = 4.

---

## 12. Download Pipeline

```
ModelSetupViewModel.startDownload(modelId)
  └── StartDownloadUseCase.execute(modelId, onProgress)
      └── ModelRepositoryImpl.startDownload(modelId, onProgress)
          ├── Resolve CDN URL: ${HETZNER_BASE_URL}/models/${modelId}/${filename}
          └── DownloadService.startDownload(config, onProgress)
              ├── createDownloadResumable(url, destinationPath, {}, callback)
              ├── Persist state to AsyncStorage
              └── resumable.downloadAsync()
                  ├── Every 3s: compute speed (8-sample rolling avg), emit progress
                  └── On complete: check HTTP status + length, clearPersistedState, delete from activeDownloads
          └── finalizeDownload(): move <file>.part into place, then markDownloaded()
              └── SQLite INSERT OR UPDATE models table
```

**Resume on relaunch:**

```
container.initializeContainer()
  └── downloadService.hydratePersistedStates()
      └── Reads all AsyncStorage keys matching "download_resume_*"
          └── Restores DownloadContext with status = 'paused'
              └── User sees "Resume" button in ModelCard
```

---

## 13. Environment & Configuration

### `.env` Variables

| Variable | Required | Description |
|---|---|---|
| `IOS_BUNDLE_IDENTIFIER` | Local builds | e.g. `com.yourname.lokalmind` |
| `EAS_PROJECT_ID` | EAS cloud builds only | From expo.dev dashboard |
| `APP_OWNER` | EAS cloud builds only | Expo username |
| `HETZNER_BASE_URL` | Downloads | CDN base URL (pre-filled in .env.example with public proxy) |
| `SUPPORT_PAYPAL_URL` | Optional | Hides PayPal button if blank |
| `SUPPORT_OTHER_PAYMENT_URL` | Optional | Hides Other button if blank |
| `GITHUB_REPO_URL` | Optional | Opens from Profile → GitHub card |
| `DEVELOPER_CONTACT_EMAIL` | Optional | Opens mailto: from Profile → Contact card |
| `CTX_SIZE_DEFAULT` | Default: 2048 | Fallback context size |
| `CHAT_MAX_TOKENS` | Default: 512 | Max tokens per generation |

### `app.config.ts`

Reads `.env` via `dotenv`, validates `IOS_BUNDLE_IDENTIFIER`. Throws (in production builds) or warns (dev/preview) if they are missing. Injects all variables into `expo.extra` for runtime access via `expo-constants`.

### `src/config/env.ts`

Runtime access point. Reads from `Constants.expoConfig.extra`. All feature code imports from here, never from `process.env`.

---

## 14. Build System (EAS)

### Profiles (`eas.json`)

| Profile | Distribution | Build image | Notes |
|---|---|---|---|
| `development` | internal | default | Dev client on device |
| `development-simulator` | internal | default | Dev client on simulator |
| `preview` | internal | default | Release-like, internal testers |
| `testflight` | store | macos-sequoia-15.5-xcode-26.0 | TestFlight submission |
| `production` | store | macos-sequoia-15.5-xcode-26.0 | App Store |

**EAS ignore (`.easignore`):** Excludes `.env`, `*.gguf`, `llm-models/`, `docs/`, `*.md`, `.cursor/`, `lokalmind-oldcode/`, test files.

### iOS Background Modes (`app.json`)

```json
"UIBackgroundModes": ["processing", "fetch"]
"BGTaskSchedulerPermittedIdentifiers": [
  "com.lokalmind.download-continuation",
  "com.lokalmind.download-check"
]
```

---

## 15. Coding Conventions

### Naming

| Type | Pattern | Example |
|---|---|---|
| Screen | `PascalCase + Screen.tsx` | `ChatScreen.tsx` |
| ViewModel | `PascalCase + ViewModel.ts` | `ChatViewModel.ts` |
| Use Case | `PascalCase + UseCase.ts` | `SendMessageUseCase.ts` |
| Repository Interface | `I + PascalCase + Repository.ts` | `IChatRepository.ts` |
| Repository Impl | `PascalCase + RepositoryImpl.ts` | `ChatRepositoryImpl.ts` |
| Infrastructure Adapter | `camelCase + Adapter.ts` | `llamaRnAdapter.ts` |
| Port Interface | `I + PascalCase.ts` | `ILLMEngine.ts` |
| Entity | `PascalCase.ts` | `ChatMessage.ts` |
| Hook | `use + camelCase.ts` | `useFontLoader.ts` |
| Route file | `lowercase-hyphen.tsx` | `mode-system-prompts.tsx` |
| Design token const | `SCREAMING_SNAKE_CASE` | `PRIMARY_ORANGE` |

### TypeScript

- Strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`
- No `any` (enforced by ESLint rule `@typescript-eslint/no-explicit-any: 'error'`)
- Use `import type` for all type-only imports
- Named exports only in `src/` - default exports only in `app/`

### Imports

Always use `@/` alias:
```typescript
import { PRIMARY_ORANGE } from '@/src/design-system/tokens/colors';  // ✅
import { PRIMARY_ORANGE } from '../../../design-system/tokens/colors'; // ❌
```

Order: React/RN → Expo → Third-party → Core/ports → Features → Design system.

### Logging

All `console.log` / `console.warn` in production code must be wrapped in `if (__DEV__)`. The ESLint rule `'no-console': ['warn', { allow: ['warn', 'error'] }]` enforces this.

### Async Patterns

- Every LLM generation: MUST accept `AbortSignal` - ViewModel MUST expose `cancelGeneration()`
- Download progress: throttled 250ms
- Background work after a turn (for example title generation): fire-and-forget with `.catch(() => undefined)`, never awaited in the main pipeline
- Never `await` inside MobX `reaction` or `autorun`

---

## 16. Testing Strategy

Tests co-locate with source files:

```
SendMessageUseCase.ts
SendMessageUseCase.test.ts    ← same directory
```

### What Must Be Tested

- **Every UseCase** - no exceptions
- **Every ViewModel** - initial state, each action, computed, async success + failure

### Mock at the Interface Boundary

```typescript
// ✅ Mock the interface
class MockChatRepository implements IChatRepository {
  saveMessage = jest.fn().mockResolvedValue(ok(undefined));
}

// ❌ Mock the concrete implementation
jest.mock('expo-sqlite');
```

### PR Requirements

- New UseCase → must ship with tests
- New ViewModel → must ship with tests
- Bug fix → must include a regression test

---

## 17. Git Conventions

### Commit Format

```
DD/MM/YYYY - [description] - #N
```

Examples:
```
15/04/2026 - Add GlassSurface with expo-blur fallback - #1
15/04/2026 - Add ChatViewModel · SendMessageUseCase · IChatRepository - #2
15/04/2026 - Phase 1: LLM pipeline - #3

· Add llamaRnAdapter implementing ILLMEngine
· Add model download with resumable support
· Add streaming token debounce in ChatViewModel
```

- **Date:** DD/MM/YYYY
- **Serial number:** `#N` - unique, incrementing across entire history
- **Never commit to `main`** - always branch + PR
- **Stage everything:** `git add -A` - never cherry-pick files

### Branch Naming

```
feature/<name>      new feature
fix/<name>          bug fix
refactor/<name>     no behaviour change
docs/<name>         documentation
phase/<number>      phase-level branch
```

---

## 18. Known Limitations

See [KNOWN-LIMITATIONS.md](../project/KNOWN-LIMITATIONS.md) for community-trackable issues.

**No memory between chats** - each chat starts fresh; a memory feature was removed because its quality was not good enough.

**Small model answer quality variance** - 0.8B models produce inconsistent quality on nuanced, multi-step prompts. Expected behaviour at this model size.

**Context window on low-RAM devices** - `resolveContextSize()` dynamically shrinks `n_ctx` on low-RAM devices. Very old or constrained devices may get a 2048-token context, which can cause earlier truncation of long conversations.

**Simulator performance** - Large models (4B GGUF) may run slowly or fail on simulators due to simulated RAM limits.

---

## 19. Roadmap & Future Work

See [NEXT-DEVELOPMENT.md](./NEXT-DEVELOPMENT.md) for detailed upcoming work.

### v2.1 (Post-launch)
- **Voice input (STT):** Full hold-to-talk UI wired to `whisperRnAdapter`. Requires `NSMicrophoneUsageDescription` in `app.json`.
- **Tool use:** Calendar/Reminders access via EventKit
- **Android support:** Planned first-class Android target. `DownloadService` already uses `useLegacyPackaging: false`. `GlassSurface` falls back to `expo-blur` on Android.
- **BYOM (Bring Your Own Model):** User-supplied GGUF files

### v2.2 (Future)
- **On-device TTS:** English + Hindi via `expo-speech`, Indic languages via AI4Bharat `indic-parler-tts`
- **Image/document attachments:** VisionKit / ML Kit OCR. Requires `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription`.
- **Share/export chats:** PDF and Markdown export

### Architecture Notes for Android
- `container.ts` has `android` blocks commented out (not deleted) ready for activation
- `AppSettingsRepositoryImpl` stores no Android-specific keys yet
- `WhisperRnAdapter` will need `RECORD_AUDIO` permission plumbing

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for setup instructions and code style. See [SECURITY.md](../project/SECURITY.md) for vulnerability reporting.

By submitting a pull request you agree your contribution will be licensed under the [MIT License](../../LICENSE).

---

*Last updated: April 2026 - LokalMind v2*