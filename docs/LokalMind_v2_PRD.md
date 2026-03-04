  
**LokalMind**

Product Requirements Document  ·  v2.0

***Your mind. Your device. No cloud.***

| Document Version | 2.3.0 |
| :---- | :---- |
| **Status** | Draft — In Review |
| **Author** | Sandipan |
| **Date** | March 2025 |
| **Platform** | iOS (Android — Phase 2\) |
| **License** | Open Source (MIT) |

# **1\.  Executive Summary**

LokalMind is a privacy-first, open-source mobile AI assistant that runs large language models entirely on-device — no cloud, no subscriptions, no data leaving the phone. Every conversation, every inference, every thought stays local.

v2 is a complete rewrite from scratch. It replaces the v1 codebase with a clean architecture, a proper design system built around Apple's Liquid Glass aesthetic, and a significantly improved LLM pipeline powered by llama.rn with GGUF model support.

The product targets privacy-conscious individuals, developers, students, and power users who want the capability of a frontier AI assistant without the compromise of cloud dependency.

# **2\.  Problem Statement**

## **2.1  The Privacy Gap**

Every major AI assistant today — ChatGPT, Gemini, Claude, Copilot — sends your prompts, context, and data to remote servers. Users have no control over how that data is stored, used, or shared. For sensitive conversations (health, finance, personal life, code), this is an unacceptable trade-off.

## **2.2  The Cost Gap**

Premium AI subscriptions cost $20–$200/month. For users in Tier 2–3 markets — India, Southeast Asia, Latin America, Eastern Europe — these prices are prohibitive. A free, on-device alternative with no recurring cost changes the equation entirely.

## **2.3  The Technical Gap**

Existing on-device LLM apps are either too technical (requiring terminal setup), too limited (locked to one model), or too ugly to use daily. There is no polished, open-source, multi-model AI app that feels like it belongs on iOS.

# **3\.  Vision & Goals**

## **3.1  Product Vision**

LokalMind becomes the default on-device AI app for users who care about privacy — the way Signal became the default for users who care about messaging security.

## **3.2  v2 Release Goals**

* Ship a complete, production-ready iOS app built on Expo 54 / React Native 0.81 / React 19\.

* Implement Clean Architecture \+ Feature Modules for long-term maintainability and open-source contribution.

* Deliver a Liquid Glass design system as a first-class design primitive, not a cosmetic afterthought.

* Support 5 GGUF models at launch with automatic device-based model recommendations.

* Achieve sub-2s model load time for 0.8B models on iPhone 12 and above.

* Open-source the codebase on GitHub with full documentation for contributors.

# **4\.  Target Users**

## **4.1  Primary Personas**

| Persona | Description | Core Need |
| ----- | ----- | ----- |
| **The Privacy Seeker** | Conscious of data privacy. Avoids cloud AI for sensitive queries. Researcher, journalist, or professional. | AI capability with zero data exposure. Offline-first. |
| **The Budget User** | Student or early-career professional in Tier 2–3 markets. Can't justify $20/month for ChatGPT Plus. | Free, capable AI. Works offline. Fast enough on a mid-range phone. |
| **The Developer** | React Native or iOS developer curious about on-device AI. Wants to explore or contribute to an open-source project. | Clean, navigable codebase. Good architecture. Contribution docs. |
| **The Power User** | Tech-savvy user who wants control. Wants to pick their model, tweak system prompts, manage context windows. | Model switching, custom system prompts, context window control. |

# **5\.  Model Lineup**

All models are distributed in GGUF format, downloaded from Hugging Face or a self-hosted Hetzner CDN. The app recommends a model based on available device RAM, detected at runtime via react-native-device-info.

