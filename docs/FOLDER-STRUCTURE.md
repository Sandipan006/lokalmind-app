# LokalMind v2 — Folder Structure, DI, Dependencies & Build Phases

---

## Folder Tree

```
lokalmind-app/
├── app/                              ← expo-router file routes (thin entry points only, max 30 lines each)
│   ├── _layout.tsx                   ← Root stack. Font + notification init.
│   ├── index.tsx                     ← Splash → onboarding decision
│   ├── onboarding/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx               ← Step 1: value prop + Get Started CTA
│   │   ├── username.tsx              ← Step 2: name entry
│   │   └── model-setup.tsx           ← Step 3: RAM detection + first model download
│   ├── (tabs)/
│   │   ├── _layout.tsx               ← Bottom tab navigator
│   │   ├── chat.tsx                  ← Chat list / new chat entry
│   │   ├── models.tsx                ← Model browser tab
│   │   └── profile.tsx               ← Profile tab
│   ├── chat/
│   │   └── [id].tsx                  ← Individual chat session (ChatScreen)
│   ├── model/
│   │   └── [id].tsx                  ← Model detail + download
│   └── profile/
│       ├── ai-behavior.tsx           ← System prompt + AI modes editor
│       ├── storage.tsx               ← Storage usage breakdown
│       └── support.tsx               ← Help + feedback + GitHub link
│
├── src/
│   ├── core/                         ← Shared across all features
│   │   ├── ports/
│   │   │   ├── ILLMEngine.ts         ← LLM engine interface (see LLM-PIPELINE.md)
│   │   │   └── IWhisperEngine.ts     ← Whisper engine interface (see LLM-PIPELINE.md)
│   │   ├── entities/                 ← Shared base types (if any)
│   │   └── di/
│   │       └── container.ts          ← Dependency injection container (single composition root)
│   │
│   ├── features/
│   │   ├── chat/
│   │   │   ├── presentation/
│   │   │   │   ├── screens/          ← ChatScreen, ChatListScreen
│   │   │   │   ├── viewmodels/       ← ChatViewModel
│   │   │   │   └── components/       ← MessageBubble, InputBar, Sidebar, CodeBlock, etc.
│   │   │   ├── domain/
│   │   │   │   ├── entities/         ← Chat, Message
│   │   │   │   ├── repositories/     ← IChatRepository, IMessageRepository
│   │   │   │   └── usecases/         ← SendMessageUseCase, GetChatsUseCase, DeleteChatUseCase,
│   │   │   │                            BuildPromptUseCase, ResolveSystemPromptUseCase,
│   │   │   │                            EnsureModelLoadedUseCase, FinalizeMessageUseCase
│   │   │   └── data/
│   │   │       ├── repositories/     ← ChatRepositoryImpl, MessageRepositoryImpl
│   │   │       └── services/         ← chatService.ts (SQLite facade)
│   │   │
│   │   ├── models/
│   │   │   ├── presentation/
│   │   │   │   ├── screens/          ← ModelBrowserScreen, ModelDetailScreen
│   │   │   │   ├── viewmodels/       ← ModelBrowserViewModel, ModelManagementViewModel
│   │   │   │   └── components/       ← ModelCard, DownloadProgress, StorageBar
│   │   │   ├── domain/
│   │   │   │   ├── entities/         ← Model, ModelMetadata, DownloadState
│   │   │   │   ├── repositories/     ← IModelRepository
│   │   │   │   └── usecases/         ← DownloadModelUseCase, PauseDownloadUseCase,
│   │   │   │                            ResumeDownloadUseCase, DeleteModelUseCase,
│   │   │   │                            SetActiveModelUseCase, GetDeviceRAMUseCase
│   │   │   └── data/
│   │   │       ├── repositories/     ← ModelRepositoryImpl
│   │   │       └── services/         ← modelStorage.ts, downloadService.ts
│   │   │
│   │   ├── profile/
│   │   │   ├── presentation/
│   │   │   │   ├── screens/          ← ProfileScreen, AIBehaviorScreen, StorageScreen, SupportScreen
│   │   │   │   ├── viewmodels/       ← ProfileViewModel
│   │   │   │   └── components/       ← AvatarPicker, ContextWindowSlider, ModePromptEditor
│   │   │   ├── domain/
│   │   │   │   ├── entities/         ← User, UserSettings, AIMode
│   │   │   │   ├── repositories/     ← IUserRepository, ISettingsRepository
│   │   │   │   └── usecases/         ← UpdateProfileUseCase, SetGlobalSystemPromptUseCase,
│   │   │   │                            SetModePromptUseCase, SetContextWindowUseCase
│   │   │   └── data/
│   │   │       └── repositories/     ← UserRepositoryImpl, SettingsRepositoryImpl
│   │   │
│   │   └── memory/
│   │       ├── presentation/
│   │       │   ├── screens/          ← MemoryScreen
│   │       │   ├── viewmodels/       ← MemoryViewModel
│   │       │   └── components/       ← MemoryFactCard, MemoryToast
│   │       ├── domain/
│   │       │   ├── entities/         ← MemoryFact
│   │       │   ├── repositories/     ← IMemoryRepository
│   │       │   └── usecases/         ← GetMemoryFactsUseCase, MemoryExtractionUseCase,
│   │       │                            AddMemoryFactUseCase, DeleteMemoryFactUseCase,
│   │       │                            ClearAllMemoryUseCase
│   │       └── data/
│   │           └── repositories/     ← MemoryRepositoryImpl
│   │
│   ├── infrastructure/               ← Third-party adapters (injected, never imported globally)
│   │   ├── llm/
│   │   │   ├── llamaRnAdapter.ts     ← Implements ILLMEngine using llama.rn
│   │   │   └── modelUtils.ts         ← Load/unload helpers, GGUF path resolution
│   │   ├── whisper/
│   │   │   └── whisperRnAdapter.ts   ← Implements IWhisperEngine using whisper.rn
│   │   ├── storage/
│   │   │   ├── sqliteDriver.ts       ← expo-sqlite wrapper (WAL, migrations)
│   │   │   └── asyncStorageDriver.ts ← AsyncStorage wrapper with in-memory cache
│   │   └── downloads/
│   │       ├── downloadService.ts    ← Resumable GGUF downloads from Hetzner CDN
│   │       ├── modelConfig.ts        ← GGUF model registry + CDN URLs
│   │       └── types.ts
│   │
│   └── design-system/
│       ├── tokens/
│       │   ├── colors.ts             ← All color constants (see DESIGN-SYSTEM.md)
│       │   ├── typography.ts         ← Font family + size scale
│       │   ├── glass.ts              ← Glass tier definitions
│       │   └── spacing.ts            ← Spacing + border radius scale
│       └── components/
│           ├── GlassSurface.tsx      ← Wraps expo-glass-effect with expo-blur fallback
│           └── index.ts
│
├── docs/                             ← Technical documentation
│   ├── ARCHITECTURE.md               ← Overview + layer rules
│   ├── FOLDER-STRUCTURE.md           ← This file
│   ├── DATA-MODEL.md                 ← SQLite schema, AsyncStorage keys, model registry
│   ├── LLM-PIPELINE.md               ← LLM interfaces, chat pipeline, memory, Whisper
│   ├── DESIGN-SYSTEM.md              ← Liquid Glass, tokens, navigation
│   └── FEATURES.md                   ← Feature showcase
├── .cursor/
│   └── rules/                        ← Cursor enforcement rules (architecture, naming, mobx, design-system)
├── app.json
├── package.json
└── tsconfig.json
```

