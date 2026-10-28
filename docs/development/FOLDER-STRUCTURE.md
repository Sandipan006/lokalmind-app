# LokalMind v2 - Folder Structure, DI, Dependencies & Build Phases

---

## Folder Tree

```
lokalmind-app/
├── app/                              ← expo-router route layer
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── onboarding/                   ← welcome / username / model setup
│   ├── (tabs)/                       ← chat / models / search tabs
│   ├── chat/[id].tsx                 ← active chat session
│   ├── model/[id].tsx                ← model detail
│   └── profile/                      ← support / storage / mode prompts / memory
│
├── src/
│   ├── core/
│   │   ├── ports/                    ← app-level interfaces
│   │   ├── types/                    ← Result, error helpers
│   │   └── di/container.ts           ← single composition root
│   ├── config/                       ← env + runtime config
│   ├── features/
│   │   ├── chat/
│   │   ├── models/
│   │   ├── onboarding/
│   │   ├── profile/
│   │   ├── memory/
│   │   └── tabs/
│   ├── infrastructure/
│   │   ├── llm/                      ← llama + embedding adapters
│   │   ├── whisper/                  ← whisper adapter
│   │   ├── downloads/                ← resumable downloads + model registry
│   │   ├── device/                   ← RAM/context sizing helpers
│   │   └── storage/                  ← sqlite + AsyncStorage + reset utilities
│   ├── design-system/
│   └── hooks/
│
├── docs/
│   ├── architecture/             ← system design, data model, LLM pipeline
│   ├── development/              ← developer guide, conventions, folder structure, roadmap
│   ├── design/                     ← design system
│   ├── product/                  ← features, tasks, public overview
│   └── project/                  ← known limitations, security
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
  ├── new DownloadService(asyncStorageDriver)
  ├── new EmbeddingService()
  ├── new ChatRepositoryImpl(sqliteDriver)
  ├── new MemoryRepositoryImpl(sqliteDriver)
  ├── new ModelRepositoryImpl(downloadService, sqliteDriver, embeddingService)
  ├── new UserRepositoryImpl(sqliteDriver)
  ├── new AppSettingsRepositoryImpl(asyncStorageDriver)
  └── new LocalDataResetAdapter(...)
```

ViewModels receive use cases via constructor. Use cases receive repository interfaces via constructor. **No singleton service locators.**

---

## Runtime Dependencies (Current Highlights)

Current app runtime dependencies include:

```bash
expo-router, expo-sqlite, expo-file-system, expo-glass-effect, expo-blur, expo-haptics,
expo-notifications, @shopify/flash-list, @react-native-async-storage/async-storage,
mobx, mobx-react-lite, llama.rn, whisper.rn, react-native-svg.
```

---

## Build Phases

| Phase | Target | Scope |
|---|---|---|
| **Phase 0** | Current | Scaffold reset, design system tokens, `ILLMEngine` + `IWhisperEngine` interfaces, DI container skeleton, cursor rules |
| **Phase 1** | Week 3–5 | `llamaRnAdapter`, model download + management, GGUF loading, streaming chat, message queue |
| **Phase 2** | Week 6–8 | Full chat UI (FlashList, reply-to-message, swipe gestures), chat history, onboarding, `GlassSurface` components |
| **Phase 3** | Week 9–10 | Whisper STT pipeline, profile screen, AI modes, memory pipeline |
| **Phase 4** | Week 11–12 | Polish, performance profiling, App Store submission, GitHub public release |
| **v2.1** | Post-launch | Android support, BYOM (Bring Your Own Model), RAG pipeline |
| **v2.2** | Future | On-device TTS - English + Hindi via `expo-speech`, Indic languages via AI4Bharat `indic-parler-tts` |