| Model | File Size | Params | Best For | Device Tier |
| ----- | :---: | :---: | ----- | :---: |
| **Qwen 3.5 0.8B Q4** | \~500 MB | 0.8B | Fast responses, low-RAM devices, quick tasks | iPhone 12+, 3GB+ RAM |
| **Qwen 3.5 2B Q4** | \~1.2 GB | 2B | Balanced quality \+ speed, everyday use | iPhone 13+, 4GB+ RAM |
| **Qwen 3.5 4B Q4\_K\_M** | \~2.5 GB | 4B | High quality, complex reasoning, writing | iPhone 15 Pro+, 6GB+ RAM |
| **Gemma 3 4B Q4\_K\_M** | \~2.5 GB | 4B | Coding, structured tasks, analytical queries | iPhone 15 Pro+, 6GB+ RAM |
| **DeepSeek R1 1.5B Q4** | \~900 MB | 1.5B | Step-by-step reasoning, math, logic chains | iPhone 13+, 4GB+ RAM |

## **5.2  Multilingual Support**

Model language capability is a key differentiator for LokalMind's target markets in India and other multilingual regions.

| Model | English | Hindi | Tamil / Telugu | Other Indian |
| ----- | :---: | :---: | :---: | ----- |
| **Qwen 3.5 (all sizes)** | Excellent | Excellent | Good | 119 languages natively |
| **Gemma 3 4B** | Excellent | Good | Good | \~140 languages |
| **DeepSeek R1 1.5B** | Excellent | Fair | Poor | Primarily EN \+ ZH |
| **Whisper base (STT)** | Excellent | Good | Good | 99 languages auto-detect |

Model recommendation logic: The app reads device RAM at first launch and pre-selects the highest quality model that fits within 60% of available RAM to preserve system stability.

# **6\.  Feature Requirements**

## **6.1  Priority Legend**

* P0 — Must ship at launch. App is non-functional without it.

* P1 — Core experience. Ships in v2.0.

* P2 — Important but deferrable to v2.1 or v2.2.

## **6.2  Feature Table**

