# LokalMind v2 — Data Model

---

## SQLite Schema

Database file: `lokalmind.db` — WAL mode, foreign keys ON.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Chat sessions
CREATE TABLE IF NOT EXISTS chats (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  lastMessage   TEXT,
  timestamp     INTEGER NOT NULL,       -- Unix ms
  modelId       TEXT NOT NULL,
  mode          TEXT NOT NULL DEFAULT 'general',
  sessionPrompt TEXT                    -- per-session system prompt override, nullable
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  chatId      TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  isUser      INTEGER NOT NULL,         -- 1 = user, 0 = assistant
  timestamp   INTEGER NOT NULL,         -- Unix ms
  imagePath   TEXT,                     -- local file path, nullable
  replyToId   TEXT                      -- references messages(id), nullable
);

-- Global memory facts (persistent across all sessions)
CREATE TABLE IF NOT EXISTS memory_facts (
  id           TEXT PRIMARY KEY,
  fact         TEXT NOT NULL,           -- "User is a React Native developer"
  sourceChatId TEXT,                    -- which chat this was extracted from, nullable
  createdAt    INTEGER NOT NULL,        -- Unix ms
  updatedAt    INTEGER NOT NULL,        -- Unix ms
  isManual     INTEGER NOT NULL DEFAULT 0  -- 1 = user added manually, 0 = auto-extracted
);
```

### Notes

- `chats.sessionPrompt` — nullable. When set, overrides the global system prompt for that session only. See [LLM-PIPELINE.md](./LLM-PIPELINE.md) for priority chain.
- `messages.replyToId` — nullable. When set, `BuildPromptUseCase` injects `[Replying to: "{quoted text}"]` into the AI context.
- `messages.imagePath` — local file URI. Only valid for vision-capable models. Path is relative to `expo-file-system` document directory.
- `memory_facts.isManual = 1` — user-created facts are never auto-deleted by the extraction pipeline.

---

## AsyncStorage Key Registry

All keys are defined as constants in `src/infrastructure/storage/asyncStorageDriver.ts`. Never use raw string keys outside that file.

| Key | Type | Description |
|---|---|---|
| `user:displayName` | `string` | User's display name |
| `user:profileImage` | `string \| null` | URI of selected profile image |
| `user:joinDate` | `string` | ISO 8601 date string |
| `models:downloaded` | `JSON → ModelMetadata[]` | Array of all downloaded model metadata |
| `models:active` | `string` | ID of the currently active model |
| `whisper:downloaded` | `boolean` | Whether the Whisper base model has been downloaded |
| `whisper:modelPath` | `string` | Local file path to the Whisper `.bin` model |
| `settings:contextWindow` | `number` | Context window size — 512, 1024, 2048, or 4096 |
| `settings:globalSystemPrompt` | `string` | User's global custom system prompt (overrides mode default) |
| `settings:mode:general:systemPrompt` | `string` | User override for General mode default prompt |
| `settings:mode:coding:systemPrompt` | `string` | User override for Coding mode default prompt |
| `settings:mode:creative:systemPrompt` | `string` | User override for Creative mode default prompt |
| `settings:mode:deep_think:systemPrompt` | `string` | User override for Deep Think mode default prompt |
| `settings:memoryEnabled` | `boolean` | Global memory on/off toggle |
| `onboarding:complete` | `boolean` | Whether onboarding flow has been completed |

### ModelMetadata shape

```typescript
interface ModelMetadata {
  id: string;               // e.g. "qwen3.5-0.8b"
  displayName: string;      // e.g. "Qwen 3.5 0.8B Q4"
  filePath: string;         // absolute local path to .gguf file
  fileSize: number;         // bytes
  downloadedAt: number;     // Unix ms
  lastUsedAt: number;       // Unix ms
}
```

---

## Model Registry

All models distributed as GGUF from Hetzner CDN. Device RAM detected at runtime via `react-native-device-info`. Model config defined in `src/infrastructure/downloads/modelConfig.ts`.

| Model ID | Display Name | GGUF Filename | Size | Min RAM | Device Tier |
|---|---|---|---|---|---|
| `qwen3.5-0.8b` | Qwen 3.5 0.8B Q4 | `Qwen_Qwen3.5-0.8B-Q4_K_M.gguf` | ~500 MB | 3 GB | iPhone 12+ |
| `qwen3.5-2b` | Qwen 3.5 2B Q4 | `Qwen_Qwen3.5-2B-Q4_K_M.gguf` | ~1.2 GB | 4 GB | iPhone 13+ |
| `qwen3.5-4b` | Qwen 3.5 4B Q4_K_M | `Qwen_Qwen3.5-4B-Q4_K_M.gguf` | ~2.5 GB | 6 GB | iPhone 15 Pro+ |
| `gemma3-4b` | Gemma 3 4B Q4_K_M | `gemma-3-4b-it-Q4_K_M.gguf` | ~2.5 GB | 6 GB | iPhone 15 Pro+ |
| `deepseek-r1-1.5b` | DeepSeek R1 1.5B Q4 | `DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf` | ~900 MB | 4 GB | iPhone 13+ |

### Whisper Model

| Model | Format | Size | Languages |
|---|---|---|---|
| Whisper Base | `.bin` | 142 MB | 99 languages, auto-detect |

### Model Recommendation Logic

```
availableRAM = deviceTotalRAM × 0.60   // never use more than 60% of device RAM
recommend = highest-quality model where modelSize ≤ availableRAM
```

Applied at onboarding Step 3 (model-setup). User can override the recommendation.

### LLM Runtime Config Defaults

```typescript
n_ctx:        user-selected (512 | 1024 | 2048 | 4096), default 2048
n_threads:    Platform.OS === 'ios' ? 6 : 4
n_gpu_layers: 99 on iOS (Metal), 0 on Android (v2.0)
maxTokens:    512  // reserved for response, subtracted from n_ctx
temperature:  0.7
```

### AI Modes

| Mode ID | Display Name | Default System Prompt Focus |
|---|---|---|
| `general` | General | Helpful, concise general assistant |
| `coding` | Coding | Code-first, technical, structured output, prefer code blocks |
| `creative` | Creative | Creative writing, storytelling, ideation, open-ended |
| `deep_think` | Deep Think | Step-by-step reasoning, logic chains, math, show working |

Each mode's default prompt is user-overridable via `settings:mode:{modeName}:systemPrompt`.
