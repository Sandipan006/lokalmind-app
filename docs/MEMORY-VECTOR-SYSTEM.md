# LokalMind v2 — Memory & Vector Embedding System

**Final implementation reference · v1.2**  
Supersedes the `memory_facts` table and `MemoryExtractionUseCase` described in `LLM-PIPELINE.md` and `DATA-MODEL.md`.  
Incorporates all decisions from `MEMORY-SYSTEM.md` + `MEMORY-FIXES.md`.

---

## What This Replaces

The old system extracted flat facts (`memory_facts` table) using a second LLM inference every 5 messages. It had no session context, no semantic retrieval, and no rolling summarisation. This document replaces it entirely.

**Delete from the old system:**
- `memory_facts` table
- `GetMemoryFactsUseCase`
- `MemoryExtractionUseCase`
- `ClearAllMemoryUseCase` / `DeleteMemoryFactUseCase` / `AddMemoryFactUseCase`
- `settings:memoryEnabled` AsyncStorage key (replaced by `memory:pinnedFacts`)

---

## System Overview

```
Every chat message send:

  User message
      │
      ▼
  GetPinnedFactsUseCase          ← AsyncStorage: always-injected facts (name, prefs)
      │
      ▼
  GetRelevantMemoryUseCase       ← SQLite: semantic search across past session summaries
      │   embed user message → cosine similarity → top-5 sessions
      │   fallback: score-based top-5 if embedding model not ready
      │
      ▼
  GetSessionSummariesUseCase     ← SQLite: rolling summaries of THIS session's old turns
      │
      ▼
  buildContextMessages()         ← assembles final LLMMessage[] within token budget
      │
      ▼
  ILLMEngine.generateResponse()

After reply completes (fire-and-forget):
  MaybeSummarizeBucketUseCase    ← every 20 turns: summarise oldest unsummarised bucket

On session leave (fire-and-forget):
  maybeSaveSessionMemory()       ← if ≥ 6 turns and not yet saved: cross-session summary
```

---

## Embedding Model

### Model: all-MiniLM-L6-v2 (GGUF Q4_K_M)

| Property | Value |
|---|---|
| Model name | all-MiniLM-L6-v2 |
| Quantisation | Q4_K_M |
| Format | GGUF |
| File | `assets/models/all-MiniLM-L6-v2-Q4_K_M.gguf` |
| Size | ~21 MB |
| Embedding dimensions | 384 |
| Max input tokens | 512 (~1800 chars) |
| Inference speed | ~30–50ms on iPhone 13 (CPU only) |
| RAM footprint | ~80 MB |
| Battery cost | Negligible — 50–100× cheaper than chat inference |

### Distribution

**Already uploaded to Hetzner CDN** at:
```
/models/all-MiniLM-L6/all-MiniLM-L6-v2-Q4_K_M.gguf
```

Same CDN bucket and same download infrastructure as all chat models. No separate download system needed.

### Why This Model

- Smallest viable embedding model with acceptable quality (~84% on semantic textual similarity benchmarks)
- GGUF format — same runtime as chat models, zero new native dependencies
- `llama.rn` already supports embedding mode via `context.embedding()` — already in the codebase
- 21 MB — downloads in seconds alongside any LLM

### Download Strategy

**Downloaded simultaneously when the user downloads any LLM** — silent, no separate prompt, no UI.

- Triggered inside the existing download flow, immediately after the LLM download starts
- Lands in `Paths.document/models/all-MiniLM-L6-v2-Q4_K_M.gguf` — same location as all chat models
- If download fails silently: `EmbeddingService.isReady()` stays `false`, score-based retrieval fallback activates
- Not bundled in the app binary — no `metro.config.js` change needed

### `modelConfig.ts` — add embedding config

Following the same pattern as `WHISPER_CONFIG`:

```typescript
export const EMBEDDING_CONFIG = {
  id: 'all-minilm-l6-v2',
  displayName: 'MiniLM Embedding Model',
  filename: 'all-MiniLM-L6-v2-Q4_K_M.gguf',
  cdnFolder: 'all-MiniLM-L6',
  sizeBytes: 20_999_104,
  description: 'Powers semantic memory retrieval. Downloaded automatically.',
} as const;
```

The CDN URL resolves as: `{CDN_BASE}/models/all-MiniLM-L6/all-MiniLM-L6-v2-Q4_K_M.gguf`

---

## Data Model

### New SQLite Tables

Add both tables in `ChatRepositoryImpl.ensureInitialized()` after the existing table creation blocks.