| Feature | Description | Priority | Effort |
| ----- | ----- | :---: | :---: |
| **CHAT** |  |  |  |
| **Streaming chat** | Token-by-token streaming from llama.rn with debounced UI updates | **P0** | M |
| **Multi-turn conversation** | Full conversation history sent as context on each turn | **P0** | S |
| **Chat history** | All sessions persisted in SQLite. Resume any past conversation. | **P0** | M |
| **Chat management** | Rename, delete, clear individual or all chats | **P1** | S |
| **Image input** | Attach photo from camera or library for vision-capable models | **P1** | L |
| **Code blocks** | Syntax-highlighted, copyable code blocks in AI responses | **P1** | S |
| **Markdown rendering** | Full markdown support in AI responses | **P1** | S |
| **Message actions** | Long-press to copy, regenerate, or delete a message | **P1** | S |
| **Reply to message** | Swipe-to-reply on any message (user or AI). Quoted bubble shown in input bar and included in AI context so the model understands what is being referenced. | **P1** | M |
| **Message queue** | If a generation is in progress, new sends are queued and processed sequentially. No dropped messages. Queue indicator shown in input bar. | **P1** | M |
| **Voice input (Whisper)** | Hold-to-record mic button in input bar. On-device transcription via whisper.rn (base model, 142MB). No audio leaves the device. Transcribed text inserted into input field for review before sending. | **P1** | L |
| **Export chat** | Export conversation as plain text or Markdown file | **P2** | S |
| **VOICE (STT ONLY — TTS PLANNED v2.2)** |  |  |  |
| **Whisper model download** | whisper.rn base model (142MB) downloaded separately. Multilingual — supports 99 languages including Hindi, Tamil, Telugu, Bengali. Shown in Model Management screen. | **P1** | M |
| **Recording UI** | Hold-to-record button with animated waveform. Release to transcribe. Tap X to cancel. | **P1** | M |
| **Transcription review** | Transcribed text is editable in input bar before sending. User can correct before submitting. | **P1** | S |
| **Language auto-detect** | Whisper base auto-detects spoken language — user does not need to configure this. | **P1** | S |
| **MODELS** |  |  |  |
| **Model download** | Download GGUF models from Hetzner CDN with progress, speed, ETA | **P0** | L |
| **Resumable downloads** | Pause, resume, and recover interrupted downloads | **P0** | L |
| **Model switching** | Switch active model between chats. Auto-unload previous. | **P0** | M |
| **Device RAM detection** | Auto-recommend best model for device at onboarding | **P1** | S |
| **Model management** | View downloaded models, storage used, delete models | **P1** | S |
| **BYOM (Bring Your Own Model)** | Load any .gguf file from device Files app | **P2** | M |
| **PROFILE & SETTINGS** |  |  |  |
| **User profile** | Display name, avatar (predefined set or camera) | **P1** | S |
| **Global custom system prompt** | User writes a global system prompt applied to all chats by default. Editable anytime from Profile → AI Behavior. | **P1** | M |
| **Per-session system prompt** | User can set a custom system prompt for any specific chat session. Overrides the global prompt for that session only. Editable from chat header menu. | **P1** | M |
| **Context window control** | User-adjustable context window size (512 to 4096 tokens) | **P1** | S |
| **AI modes** | Pre-built prompt modes: General, Coding, Creative, Deep Think. Each mode has a default system prompt the user can override. | **P1** | M |
| **Haptic feedback** | Contextual haptics on send, load complete, error | **P2** | S |
| **Notifications** | Optional daily reminder nudge to use the app | **P2** | S |
| **MEMORY** |  |  |  |
| **Persistent global memory** | Facts about the user (name, preferences, habits) are stored in SQLite and injected into every chat's system prompt. Survives app restarts and new sessions. | **P1** | L |
| **Auto memory extraction** | After every 5 user messages, the LLM silently reviews the exchange and extracts new facts. Deduplicates against existing memory before saving. | **P1** | L |
| **Memory updated nudge** | A subtle non-blocking toast appears when global memory is updated: 'Memory updated'. Does not interrupt the conversation. | **P1** | S |
| **Manual memory management** | User can view all stored memory facts in Profile → Memory. Add new facts manually, edit existing ones, or delete individual facts. | **P1** | M |
| **Per-session memory context** | Within a session, the full conversation history acts as in-context memory. The LLM recalls everything said earlier in the same chat. | **P0** | S |
| **Memory privacy controls** | User can clear all global memory in one tap. Individual facts can be deleted. Memory can be fully disabled per-session or globally. | **P1** | S |
| **MONETISATION** |  |  |  |
| **Free tier** | Full app, 2 models downloadable, all core features | **P0** | S |
| **Pro IAP (one-time)** | Unlock all models, BYOM, custom themes via RevenueCat | **P1** | M |
| **Tip jar** | Optional one-time tip to support open-source dev | **P2** | S |

# **7\.  Technical Architecture**

## **7.1  Tech Stack**

| Layer | Technology |
| ----- | ----- |
| **Runtime** | Expo SDK 54  ·  React Native 0.81  ·  React 19.1  ·  New Architecture |
| **Navigation** | expo-router v6 (file-based, stack \+ tabs) |
| **State Management** | MobX 6 \+ mobx-react-lite  (thin ViewModels only) |
| **LLM Engine** | llama.rn ^0.7.0  (GGUF inference via llama.cpp) |
| **Database** | expo-sqlite \~16.0.8  (chat history, WAL mode) |
| **Key-Value Store** | @react-native-async-storage/async-storage 2.2.0 |
| **File System** | expo-file-system \~19.0.17  (new API, not /legacy) |
| **Animations** | react-native-reanimated  ·  lottie-react-native |
| **Gestures** | react-native-gesture-handler |
| **Monetisation** | react-native-purchases (RevenueCat) |
| **Lists** | @shopify/flash-list 2.0.2 |
| **Notifications** | expo-notifications \~0.32.12 |
| **Fonts** | expo-font  ·  Figtree family |
| **Icons** | react-native-svg \+ custom SVG icon set |
| **Voice / STT** | whisper.rn  (on-device Whisper base model, .bin format, 142MB) |
| **Device Info** | react-native-device-info (RAM detection) |