---

## Dependency Injection Container

`src/core/di/container.ts` is the **single composition root**. All infrastructure adapters are instantiated here and injected downward via constructors. Nothing outside this file instantiates infrastructure adapters.

```
container.ts
  ├── new SQLiteDriver()                    → expo-sqlite wrapper
  ├── new AsyncStorageDriver()              → AsyncStorage wrapper
  ├── new LlamaRnAdapter()                  → implements ILLMEngine
  ├── new WhisperRnAdapter()                → implements IWhisperEngine
  ├── new DownloadService()
  ├── new ChatRepositoryImpl(sqliteDriver)
  ├── new MessageRepositoryImpl(sqliteDriver)
  ├── new MemoryRepositoryImpl(sqliteDriver)
  ├── new ModelRepositoryImpl(asyncStorageDriver)
  ├── new UserRepositoryImpl(asyncStorageDriver)
  └── new SettingsRepositoryImpl(asyncStorageDriver)
```

ViewModels receive use cases via constructor. Use cases receive repository interfaces via constructor. **No singleton service locators.**

---

## Dependencies to Add

Beyond the base `create-expo-app` scaffold:

```bash
# Expo-managed (use npx expo install for correct version pinning)
npx expo install expo-glass-effect
npx expo install expo-blur
npx expo install expo-sqlite
npx expo install expo-notifications
npx expo install expo-av
npx expo install expo-file-system
npx expo install @react-native-async-storage/async-storage
npx expo install lottie-react-native
npx expo install react-native-device-info
npx expo install @shopify/flash-list

# npm-managed
npm install mobx mobx-react-lite
npm install llama.rn
npm install whisper.rn
npm install react-native-purchases
npm install react-native-svg
```

---

## Build Phases

| Phase | Target | Scope |
|---|---|---|
| **Phase 0** | Current | Scaffold reset, design system tokens, `ILLMEngine` + `IWhisperEngine` interfaces, DI container skeleton, cursor rules |
| **Phase 1** | Week 3–5 | `llamaRnAdapter`, model download + management, GGUF loading, streaming chat, message queue |
| **Phase 2** | Week 6–8 | Full chat UI (FlashList, reply-to-message, swipe gestures), chat history, onboarding, `GlassSurface` components |
| **Phase 3** | Week 9–10 | Whisper STT pipeline, profile screen, AI modes, memory pipeline, RevenueCat IAP |
| **Phase 4** | Week 11–12 | Polish, performance profiling, App Store submission, GitHub public release |
| **v2.1** | Post-launch | Android support, BYOM (Bring Your Own Model), RAG pipeline |
| **v2.2** | Future | On-device TTS — English + Hindi via `expo-speech`, Indic languages via AI4Bharat `indic-parler-tts` |