```sql
-- Rolling in-session summaries.
-- One row per 20-turn bucket per session.
-- Cascade-deleted when the parent session is deleted.
CREATE TABLE IF NOT EXISTS session_summaries (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  bucket_index  INTEGER NOT NULL,   -- 0 = turns 1–20, 1 = turns 21–40, etc.
  summary       TEXT NOT NULL,      -- structured text, ~60 tokens
  turn_start    INTEGER NOT NULL,
  turn_end      INTEGER NOT NULL,
  created_at    INTEGER NOT NULL,   -- Unix ms
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_summaries_session
  ON session_summaries(session_id, bucket_index);

-- Cross-session long-term memory.
-- One row per completed session (≥ 6 turns).
-- Pinned and user-edited rows are never auto-evicted.
-- When the parent chat session is deleted, this row is also deleted (CASCADE).
CREATE TABLE IF NOT EXISTS session_memories (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL,
  session_title  TEXT NOT NULL,
  summary        TEXT NOT NULL,     -- structured text, ~60 tokens
  embedding      TEXT,              -- JSON float[384], null until EmbeddingService ready
  score          REAL NOT NULL DEFAULT 0.0,
  is_pinned      INTEGER NOT NULL DEFAULT 0,  -- 1 = never auto-evicted
  is_user_edited INTEGER NOT NULL DEFAULT 0,  -- 1 = user edited text, never auto-evicted
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- embedding TEXT: JSON-serialised float[384].
-- ~2.7KB per row. At max 50 rows = 135KB total.
-- JSON.parse is <1ms per row — BLOB adds complexity with no measurable benefit at this scale.
```

**Important:** The `ON DELETE CASCADE` on `session_memories.session_id` means deleting a chat session automatically deletes its cross-session memory row and all its in-session summary buckets. No manual cleanup needed.

### New AsyncStorage Key

| Key | Type | Description |
|---|---|---|
| `memory:pinnedFacts` | `string` | Always-injected user facts. Max 800 chars. |

Add to the key registry in `asyncStorageDriver.ts`. Delete `settings:memoryEnabled` (replaced).

### Entity Types

**`src/features/memory/domain/entities/SessionSummary.ts`**
```typescript
export interface SessionSummary {
  id: string;
  sessionId: string;
  bucketIndex: number;
  summary: string;
  turnStart: number;
  turnEnd: number;
  createdAt: number;
}
```

**`src/features/memory/domain/entities/SessionMemory.ts`**
```typescript
export interface SessionMemory {
  id: string;
  sessionId: string;
  sessionTitle: string;
  summary: string;
  embedding: string | null;   // JSON-serialised float[384]
  score: number;
  isPinned: boolean;
  isUserEdited: boolean;
  createdAt: number;
  updatedAt: number;
}
```

---

## EmbeddingService

**`src/infrastructure/llm/embeddingService.ts`**

The only file in the codebase that loads MiniLM. Follows the same isolation pattern as `llamaRnAdapter.ts`.

```typescript
import { File, Paths } from 'expo-file-system';
import { initLlama } from 'llama.rn';
import type { LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';
import { getUsableRamBytes } from '@/src/infrastructure/device/deviceCapability';
import { EMBEDDING_CONFIG } from '@/src/infrastructure/downloads/modelConfig';

const EMBED_MODEL_RAM_BYTES = 200 * 1024 * 1024; // 200MB conservative headroom check

export interface IEmbeddingService {
  initialize(): Promise<void>;
  embed(text: string): Promise<number[]>;
  isReady(): boolean;
  setLlmBusy(busy: boolean): void;
}

export class EmbeddingService implements IEmbeddingService {
  private context: LlamaContext | null = null;
  private initPromise: Promise<void> | null = null;
  private isLlmBusy = false;
  // Queue of resolve functions waiting for LLM to go idle before embedding.
  private embedQueue: Array<() => void> = [];

  async initialize(): Promise<void> {
    if (this.context) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init().finally(() => { this.initPromise = null; });
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    // Model lives in document directory alongside chat models — downloaded via CDN, not bundled.
    const modelFile = new File(Paths.document, 'models', EMBEDDING_CONFIG.filename);
    if (!modelFile.exists) {
      // Not downloaded yet — isReady() stays false, score-based fallback activates.
      console.warn('[EmbeddingService] Embedding model not downloaded yet');
      return;
    }

    // Skip loading if device doesn't have enough RAM headroom.
    const usable = await getUsableRamBytes();
    if (usable < EMBED_MODEL_RAM_BYTES) {
      console.warn('[EmbeddingService] Insufficient RAM, skipping init');
      return;
    }

    const modelPath = modelFile.uri.replace(/^file:\/\//, '');
    this.context = await initLlama({
      model: modelPath,
      embedding: true,    // embed-only context, no chat completion
      n_ctx: 512,
      n_threads: Platform.OS === 'ios' ? 4 : 2,
      n_gpu_layers: 0,    // embedding models do not benefit from GPU on mobile
      use_mlock: false,
    });
  }

  /** Called by ChatViewModel at generation start/end to prevent concurrent LLM+embed. */
  setLlmBusy(busy: boolean): void {
    this.isLlmBusy = busy;
    if (!busy) {
      // Drain ALL queued embed calls now that LLM is idle.
      const queue = this.embedQueue.splice(0);
      queue.forEach((resolve) => resolve());
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.context) return [];

    // Wait for LLM to finish generating before running embedding.
    // Prevents two concurrent LlamaContext inference calls on low-RAM devices.
    if (this.isLlmBusy) {
      await new Promise<void>((resolve) => { this.embedQueue.push(resolve); });
    }

    try {
      const result = await this.context.embedding(text.slice(0, 1800)); // ~450 token guard
      return result.embedding ?? [];
    } catch {
      return []; // graceful degradation — falls back to score-based retrieval
    }
  }

  isReady(): boolean {
    return this.context !== null;
  }
}
```