## **7.2  Architecture Pattern**

LokalMind v2 follows Clean Architecture \+ Feature Modules. The codebase is organized by feature (chat, models, profile), with each feature owning its presentation, domain, and data layers. Shared infrastructure (LLM bridge, storage drivers, download service) lives in a dedicated infrastructure/ layer.

### **Layering Rules (strictly enforced)**

* Presentation layer (screens, ViewModels, components) never imports from infrastructure directly.

* Domain layer (entities, use cases, repository interfaces) has zero third-party dependencies.

* Data layer implements domain interfaces — ViewModels never know SQLite or AsyncStorage exist.

* Infrastructure layer is injected into data repositories via constructor — never imported globally.

* The LLM engine is abstracted behind ILLMEngine interface — llama.rn is swappable.

### **Folder Structure**

src/  core/                  ← shared entities, DI container, base ViewModel  features/    chat/      presentation/      ← ChatScreen, ChatViewModel      domain/            ← SendMessageUseCase, ResolveSystemPromptUseCase, IMessageRepository      data/              ← MessageRepositoryImpl, chatService    models/    profile/    memory/      presentation/      ← MemoryScreen, MemoryViewModel      domain/            ← GetMemoryFactsUseCase, MemoryExtractionUseCase, IMemoryRepository      data/              ← MemoryRepositoryImpl  infrastructure/    llm/                 ← ILLMEngine interface \+ llamaRnAdapter    whisper/             ← IWhisperEngine interface \+ whisperRnAdapter    storage/             ← SQLite driver, AsyncStorage driver    downloads/           ← model download service  design-system/         ← tokens, Liquid Glass components, typographyapp/                     ← expo-router file routes

# **8\.  Design System — Liquid Glass**

LokalMind v2 adopts Apple's Liquid Glass design language as its primary visual system. This is not a cosmetic layer — it is the design foundation from which all components are built.

## **8.1  Core Principles**

* Translucency over opacity — surfaces reveal depth through blur, not flat color.

* Light adapts to context — tints shift based on underlying content color.

* Motion is physical — animations feel like they have mass and inertia.

* Hierarchy through glass — deeper (more important) elements are more opaque.

## **8.2  Glass Token Tiers**

