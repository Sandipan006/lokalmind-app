# LokalMind v2 — LLM Pipeline

Covers: `ILLMEngine` interface, `IWhisperEngine` interface, chat turn sequence, system prompt resolution, message queue, memory pipeline, and Whisper STT pipeline.

---

## Core Interfaces

### ILLMEngine (`src/core/ports/ILLMEngine.ts`)

The only LLM contract in the codebase. `llama.rn` implements this via `src/infrastructure/llm/llamaRnAdapter.ts`. No other file imports `llama.rn` directly.

```typescript
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  imagePath?: string;   // local file URI, for vision-capable models only
}

export interface LLMConfig {
  modelId: string;
  contextSize?: number;   // 512–4096, default 2048
  temperature?: number;   // default 0.7
  maxTokens?: number;     // default 512, reserved for response
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  finishReason: 'stop' | 'length' | 'error';
}

export interface ILLMEngine {
  initialize(modelId: string, config: LLMConfig): Promise<void>;
  generateResponse(
    messages: LLMMessage[],
    config: LLMConfig,
    onToken?: (token: string) => void
  ): Promise<LLMResponse>;
  unloadModel(): Promise<void>;
  isModelLoaded(): boolean;
  getCurrentModelId(): string | null;
}
```

### IWhisperEngine (`src/core/ports/IWhisperEngine.ts`)

The only Whisper contract. `whisper.rn` implements this via `src/infrastructure/whisper/whisperRnAdapter.ts`.

```typescript
export interface WhisperTranscribeOptions {
  audioPath: string;    // local .wav file path
  language?: string;    // auto-detect if omitted (supports 99 languages)
}

export interface WhisperResult {
  text: string;
  language: string;     // detected language code
  durationMs: number;
}

export interface IWhisperEngine {
  initialize(modelPath: string): Promise<void>;
  transcribe(options: WhisperTranscribeOptions): Promise<WhisperResult>;
  isModelLoaded(): boolean;
  unload(): Promise<void>;
}
```

---

## Chat Turn Sequence

Every message send follows this exact sequence:

```
User taps Send
  │
  ▼
ChatViewModel.sendMessage(text, imagePath?, replyToId?)
  │  If generation is active → push to MessageQueue, return
  │
  ▼
SendMessageUseCase.execute()
  ├── Validate: reject empty input
  ├── Persist user message to SQLite (messages table)
  └── Set ChatViewModel.isGenerating = true
  │
  ▼
EnsureModelLoadedUseCase.execute()
  └── ILLMEngine.initialize(modelId, config) if not already loaded
      (no-op if same model is already in memory)
  │
  ▼
ResolveSystemPromptUseCase.execute(chatId, mode)
  ├── Priority 1: chats.sessionPrompt (per-session, if set)
  ├── Priority 2: settings:globalSystemPrompt (if set)
  └── Priority 3: mode default prompt (hardcoded fallback)
  │
  ▼
GetMemoryFactsUseCase.execute()
  └── Load all rows from memory_facts table
      (returns [] if settings:memoryEnabled = false)
  │
  ▼
BuildPromptUseCase.execute()
  ├── [System Prompt]  ← resolved above
  ├── [Memory]         ← "- User is a React Native developer\n- ..."
  │                       (block omitted entirely if memory is empty)
  ├── [Reply context]  ← "[Replying to: "{quoted text}"] {user message}"
  │                       (only if replyToId is set)
  └── [History]        ← last N messages that fit within (n_ctx - 512) tokens
  │
  ▼
ILLMEngine.generateResponse(messages, config, onToken)
  └── Streams tokens → onToken(token) callback
  │
  ▼
ChatViewModel.appendToStreamingResponse(token)
  └── Debounced flush — batches token updates, flushes every ~50ms
      Prevents 60fps render bottleneck on rapid token streams
  │
  ▼
FinalizeMessageUseCase.execute()
  ├── Persist complete AI response to SQLite (messages table)
  ├── Update chats.lastMessage + chats.timestamp
  └── Set ChatViewModel.isGenerating = false → drain MessageQueue
  │
  ▼
MemoryExtractionUseCase.maybeTrigger(chatId)
  └── If userMessageCount % 5 === 0 → run background extraction (non-blocking)
```

---

## System Prompt Priority Chain

Every chat turn resolves its system prompt via this strict priority order:

| Priority | Source | Where stored | Condition |
|---|---|---|---|
| **1 (highest)** | Per-session system prompt | `chats.sessionPrompt` (SQLite) | User set a custom prompt for this specific chat |
| **2** | Global custom system prompt | `settings:globalSystemPrompt` (AsyncStorage) | User set a global prompt in Profile → AI Behavior |
| **3 (fallback)** | Mode default prompt | Hardcoded in `src/features/chat/domain/` | No custom prompts set |

After resolution, **global memory facts are always appended** as a `[Memory]` block — regardless of which priority tier was selected.

---

## Message Queue

Ensures no user message is ever dropped when the LLM is actively generating.

- Implemented as an observable array (`messageQueue`) in `ChatViewModel`
- User taps Send while `isGenerating = true` → message pushed to queue
- `FinalizeMessageUseCase` sets `isGenerating = false` → queue drains automatically, processing next message
- Queue is **in-memory only** — not persisted. On app restart, queue is empty
- **Max depth: 10.** If exceeded, input bar shows "Please wait…" nudge
- Queue count is observable → input bar badge shows pending count in real time

---

## Memory Pipeline

LokalMind implements a two-tier memory system:

1. **Per-session in-context memory** — the conversation history itself (handled by `BuildPromptUseCase`)
2. **Persistent global memory** — user facts extracted by the LLM and stored in SQLite `memory_facts`

### Global Memory Injection (every chat turn)

1. `GetMemoryFactsUseCase.execute()` loads all rows from `memory_facts`
2. Facts formatted as natural language list:
   ```
   - User is a React Native developer
   - User prefers concise answers
   - User is learning TypeScript
   ```
3. Injected as `[Memory]` block in the system prompt, above conversation history
4. If memory is empty **or** `settings:memoryEnabled = false` → block omitted entirely (no wasted tokens)

### Auto Memory Extraction (every 5 user messages)

1. `MemoryExtractionUseCase.maybeTrigger(chatId)` — checks `userMessageCount % 5 === 0`
2. Runs a **second LLM inference** in a background queue (non-blocking, does not interrupt the chat)
3. Extraction prompt:
   ```
   Review these messages and extract new facts about the user as a JSON array.
   Return [] if nothing new. Format: [{"fact": "User is a React Native developer"}]
   ```
4. Response parsed as JSON array. Each new fact is **semantically deduplicated** against existing facts before insert
5. New facts saved to `memory_facts` with `sourceChatId` + `createdAt` + `isManual = 0`
6. If new facts were saved → non-blocking **"Memory updated"** toast shown in chat UI (does not interrupt conversation)

### Memory Privacy Controls

- **Global toggle**: `settings:memoryEnabled = false` → memory facts never injected, extraction never runs
- **Per-session disable**: User can disable memory for a specific chat session (stored in `chats` table)
- **Clear all**: `ClearAllMemoryUseCase` deletes all rows from `memory_facts`
- **Delete individual fact**: `DeleteMemoryFactUseCase` removes a single row
- **Manual add**: `AddMemoryFactUseCase` inserts a row with `isManual = 1`

---

## Whisper STT Pipeline

On-device speech-to-text. No audio data leaves the device at any point.

**Model**: Whisper Base — 142 MB `.bin` file, 99 languages, auto language detection. Downloaded separately and stored alongside GGUF files.

```
User holds mic button
  │
  ▼
expo-av begins recording audio → temp .wav file in documentDirectory
  └── Animated waveform visualizer gives real-time feedback
  │
User releases mic button
  │
  ▼
expo-av stops recording
  │
  ▼
TranscribeAudioUseCase.execute(audioPath)
  │
  ▼
IWhisperEngine.transcribe({ audioPath })
  └── whisper.rn processes .wav on-device (no network call)
  │
  ▼
WhisperResult.text inserted into ChatViewModel.inputText
  └── Editable in input bar — NOT auto-sent
      User reviews and corrects before tapping Send
  │
  ▼
Temp .wav file deleted immediately after transcription
```

### Edge Cases

- **Whisper model not downloaded** → mic button shows download prompt instead of recording UI
- **Recording cancelled** (tap X) → expo-av stops, temp file deleted, no transcription runs
- **Transcription error** → error toast shown, input bar cleared, temp file deleted
- **Language**: auto-detected by Whisper — user does not configure this