**Initialisation in `container.ts`:**

```typescript
const embeddingService = new EmbeddingService();

// Fire-and-forget. Chat works normally while MiniLM loads in background.
void embeddingService.initialize().catch((e) => {
  console.warn('[EmbeddingService] Background init failed, score-based fallback active:', e);
});
```

---

## ILLMEngine Changes

Add two methods to `src/core/ports/ILLMEngine.ts`:

```typescript
export interface ILLMEngine {
  initialize(modelId: string, config: LLMConfig): Promise<void>;
  generateResponse(
    messages: LLMMessage[],
    config: LLMConfig,
    onToken?: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<LLMResponse>;
  unloadModel(): Promise<void>;
  isModelLoaded(): boolean;    // already exists — confirm presence
  getCurrentModelId(): string | null;
  isGenerating(): boolean;     // NEW — true while generateResponse() is active
}
```

**`llamaRnAdapter.ts` implementation:**

```typescript
private generating = false;

isGenerating(): boolean {
  return this.generating;
}

async generateResponse(...): Promise<LLMResponse> {
  this.generating = true;
  try {
    // ... existing implementation ...
  } finally {
    this.generating = false;
  }
}
```

---

## Repository Interface

**`src/features/memory/domain/repositories/IMemoryRepository.ts`**

```typescript
import type { Result } from '@/src/core/types';
import type { SessionMemory } from '../entities/SessionMemory';
import type { SessionSummary } from '../entities/SessionSummary';

export interface IMemoryRepository {
  // In-session rolling summaries
  saveSessionSummary(data: SessionSummary): Promise<Result<void>>;
  getSessionSummaries(sessionId: string): Promise<Result<SessionSummary[]>>;

  // Cross-session long-term memories
  saveSessionMemory(data: SessionMemory): Promise<Result<void>>;
  updateSessionMemory(
    id: string,
    fields: Partial<Pick<SessionMemory, 'summary' | 'embedding' | 'score' | 'isPinned' | 'isUserEdited'>>,
  ): Promise<Result<void>>;
  deleteSessionMemory(id: string): Promise<Result<void>>;
  getAllSessionMemories(): Promise<Result<SessionMemory[]>>;
  getSessionMemoryBySessionId(sessionId: string): Promise<Result<SessionMemory | null>>;

  // Eviction
  deleteLowestScoredMemory(): Promise<Result<void>>;
  countNonPinnedMemories(): Promise<Result<number>>;
}
```

`MemoryRepositoryImpl` receives `ISQLiteDriver` via constructor injection — same pattern as `ChatRepositoryImpl`.

---

## Summarisation

### Prompt (optimised for 1–4B models)

```typescript
const SUMMARISE_PROMPT = (conversation: string) => `\
Read this conversation and fill in these fields. Write each field on its own line. No extra text.

TOPICS: list of topics, max 5, comma separated
FACTS: facts about the user - name, job, preferences, decisions
DONE: conclusions or action items the user reached
OPEN: unresolved questions or tasks (write NONE if nothing)

Conversation:
${conversation.slice(0, 3000)}`;
```