All glass surfaces sit over the brand dark backgrounds (\#0F0F0F, \#1A1A1A). Blur is implemented via expo-blur BlurView with tint='dark'.

| Token | Blur | Background | Usage |
| ----- | ----- | ----- | ----- |
| **glass-ultra** | 40px | rgba(255,255,255,0.08) | Modal sheets, overlays, deep UI |
| **glass-heavy** | 24px | rgba(255,255,255,0.12) | Cards, sidebars, drawers |
| **glass-medium** | 16px | rgba(255,255,255,0.16) | Input bars, nav bars, chips |
| **glass-light** | 8px | rgba(255,255,255,0.20) | Hover states, subtle highlights |

## **8.3  Color Tokens**

### **Brand & Accent**

* PRIMARY\_ORANGE — \#FF420B  (primary CTA, user message bubbles, active states)

* SHADOW\_PRIMARY\_ORANGE — \#400600  (deep shadow for orange elements, pressed states)

* SELECTED\_CARD\_BG — \#42170A  (selected/active card background, orange-tinted glass)

### **Backgrounds & Surfaces**

* BLACK\_PRIMARY — \#0F0F0F  (root app background)

* CHAT\_BACKGROUND\_COLOR — \#1A1A1A  (chat screen background)

* INPUT\_BOX\_COLOR — \#2A2A2A  (input fields, unselected cards)

### **Text**

* WHITE\_PRIMARY — \#FFFFFF  (primary headings, user message text)

* TEXT\_LIGHT — \#E5E5E5  (body text, secondary headings)

* TEXT\_WHITE\_80 — \#CFCFCF  (secondary body, subtitles)

* TEXT\_WHITE\_60 — \#9E9E9E  (placeholder text, captions)

* TEXT\_WHITE\_40 — \#6E6E6E  (disabled states, muted labels)

* TEXT\_WHITE\_30 — \#4D4D4D  (dividers, ghost text)

### **Chat Bubbles**

* CHAT\_MESSAGE\_BUBBLE\_USER\_COLOR — \#FF420B  (user bubble background)

* CHAT\_MESSAGE\_BUBBLE\_AI\_COLOR — \#E6E6E6  (AI bubble background)

* CHAT\_MESSAGE\_TEXT\_USER\_COLOR — \#FFFFFF  (text inside user bubble)

* CHAT\_MESSAGE\_TEXT\_AI\_COLOR — \#000000  (text inside AI bubble)

### **Status Colors**

* ERROR\_RED — \#FF0000  (error states, failed downloads)

* SUCCESS\_GREEN — \#00FF00  (completed downloads, success states)

## **8.4  Liquid Glass \+ Brand Integration**

Liquid Glass surfaces are layered over the \#0F0F0F and \#1A1A1A base backgrounds. The orange brand color is used as the tint source for glass surfaces in active/selected states — a selected glass card shifts its tint toward SHADOW\_PRIMARY\_ORANGE (\#400600) rather than white, grounding the glass aesthetic in the brand identity.

* Default glass tint: rgba(255,255,255,…) on dark backgrounds — neutral frosted look.

* Active/selected glass tint: rgba(255,66,11,0.15) — orange-warmed glass for selected model cards, active mode chips.

* Input bar glass: INPUT\_BOX\_COLOR (\#2A2A2A) base \+ glass-medium blur (16px) overlay.

* Chat background: CHAT\_BACKGROUND\_COLOR (\#1A1A1A) — dark enough for glass surfaces to read clearly on top.

# **9\.  Navigation Architecture**

Navigation is built exclusively with expo-router v6. No @react-navigation packages are used independently. All routes are file-based.

## **9.1  Route Tree**

app/  \_layout.tsx              ← Root stack. Font \+ notification init.  index.tsx                ← Splash → onboarding decision  onboarding/    \_layout.tsx    welcome.tsx            ← Welcome screen    username.tsx           ← Name entry    model-setup.tsx        ← First model download  (tabs)/    \_layout.tsx            ← Bottom tab navigator    chat.tsx               ← Main chat tab    models.tsx             ← Model browser tab    profile.tsx            ← Profile tab  chat/    \[id\].tsx               ← Individual chat session  model/    \[id\].tsx               ← Model detail \+ download  profile/    ai-behavior.tsx        ← System prompt / mode settings    storage.tsx            ← Storage usage    support.tsx            ← Help \+ feedback

# **10\.  Screen Specifications**

## **10.1  Splash Screen**

* Lottie animation — LokalMind logo assembles from particles.

* Duration: 2.2s. Exits to welcome or main chat depending on onboarding state.

* No network calls. Fully offline.

## **10.2  Onboarding**

* Step 1 — Welcome: App value prop in 3 lines. One CTA: Get Started.

* Step 2 — Name: Single text input. No validation. Can be changed later.

* Step 3 — Model Setup: Device RAM detected. Best model recommended. Download initiated inline. User can skip and download later.

## **10.3  Chat Screen (Core)**

* Message list via FlashList. Reverse-scrolling.

* Streaming tokens rendered word-by-word with a typing cursor.

* Input bar: Liquid Glass surface, floating above keyboard.

* Attach image via paperclip icon (camera / library picker).

* Voice input: hold-to-record mic button with animated waveform. Releases into editable transcription in input field.

* Reply to message: swipe right on any bubble to quote it. Quoted preview shown in input bar. Quoted message text injected into AI prompt context.

* Message queue: if generation is active, sends are queued. A subtle queue badge appears on the send button showing pending count.

* Header menu: tap '···' to access per-session system prompt editor, rename chat, clear chat, or switch model.

* Sidebar: slide-in chat history list. New chat button at top.

* Header: current model name (tappable → model switcher), mode badge, settings.

## **10.4  Model Browser**

* Card per model: name, parameter count, size, capability tags.

* Download button shows progress bar inline. Pause/resume controls.

* Active model marked with a persistent badge.

* Storage usage bar at bottom of screen.

## **10.5  Profile Screen**

* Avatar (predefined grid or camera capture).

* Display name (editable inline).

* AI Behavior — global system prompt editor. Plain text field, saved on dismiss.

* AI Modes — tap to enter per-mode system prompt editor. Each mode has a default that can be reset.

* Memory — view all stored memory facts as a list. Each fact shows its source chat. Tap to edit or delete. 'Add fact' button for manual entries. 'Clear all memory' destructive action with confirmation.

* Context window slider (512 / 1024 / 2048 / 4096).

* Pro upgrade card (RevenueCat paywall).

* Open source section — GitHub link, version, licenses.

# **11\.  LLM Pipeline**

## **11.1  ILLMEngine Interface**

The LLM engine is abstracted behind a TypeScript interface in domain/ports/ILLMEngine.ts. llama.rn implements this interface via an adapter in infrastructure/llm/llamaRnAdapter.ts. No presentation or domain code imports llama.rn directly.

## **11.2  Chat Turn Sequence**

1. User sends message → ChatViewModel.sendMessage()

2. SendMessageUseCase.execute() — validates, persists user message to SQLite.

3. EnsureModelLoadedUseCase.execute() — loads model if not already in memory.

4. ResolveSystemPromptUseCase.execute() — priority order: (1) per-session prompt if set, (2) global custom prompt if set, (3) mode default prompt as fallback.

5. BuildPromptUseCase.execute() — injects resolved system prompt \+ global memory facts as \[Memory\] block \+ truncated conversation history \+ reply context if present.

6. ILLMEngine.generateResponse() — streams tokens to onToken callback.

7. Debounced UI flush — batches token updates to avoid 60fps render bottleneck.

8. FinalizeMessageUseCase.execute() — persists complete AI response, updates chat metadata.

9. MemoryExtractionUseCase.maybeTrigger(chatId) — if message count % 5 \=== 0, runs background memory extraction pass (non-blocking).

## **11.3  Message Queue**

The message queue ensures no user message is ever lost or dropped when the LLM is actively generating. It is implemented as a simple in-memory observable array in ChatViewModel, drained sequentially.

* User taps send while generation is active → message pushed to MessageQueue.

* Queue drains automatically after current generation completes via FinalizeMessageUseCase.

* Queue state is observable — input bar badge reflects pending count in real time.

* Queue is in-memory only (not persisted). On app restart, queue is empty.

* Max queue depth: 10\. If exceeded, user sees a gentle nudge: 'Please wait…'

## **11.4  Reply-to-Message Pipeline**

When a user swipes to reply on any message (user or AI), the following sequence runs:

10. Swipe gesture (react-native-gesture-handler) triggers ReplyViewModel.setReplyTarget(message).

11. Input bar renders a quoted bubble preview above the text field (dismissible via X).

12. On send, SendMessageUseCase persists replyToId in the messages table.

13. BuildPromptUseCase injects the quoted message into the AI context: '\[Replying to: "{quoted text}"\] {user message}'.

14. AI response is generated with full awareness of which prior message is being addressed.

15. Message bubble renders with a visual reply thread indicator linking back to the original.

## **11.6  System Prompt Resolution**

Every chat turn resolves its system prompt via a strict priority chain. This ensures per-session customisation always wins, with sensible fallbacks.

| Priority | Source | Condition |
| ----- | ----- | ----- |
| **1 (highest)** | **Per-session system prompt** | User has set a custom prompt for this specific chat session |
| **2** | **Global custom system prompt** | User has set a global prompt in Profile → AI Behavior |
| **3 (fallback)** | **Mode default prompt** | No custom prompts set — uses the active mode's built-in system prompt |

After system prompt resolution, global memory facts are always appended as a \[Memory\] block before the conversation history — regardless of which prompt tier was selected.

## **11.7  Memory Pipeline**

LokalMind implements a two-tier memory system: per-session in-context memory (the conversation history itself) and persistent global memory (user facts extracted by the LLM and stored in SQLite).

### **Global Memory Injection (every chat turn)**

16. GetMemoryFactsUseCase.execute() — loads all memory facts from SQLite memory\_facts table.

17. Facts formatted as natural language list: '- User prefers concise answers\\n- User is a React Native developer'

18. Injected into system prompt as a \[Memory\] block above conversation history.

19. If memory is empty or disabled, \[Memory\] block is omitted entirely — no wasted tokens.

### **Auto Memory Extraction (every 5 user messages)**

20. MemoryExtractionUseCase.maybeTrigger(chatId) called after FinalizeMessage. Checks if message count % 5 \=== 0\.

21. Runs a second LLM inference in a background queue (non-blocking). Prompt: 'Review these messages and extract new facts about the user as a JSON array. Return \[\] if nothing new.'

22. Response parsed as JSON. Each new fact checked for semantic duplication against existing facts before insert.

23. New facts saved to memory\_facts table in SQLite with source chatId and timestamp.

24. If new facts were saved, a non-blocking 'Memory updated' toast is shown in the chat UI.

## **11.8  Whisper Voice-to-Text Pipeline**

On-device speech-to-text via whisper.rn. The Whisper base model (.bin, 142MB) is downloaded independently and stored alongside GGUF files. No audio data leaves the device at any point. Language is auto-detected — no configuration needed from the user. Supports 99 languages including English, Hindi, Tamil, Telugu, Bengali, Kannada, Marathi, and Gujarati.

25. User holds mic button → expo-av begins recording audio to a temporary .wav file.

26. Animated waveform visualizer gives real-time recording feedback.

27. User releases button → recording stops. TranscribeAudioUseCase.execute() called.

28. IWhisperEngine.transcribe(audioPath) → whisper.rn processes the .wav file on-device.

29. Transcribed text is inserted into the input bar in an editable state — not auto-sent.

30. Temporary .wav file is deleted immediately after transcription.

31. If Whisper model is not yet downloaded, mic button shows a download prompt instead.

## **11.9  Model Config**

* n\_ctx: user-selected (512–4096), default 2048\.

* n\_threads: Platform.OS \=== 'ios' ? 6 : 4\.

* n\_gpu\_layers: 99 on iOS (Metal), 0 on Android for v2.0.

* Context truncation: last N messages that fit within (n\_ctx \- 512\) tokens. 512 reserved for response.

# **12\.  Data Model**

## **12.1  SQLite Schema**

\-- chatsCREATE TABLE chats (  id              TEXT PRIMARY KEY,  title           TEXT NOT NULL,  lastMessage     TEXT,  timestamp       INTEGER NOT NULL,  modelId         TEXT NOT NULL,  mode            TEXT NOT NULL DEFAULT 'general',  sessionPrompt   TEXT          \-- per-session system prompt override, nullable);-- messagesCREATE TABLE messages (  id          TEXT PRIMARY KEY,  chatId      TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,  text        TEXT NOT NULL,  isUser      INTEGER NOT NULL,   \-- 1 \= user, 0 \= assistant  timestamp   INTEGER NOT NULL,  imagePath   TEXT,               \-- local file path, nullable  replyToId   TEXT                \-- references messages(id), nullable);-- global memory factsCREATE TABLE memory\_facts (  id          TEXT PRIMARY KEY,  fact        TEXT NOT NULL,      \-- natural language: "User is a React Native developer"  sourceChatId TEXT,              \-- which chat this was extracted from, nullable  createdAt   INTEGER NOT NULL,  updatedAt   INTEGER NOT NULL,  isManual    INTEGER NOT NULL DEFAULT 0  \-- 1 \= user added manually, 0 \= auto-extracted);

## **12.2  AsyncStorage Keys**

* user:displayName — string

* user:profileImage — URI string or null

* user:joinDate — ISO string

* models:downloaded — JSON array of ModelMetadata

* models:active — string model ID

* whisper:downloaded — boolean

* whisper:modelPath — local file path string

* settings:contextWindow — number

* settings:globalSystemPrompt — string (global custom prompt, overrides mode default)

* settings:mode:{modeName}:systemPrompt — string (per-mode default prompt, user-editable)

* settings:memoryEnabled — boolean (global memory on/off toggle)

* onboarding:complete — boolean

Note: per-session system prompts are stored in the chats.sessionPrompt column in SQLite, not AsyncStorage, since they are tied to a specific chat record.

# **13\.  Open Source Strategy**

## **13.1  License**

MIT License. Commercial use permitted. Forks permitted. Attribution required.

## **13.2  Repository Structure**

* README.md — project overview, screenshots, getting started in 5 minutes.

* ARCHITECTURE.md — full architecture decision record (ADR) for v2 choices.

* CONTRIBUTING.md — how to add a feature, run tests, submit a PR.

* docs/models.md — how to add a new GGUF model to the lineup.

* .github/ISSUE\_TEMPLATE — bug report, feature request, model request templates.

## **13.3  Contribution Guidelines**

* All PRs require passing unit tests for any new UseCase.

* No direct imports from infrastructure/ in domain/ or presentation/ — enforced via ESLint custom rule.

* Design changes require Figma spec link in PR description.

# **14\.  Roadmap & Milestones**

| Phase | Target | Deliverables |
| ----- | ----- | ----- |
| **Phase 0** | Week 1–2 | Project scaffold, design system tokens \+ brand colors, ILLMEngine \+ IWhisperEngine interfaces, CI setup, Expo 54 base config |
| **Phase 1** | Week 3–5 | LLM pipeline (llama.rn adapter), model download \+ management, GGUF loading, streaming chat, message queue |
| **Phase 2** | Week 6–8 | Full chat UI (streaming, FlashList, reply-to-message, swipe gestures), chat history, onboarding, Liquid Glass components |
| **Phase 3** | Week 9–10 | Whisper STT pipeline (whisper.rn, voice input UI, transcription review), profile screen, AI modes, RevenueCat IAP |
| **Phase 4** | Week 11–12 | Polish pass, performance profiling, App Store submission, GitHub public release, README \+ docs |
| **v2.1** | Post-launch | Android support, BYOM (Bring Your Own Model), RAG pipeline |
| **v2.2** | Future | On-device TTS for English \+ Hindi (expo-speech), Indic TTS for Tamil/Telugu/Bengali/Kannada via AI4Bharat indic-parler-tts model |

# **15\.  Success Metrics**

## **Launch (Day 90\)**

* 500+ GitHub stars within 30 days of open-source release.

* 1,000+ App Store downloads in first month.

* \< 2% crash rate (tracked via Sentry or expo-updates).

* Average session length \> 4 minutes.

## **Growth (Month 6\)**

* 5,000+ active users.

* 10+ community contributors with merged PRs.

* At least 2 additional models added via community PR.

* Pro IAP conversion rate \> 3%.

# **16\.  Out of Scope — v2.0**

* Cloud sync or backup of chat history.

* Web or desktop version.

* Multi-user or shared conversations.

* Fine-tuning or training on-device.

* Real-time web search integration (RAG planned for v2.1).

* Android support (v2.1).

* Text-to-speech / LLM voice output (planned for v2.2 — English \+ Hindi via expo-speech, Indic languages via AI4Bharat model).

***End of Document***

LokalMind v2.0  ·  PRD v2.2  ·  March 2025