Short field names and simple instruction are intentional — small models break with complex structured prompts.

### LLM Call Config for Summarisation

```typescript
const response = await this.llmEngine.generateResponse(
  messages,
  { modelId, temperature: 0.3, maxTokens: 80 },
  undefined,
  signal,
);
```

`temperature: 0.3` (not 0.7) — summarisation is not creative. Lower temperature = more consistent structured output.  
`maxTokens: 80` — prevents runaway output on models that ignore length instructions.

### Fault-Tolerant Parser

Small models frequently add filler text, change field names, or skip fields. Never use a strict line-exact parser.

```typescript
interface ParsedSummary {
  topics: string;
  facts: string;
  done: string;
  open: string;
}

function parseSummaryResponse(raw: string): ParsedSummary {
  const result: ParsedSummary = { topics: 'NONE', facts: 'NONE', done: 'NONE', open: 'NONE' };
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('topics:') || lower.startsWith('topic:')) {
      result.topics = line.split(':').slice(1).join(':').trim() || 'NONE';
    } else if (lower.startsWith('facts:') || lower.startsWith('fact:') || lower.startsWith('user_facts:')) {
      result.facts = line.split(':').slice(1).join(':').trim() || 'NONE';
    } else if (lower.startsWith('done:') || lower.startsWith('decisions:') || lower.startsWith('decision:')) {
      result.done = line.split(':').slice(1).join(':').trim() || 'NONE';
    } else if (lower.startsWith('open:')) {
      result.open = line.split(':').slice(1).join(':').trim() || 'NONE';
    }
  }

  return result;
}
```

If all fields parse as `NONE` — model completely failed — log a warning and do not save. Do not throw.

### Stored Summary Format

```
[3d ago · Python Chat]
Topics: FastAPI, async patterns, Pydantic
About user: Building a FastAPI app. Prefers short code examples.
Resolved: Use Pydantic v2. Avoid sync endpoints.
Open: NONE
```

This is both injected into the LLM context and displayed verbatim in the Memory screen.

### Score Calculation

```typescript
function computeScore(createdAt: number, turnCount: number): number {
  const daysAgo = (Date.now() - createdAt) / 86_400_000;
  const recency = 1 / (1 + daysAgo);           // 1.0 → 0 over weeks
  const engagement = Math.min(turnCount / 50, 1); // normalised, caps at 50 turns
  return (0.7 * recency) + (0.3 * engagement);
}
```

### Trigger Points

**Rolling bucket** — add in `ChatViewModel.runSendTurn()`, **after** the `runInAction` block:

```typescript
// After runInAction finalises the assistant reply:
const turnCount = this.messages.length;
if (turnCount > 0 && turnCount % 20 === 0) {
  const bucketIndex = Math.floor(turnCount / 20) - 1;
  void this.summarizeSessionUseCase.execute({
    sessionId: currentSessionId,
    sessionTitle: this.session?.title ?? 'Chat',
    type: 'bucket',
    bucketIndex,
    turnStart: bucketIndex * 20 + 1,
    turnEnd: bucketIndex * 20 + 20,
  });
}
```

**Cross-session memory** — in `ChatScreen.tsx`, extend the existing `useFocusEffect` cleanup:

```typescript
useFocusEffect(
  useCallback(() => {
    void refreshDownloadedModel();

    return () => {
      composerInputRef.current?.blur();
      Keyboard.dismiss();

      // Trigger cross-session summarisation when user leaves the chat.
      const sessionId = viewModel.session?.id;
      const turnCount = viewModel.messages.length;
      if (sessionId) {
        void viewModel.maybeSaveSessionMemory(sessionId, turnCount);
      }
    };
  }, [refreshDownloadedModel, viewModel]),
);
```

`useFocusEffect` cleanup is the correct hook — fires on back navigation and tab switches, not on re-renders, not multiple times per leave.

**`ChatViewModel.maybeSaveSessionMemory()`:**

```typescript
async maybeSaveSessionMemory(sessionId: string, turnCount: number): Promise<void> {
  if (turnCount < 6) return;
  if (!this.llmEngine.isModelLoaded()) return;
  if (this.llmEngine.isGenerating()) return;
  const existing = await this.memoryRepository.getSessionMemoryBySessionId(sessionId);
  if (existing.success && existing.data !== null) return;
  void this.summarizeSessionUseCase.execute({
    sessionId,
    sessionTitle: this.session?.title ?? 'Chat',
    type: 'cross-session',
  });
}
```

**`SummarizeSessionUseCase` readiness guard** (top of `execute()`):

```typescript
async execute(params: SummarizeSessionParams): Promise<Result<void>> {
  if (!this.llmEngine.isModelLoaded()) {
    console.log('[Memory] Skipping summarisation — no model loaded');
    return ok(undefined);
  }
  if (this.llmEngine.isGenerating()) {
    console.log('[Memory] Skipping summarisation — LLM is generating');
    return ok(undefined);
  }
  // ... rest of implementation
}
```

---

## Memory Retrieval

### Semantic Search

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}
```

No library. No vector index. At 10–50 rows, brute-force cosine is <1ms.

### Retrieval Flow (`MemoryService.getRelevantMemories()`)

1. Load all `session_memories` rows from SQLite
2. Separate `isPinned` from non-pinned
3. If `EmbeddingService.isReady()` is false → return pinned + top-5 non-pinned by `score` (fallback)
4. If ready → embed user message, compute `cosineSimilarity` against all non-pinned rows
5. Final rank score: `(0.6 × semantic_similarity) + (0.4 × recency_score)`
6. Return all pinned rows + top-5 non-pinned by final rank score

### When to Skip Memory Injection

Skip cross-session memory (not pinned facts) when the message is clearly stateless:

```typescript
function requiresMemory(userMessage: string, sessionTurnCount: number): boolean {
  if (sessionTurnCount < 3) return false;
  const text = userMessage.toLowerCase();
  const contextualMarkers = [
    'like before', 'same as', 'we discussed', 'you said', 'remember',
    'earlier', 'last time', 'that thing', 'as usual', 'my name', 'i told you',
  ];
  const hasContextualRef = contextualMarkers.some((m) => text.includes(m));
  const isShortStateless = text.split(' ').length < 12 && !hasContextualRef;
  return !isShortStateless;
}
```

Pinned facts are **always** injected regardless of this check.

### Eviction (max 10 non-pinned memories)

```typescript
async evictIfNeeded(max = 10): Promise<void> {
  const count = await this.memoryRepository.countNonPinnedMemories();
  if (!count.success || count.data <= max) return;
  await this.memoryRepository.deleteLowestScoredMemory();
}
```

Called after every `saveSessionMemory()`. Pinned (`is_pinned = 1`) and user-edited (`is_user_edited = 1`) rows are never evicted.

### Embedding at Write Time

After saving a new `session_memory` row:

```typescript
async embedAndSave(memoryId: string, summaryText: string): Promise<void> {
  if (!this.embeddingService.isReady()) return;
  const vec = await this.embeddingService.embed(summaryText);
  if (vec.length === 0) return;
  await this.memoryRepository.updateSessionMemory(memoryId, {
    embedding: JSON.stringify(vec),
  });
}
```

If `EmbeddingService` is not ready, `embedding` stays `null`. Score-based fallback handles retrieval. Next time the embedding service is available, a new summary write will embed correctly.

### Re-embed After User Edit

In `MemoryViewModel.updateMemory()`:

```typescript
// Step 1 — save text
await this.updateSessionMemoryUseCase.execute(id, { summary: newSummary, isUserEdited: true });

// Step 2 — regenerate embedding for new text (fire-and-forget)
void this.memoryService.embedAndSave(id, newSummary).catch((e) => {
  console.warn('[Memory] Re-embed after edit failed:', e);
});

// Step 3 — optimistic UI update
runInAction(() => {
  this.memories = this.memories.map((m) =>
    m.id === id ? { ...m, summary: newSummary, isUserEdited: true } : m,
  );
});
```

---

## Token Budget

### Script-Aware Token Estimator

`src/features/chat/domain/utils/tokenBudget.ts`

```typescript
/**
 * Token-per-character ratios by script (empirical for LLaMA tokenizer):
 * - Latin/ASCII: ~4 chars per token
 * - Indic (Devanagari, Bengali, Tamil, etc.): ~1 char per token
 * - CJK: ~1.5 chars per token
 * - Arabic: ~2 chars per token
 *
 * Uses worst-case ratio for the dominant script detected. Single-pass scan.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let indicChars = 0;
  let cjkChars = 0;
  let arabicChars = 0;
  const total = text.length;

  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i) ?? 0;
    if (
      (cp >= 0x0900 && cp <= 0x097F) || // Devanagari (Hindi)
      (cp >= 0x0980 && cp <= 0x09FF) || // Bengali
      (cp >= 0x0B80 && cp <= 0x0BFF) || // Tamil
      (cp >= 0x0C00 && cp <= 0x0C7F) || // Telugu
      (cp >= 0x0C80 && cp <= 0x0CFF) || // Kannada
      (cp >= 0x0D00 && cp <= 0x0D7F)    // Malayalam
    ) {
      indicChars++;
    } else if (
      (cp >= 0x4E00 && cp <= 0x9FFF) || // CJK Unified
      (cp >= 0x3040 && cp <= 0x30FF) || // Hiragana + Katakana
      (cp >= 0xAC00 && cp <= 0xD7AF)    // Korean Hangul
    ) {
      cjkChars++;
    } else if (cp >= 0x0600 && cp <= 0x06FF) {
      arabicChars++;
    }
  }

  const dominantNonLatin = Math.max(indicChars, cjkChars, arabicChars);
  const nonLatinFraction = total > 0 ? dominantNonLatin / total : 0;

  if (nonLatinFraction > 0.3) return total;          // Indic worst-case: 1 char/token
  if (nonLatinFraction > 0.1) return Math.ceil(total / 2); // Mixed
  return Math.ceil(total / 4);                        // Latin standard
}
```

### Budget Allocation

| Block | Max tokens | Cut order if over budget |
|---|---|---|
| System prompt | ≤ 300 | Last resort — truncate tail + `[truncated]` |
| Pinned facts | ≤ 100 | Never cut |
| Cross-session memory | ≤ 200 | Cut first: lowest-score non-pinned |
| In-session summaries | ≤ 150 | Cut second: oldest bucket first |
| History turns | ≤ 800 | Cut third: oldest pairs, floor = 4 turns |
| Current user message | remainder | Never cut |
| **Total** | **~3800** | Headroom under 4096 |

### System Message Structure

All memory blocks are injected into a single `system` message:

```
{system_prompt}

[About you]
{pinned_facts}

[Past conversations]
{cross_session_memory_block}

[Earlier in this conversation]
{in_session_summaries_block}
```

Blocks with empty content are omitted entirely — no empty headings.

---

## SendMessageUseCase Changes

### Immediate (ship first, independent of memory)

```typescript
const MAX_LLM_CONVERSATION_MESSAGES = 10;   // was 20
const MAX_CHARS_PER_LLM_MESSAGE = 2_000;    // was 14_000
```

### Constructor additions

```typescript
constructor(
  private readonly chatRepository: IChatRepository,
  private readonly llmEngine: ILLMEngine,
  private readonly appSettingsRepository: IAppSettingsRepository,
  private readonly memoryService: MemoryService,
  private readonly memoryRepository: IMemoryRepository,
) {}
```

### execute() — context assembly

```typescript
const modeOverride = await this.appSettingsRepository.getModeSystemPromptOverride(mode);
const systemPrompt = resolveSystemPromptForChat(mode, modeOverride);
const pinnedFacts = await this.appSettingsRepository.getPinnedFacts();

const [memoriesResult, summariesResult] = await Promise.all([
  this.memoryService.getRelevantMemories(userMessage.content),
  this.memoryRepository.getSessionSummaries(sessionId),
]);

const rawTurns = buildCappedLlmTurns(history, userMessage);
const historyOnly = rawTurns.slice(0, -1);
const currentMsg = rawTurns[rawTurns.length - 1]!;

const llmMessages = buildContextMessages({
  systemPrompt,
  pinnedFacts,
  crossSessionMemories: memoriesResult.success ? memoriesResult.data : [],
  inSessionSummaries: summariesResult.success ? summariesResult.data : [],
  history: historyOnly,
  currentMessage: currentMsg,
});
```

### RegenerateReplyUseCase — same changes

`RegenerateReplyUseCase` receives the same constructor additions and uses the same `buildContextMessages()`. Both use cases share the function — no duplication.

---

## Pinned Facts

A single free-text field, max 800 chars, **always** injected into every LLM call as the `[About you]` block. Bypasses retrieval entirely — present regardless of token pressure (only cut as absolute last resort, never in practice).

Intended for: name, language preference, job, always-relevant context.

```typescript
// IAppSettingsRepository additions:
getPinnedFacts(): Promise<string>;
savePinnedFacts(facts: string): Promise<void>; // enforces 800 char max at write time
```

**800 char cap** (not 1200) — accounts for worst-case Devanagari token ratio where 800 chars ≈ 800 tokens. Keeps pinned block reliably under 100 tokens even in non-Latin scripts.

---

## Memory Screen UI

**Route:** `app/profile/memory.tsx`

**MemoryViewModel observable state:**
```typescript
memories: SessionMemory[] = [];
pinnedFacts: string = '';
isLoading = false;
isSaving = false;
error: string | null = null;
```

**Layout:**
```
Memory

Pinned facts
┌────────────────────────────────────────────┐
│ Things LokalMind always knows about you.   │
│                                            │
│ [multiline text input, 800 char max]       │
│                                        0/800│
└────────────────────────────────────────────┘

Past conversations

  📝  3d ago · Python Chat                [pin] [delete]
  ┌────────────────────────────────────────┐
  │ Topics: FastAPI, async, Pydantic       │
  │ About user: Building a FastAPI app...  │
  │ Resolved: Use Pydantic v2              │
  │ Open: NONE                             │
  └────────────────────────────────────────┘

  📝  1w ago · Cooking                    [pin] [delete]
  ...
```

**Behaviour:**
- Pinned facts auto-saves on blur (debounced 500ms). No explicit save button.
- Memory rows: tap to expand full text, tap again to collapse.
- Pin toggle: flips `is_pinned`, re-orders list (pinned first).
- Delete: shows confirmation sheet. Deletes from SQLite immediately.
- Empty state: "No memories yet. LokalMind remembers things as you chat."
- When `session_id` points to a deleted chat session: display the memory card normally, no "view chat" navigation link. The content is still valid.
- `is_user_edited = true` rows show a "You edited this" label. These are never auto-evicted.

---

## ChatViewModel Changes Summary

| Addition | Purpose |
|---|---|
| `embeddingService: IEmbeddingService` in constructor | Set busy state around generation |
| `memoryRepository: IMemoryRepository` in constructor | Check for existing memory on session leave |
| `summarizeSessionUseCase: SummarizeSessionUseCase` in constructor | Trigger summarisation |
| Call `embeddingService.setLlmBusy(true)` before generation | Prevent concurrent embedding |
| Call `embeddingService.setLlmBusy(false)` in finally block | Drain embed queue |
| Rolling bucket trigger after `runInAction` in `runSendTurn()` | Every 20 turns → summarise |
| `maybeSaveSessionMemory()` method | Called from `useFocusEffect` cleanup in ChatScreen |

---

## Graceful Degradation

Every component has a defined fallback. Nothing blocks the user from chatting.

| Component | Failure | Fallback |
|---|---|---|
| `EmbeddingService.initialize()` | RAM check fails or asset fails to load | `isReady() = false`. Score-based retrieval. |
| `EmbeddingService.embed()` | Inference throws | Returns `[]`. Cosine = 0. Score-based fallback. |
| `SummarizeSessionUseCase` | Model unloaded or generating | Returns `ok(undefined)`. Session unsummarised. |
| `SummarizeSessionUseCase` | LLM returns unparseable output | Log warning, do not save. Session continues. |
| `MemoryRepository` query | SQLite error | Return `ok([])`. Memory block omitted. Chat unaffected. |
| `GetPinnedFactsUseCase` | AsyncStorage read fails | Return `''`. Pinned block omitted. Chat unaffected. |
| Token budget overflow | All cuts exhausted | Truncate system prompt tail + `[truncated]`. Never crash. |
| `embedAndSave()` after edit | Embedding service not ready | Old vector stays, or `null`. Fallback handles retrieval. |

---

## DI Wiring (`container.ts`)

```typescript
import { EmbeddingService } from '@/src/infrastructure/llm/embeddingService';
import { MemoryRepositoryImpl } from '@/src/features/memory/data/repositories/MemoryRepositoryImpl';
import { MemoryService } from '@/src/features/memory/domain/services/MemoryService';
import { SummarizeSessionUseCase } from '@/src/features/memory/domain/usecases/SummarizeSessionUseCase';
import { GetRelevantMemoryUseCase } from '@/src/features/memory/domain/usecases/GetRelevantMemoryUseCase';
import { GetPinnedFactsUseCase } from '@/src/features/memory/domain/usecases/GetPinnedFactsUseCase';
import { SavePinnedFactsUseCase } from '@/src/features/memory/domain/usecases/SavePinnedFactsUseCase';

// Instantiate at module level (same pattern as llmEngine, downloadService)
const embeddingService = new EmbeddingService();

// In initializeContainer():
const memoryRepository = new MemoryRepositoryImpl(sqliteDriver);
const memoryService = new MemoryService(memoryRepository, embeddingService);
const summarizeSessionUseCase = new SummarizeSessionUseCase(llmEngine, memoryRepository);

void embeddingService.initialize().catch((e) => {
  console.warn('[EmbeddingService] Background init failed, score-based fallback active:', e);
});

// Updated constructors:
// SendMessageUseCase(..., memoryService, memoryRepository)
// RegenerateReplyUseCase(..., memoryService, memoryRepository)
// ChatViewModel(..., embeddingService, memoryRepository, summarizeSessionUseCase)
```

---

## Implementation Order

Build in this exact order. Each step is independently shippable and testable.

| Step | What | Notes |
|---|---|---|
| 1 | `MAX_LLM_CONVERSATION_MESSAGES` → 10, `MAX_CHARS_PER_LLM_MESSAGE` → 2000 | Ship immediately. Zero risk. Immediate latency + battery improvement. |
| 2 | Pinned facts — AsyncStorage key + `IAppSettingsRepository` methods + UI field in Profile | Zero ML, zero new tables. Solves "LLM doesn't know my name" now. |
| 3 | New SQLite tables + `IMemoryRepository` + `MemoryRepositoryImpl` | Foundation for everything else. |
| 4 | `tokenBudget.ts` + update `SendMessageUseCase` to use it | Required before memory injection. |
| 5 | `SummarizeSessionUseCase` + trigger in `ChatViewModel` + `useFocusEffect` cleanup in `ChatScreen` | Rolling summaries + cross-session memory starts building. |
| 6 | `MemoryService` (score-based retrieval only) + inject into `SendMessageUseCase` + `RegenerateReplyUseCase` | Memory injected into every chat. No embeddings yet. |
| 7 | `EMBEDDING_CONFIG` in `modelConfig.ts` + silent simultaneous download with LLM + `EmbeddingService` | Full semantic retrieval live after first LLM download. |
| 8 | Memory Screen UI (`MemoryScreen` + `MemoryViewModel`) | User visibility and control. |

---

## Files

| Action | File |
|---|---|
| **Upload done** | Hetzner CDN `/models/all-MiniLM-L6/all-MiniLM-L6-v2-Q4_K_M.gguf` — already on server |
| **Create** | `src/infrastructure/llm/embeddingService.ts` |
| **Create** | `src/features/memory/domain/entities/SessionMemory.ts` |
| **Create** | `src/features/memory/domain/entities/SessionSummary.ts` |
| **Create** | `src/features/memory/domain/repositories/IMemoryRepository.ts` |
| **Create** | `src/features/memory/domain/services/MemoryService.ts` |
| **Create** | `src/features/memory/domain/usecases/SummarizeSessionUseCase.ts` |
| **Create** | `src/features/memory/domain/usecases/GetRelevantMemoryUseCase.ts` |
| **Create** | `src/features/memory/domain/usecases/GetPinnedFactsUseCase.ts` |
| **Create** | `src/features/memory/domain/usecases/SavePinnedFactsUseCase.ts` |
| **Create** | `src/features/memory/data/repositories/MemoryRepositoryImpl.ts` |
| **Create** | `src/features/memory/presentation/screens/memory-screen/MemoryScreen.tsx` |
| **Create** | `src/features/memory/presentation/viewmodels/MemoryViewModel.ts` |
| **Create** | `src/features/chat/domain/utils/tokenBudget.ts` |
| **Modify** | `src/core/ports/ILLMEngine.ts` — add `isGenerating()` |
| **Modify** | `src/infrastructure/llm/llamaRnAdapter.ts` — implement `isGenerating()` |
| **Modify** | `src/features/chat/domain/usecases/SendMessageUseCase.ts` — memory injection + new limits |
| **Modify** | `src/features/chat/domain/usecases/RegenerateReplyUseCase.ts` — memory injection + new limits |
| **Modify** | `src/features/chat/presentation/viewmodels/ChatViewModel.ts` — busy flag, triggers |
| **Modify** | `src/features/chat/presentation/screens/chat-screen/ChatScreen.tsx` — `useFocusEffect` cleanup |
| **Modify** | `src/core/ports/IAppSettingsRepository.ts` — pinned facts methods |
| **Modify** | `src/features/profile/data/repositories/AppSettingsRepositoryImpl.ts` — pinned facts impl |
| **Modify** | `src/infrastructure/storage/asyncStorageDriver.ts` — `memory:pinnedFacts` key |
| **Modify** | `src/infrastructure/downloads/modelConfig.ts` — add `EMBEDDING_CONFIG` |
| **Modify** | `src/core/di/container.ts` — wire new services |
| **Delete** | `memory_facts` table (migration) |
| **Delete** | `MemoryExtractionUseCase`, `GetMemoryFactsUseCase`, related use cases |
