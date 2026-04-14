# LokalMind v2 — Memory System

**Feature PRD · v1.0**

| Status | Ready for implementation |
| :---- | :---- |
| **Author** | Sandipan |
| **Feature** | Semantic Memory — Pinned Facts + Session Summaries + Embedding Retrieval |
| **Target** | v2.1 |
| **Platform** | iOS |

---

## Overview

LokalMind currently has no memory across sessions. Every chat starts cold — the LLM has no knowledge of who the user is, what they've discussed before, or any facts about them. This is the single biggest gap between LokalMind and cloud AI assistants.

This document specifies the full memory system: how facts are stored, how sessions are summarised, how the embedding model works, how context is built per message, and what the user sees in the UI.

---

## Goals

- The LLM always knows basic facts about the user (name, preferences, language) without the user repeating them every session.
- Long sessions (50+ messages) do not degrade in quality due to context overflow.
- Memory retrieval is semantically relevant — the right context is injected for each query, not just the most recent.
- Every token sent to the LLM is within a strict mobile-appropriate budget.
- The entire system is offline. No backend, no vectors database, no cloud.
- Memory is transparent and user-controlled. Users can read, edit, pin, and delete their memories.

---

## Non-Goals

- Real-time memory extraction during streaming (always runs after reply completes)
- Cross-device sync of memories
- Vector index structures (FAISS, Annoy, etc.) — at 10–50 memories, brute-force cosine is sufficient
- LangGraph or any graph-based memory orchestration

---

## Architecture Overview

```
App binary (bundled)
└── assets/models/minilm.gguf          ~45MB — all-MiniLM-L6-v2 Q4_K_M

New files
├── src/infrastructure/llm/embeddingService.ts
├── src/features/memory/domain/entities/SessionMemory.ts
├── src/features/memory/domain/entities/SessionSummary.ts
├── src/features/memory/domain/repositories/IMemoryRepository.ts
├── src/features/memory/domain/services/MemoryService.ts
├── src/features/memory/domain/usecases/SummarizeSessionUseCase.ts
├── src/features/memory/domain/usecases/GetRelevantMemoryUseCase.ts
├── src/features/memory/domain/usecases/SavePinnedFactsUseCase.ts
├── src/features/memory/domain/usecases/GetPinnedFactsUseCase.ts
├── src/features/memory/data/repositories/MemoryRepositoryImpl.ts
├── src/features/memory/presentation/screens/memory-screen/MemoryScreen.tsx
├── src/features/memory/presentation/viewmodels/MemoryViewModel.ts
└── src/features/chat/domain/utils/tokenBudget.ts

Modified files
├── src/features/chat/domain/usecases/SendMessageUseCase.ts   — inject memory
├── src/features/chat/presentation/viewmodels/ChatViewModel.ts — trigger summarisation
├── src/infrastructure/storage/sqliteDriver.ts (via ChatRepositoryImpl) — 2 new tables
├── src/core/ports/IAppSettingsRepository.ts                  — pinned facts
├── src/features/profile/data/repositories/AppSettingsRepositoryImpl.ts
└── src/core/di/container.ts                                  — wire new services
```

---

## Embedding Model

### Decision: Bundle in app binary

`all-MiniLM-L6-v2` at Q4_K_M quantisation is **~45MB** as a GGUF file. This is bundled directly into the app binary — not downloaded separately.

**Why bundle:**
- Memory works from first launch, no download required
- No CDN dependency for a core feature
- ~45MB binary increase is acceptable (smallest chat model is 550MB as a separate download)
- No "embedding model not ready" edge case to handle in the UI
- Invisible to the user — no progress bar, no "downloading memory engine" copy

**Why not the 80MB unquantised `.bin`:**
The existing codebase already uses Q4_K_M GGUF for all models. MiniLM in GGUF at Q4_K_M produces embeddings with negligible quality loss versus unquantised. 45MB vs 80MB is a meaningful binary size difference.

### Model Details

| Property | Value |
|---|---|
| Model | all-MiniLM-L6-v2 |
| Format | GGUF Q4_K_M |
| File | `assets/models/minilm.gguf` |
| Size | ~45MB |
| Embedding dimensions | 384 |
| Max input tokens | 512 |
| Inference speed | ~30–50ms per embedding on iPhone 13 |
| Battery cost | Negligible — 50–100x cheaper than chat inference |

### `EmbeddingService` (`src/infrastructure/llm/embeddingService.ts`)

This is the only file in the codebase that loads the MiniLM model. It follows the same isolation pattern as `llamaRnAdapter.ts` — no other file imports `llama.rn` for embedding purposes.

```typescript
import { Asset } from 'expo-asset';
import { initLlama } from 'llama.rn';
import type { LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';

const EMBED_ASSET = require('../../../assets/models/minilm.gguf');

export interface IEmbeddingService {
  initialize(): Promise<void>;
  embed(text: string): Promise<number[]>;
  isReady(): boolean;
}

export class EmbeddingService implements IEmbeddingService {
  private context: LlamaContext | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.context) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    const [asset] = await Asset.loadAsync(EMBED_ASSET);
    const modelPath = asset.localUri!.replace(/^file:\/\//, '');
    this.context = await initLlama({
      model: modelPath,
      embedding: true,       // embed-only context, no chat completion
      n_ctx: 512,
      n_threads: Platform.OS === 'ios' ? 4 : 2,
      n_gpu_layers: 0,       // embedding models do not benefit from GPU on mobile
      use_mlock: false,
    });
  }

  async embed(text: string): Promise<number[]> {
    if (!this.context) return [];
    try {
      const result = await this.context.embedding(text.slice(0, 1800)); // ~450 token guard
      return result.embedding ?? [];
    } catch {
      return []; // graceful degradation — memory falls back to score-based retrieval
    }
  }

  isReady(): boolean {
    return this.context !== null;
  }
}
```

**Critical:** `EmbeddingService` creates a **completely separate `LlamaContext`** from the chat model. The two contexts never share memory or interfere with each other. The embedding context is tiny (512 ctx, CPU-only) and has negligible RAM footprint.

**Initialisation timing:** `embeddingService.initialize()` is called in `container.ts` immediately after `initializeContainer()` — fire-and-forget (`void`). The chat model loads and works normally while MiniLM loads in the background. If a user asks something before MiniLM is ready, `MemoryService` falls back to score-based retrieval silently.

### Metro config (`metro.config.js`)

Create if it does not exist. Required for Expo to include `.gguf` as a bundled asset:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('gguf', 'bin');
module.exports = config;
```

---

## Data Model

### New SQLite Tables

Add both tables inside `ChatRepositoryImpl.ensureInitialized()`, after the existing table creation:

```sql
-- Rolling in-session summaries
-- One row per 20-turn bucket per session.
-- Deleted automatically when the parent session is deleted (CASCADE).
CREATE TABLE IF NOT EXISTS session_summaries (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  bucket_index  INTEGER NOT NULL,   -- 0 = turns 1–20, 1 = turns 21–40, etc.
  summary       TEXT NOT NULL,      -- structured text, ~60 tokens
  turn_start    INTEGER NOT NULL,   -- first turn number in this bucket
  turn_end      INTEGER NOT NULL,   -- last turn number in this bucket
  created_at    INTEGER NOT NULL,   -- Unix ms
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_summaries_session
  ON session_summaries(session_id, bucket_index);

-- Cross-session long-term memory
-- One row per completed session (≥6 turns).
-- Pinned and user-edited rows are never auto-evicted.
CREATE TABLE IF NOT EXISTS session_memories (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL,
  session_title  TEXT NOT NULL,     -- title at time of summarisation
  summary        TEXT NOT NULL,     -- formatted memory block, ~60 tokens
  embedding      TEXT,              -- JSON float[384], null until EmbeddingService ready
  score          REAL NOT NULL DEFAULT 0.0,  -- recency + engagement, used for eviction
  is_pinned      INTEGER NOT NULL DEFAULT 0, -- 1 = never auto-evicted
  is_user_edited INTEGER NOT NULL DEFAULT 0, -- 1 = user edited text, never auto-evicted
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
```

### New AsyncStorage Key

| Key | Type | Description |
|---|---|---|
| `memory:pinnedFacts` | `string` | User's pinned facts — always injected into every chat. Max 600 chars. |

Add to the key registry in `asyncStorageDriver.ts`.

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

## Repository Interface

**`src/features/memory/domain/repositories/IMemoryRepository.ts`**

```typescript
import type { Result } from '@/src/core/types';
import type { SessionMemory } from '../entities/SessionMemory';
import type { SessionSummary } from '../entities/SessionSummary';

export interface IMemoryRepository {
  // session_summaries
  saveSessionSummary(data: Omit<SessionSummary, never>): Promise<Result<void>>;
  getSessionSummaries(sessionId: string): Promise<Result<SessionSummary[]>>;

  // session_memories
  saveSessionMemory(data: SessionMemory): Promise<Result<void>>;
  updateSessionMemory(
    id: string,
    fields: Partial<Pick<SessionMemory, 'summary' | 'embedding' | 'score' | 'isPinned' | 'isUserEdited'>>,
  ): Promise<Result<void>>;
  deleteSessionMemory(id: string): Promise<Result<void>>;
  getAllSessionMemories(): Promise<Result<SessionMemory[]>>;
  getSessionMemoryBySessionId(sessionId: string): Promise<Result<SessionMemory | null>>;

  // eviction
  deleteLowestScoredMemory(): Promise<Result<void>>;
  countNonPinnedMemories(): Promise<Result<number>>;
}
```

Implemented by **`src/features/memory/data/repositories/MemoryRepositoryImpl.ts`** — takes `ISQLiteDriver` as constructor argument, same pattern as `ChatRepositoryImpl`.

---

## Summarisation

### Use Case: `SummarizeSessionUseCase`

**`src/features/memory/domain/usecases/SummarizeSessionUseCase.ts`**

Handles both rolling in-session summarisation (every 20 turns) and cross-session memory (on session close). Reuses the currently loaded chat `ILLMEngine` — no second model load needed.

```typescript
export interface SummarizeSessionParams {
  sessionId: string;
  sessionTitle: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  type: 'bucket' | 'cross-session';
  bucketIndex?: number;   // required when type === 'bucket'
  turnStart?: number;
  turnEnd?: number;
}
```

### Summarisation Prompt

This prompt is designed specifically for 1–4B models. It produces structured, consistent output and stays under 60 tokens output every time.

```
Summarize this conversation. Output ONLY these fields, one per line. No preamble. No markdown. No other text.

TOPICS: [comma-separated topics, max 5]
USER_FACTS: [persistent facts about the user — name, job, language, preferences, ongoing projects]
DECISIONS: [conclusions or choices the user made]
OPEN: [unresolved questions or pending tasks, or NONE]

Conversation:
{conversation_text}
```

The `{conversation_text}` is the raw message content for the bucket, capped at 4000 chars before passing to the LLM to prevent context overflow during the summarisation call itself.

### Summary Storage Format

Stored in `session_memories.summary` as a human-readable block:

```
[3 days ago · Python Chat]
TOPICS: FastAPI, async patterns, Pydantic
USER_FACTS: User is building a FastAPI app. Prefers short code examples.
DECISIONS: Will use Pydantic v2 models. Avoid sync endpoints.
OPEN: NONE
```

This is what gets injected into the LLM context and what the user sees in the Memory screen.

### Score Calculation

Computed at write time and updated on each session close:

```typescript
function computeScore(createdAt: number, turnCount: number): number {
  const daysAgo = (Date.now() - createdAt) / 86_400_000;
  const recency = 1 / (1 + daysAgo);          // 1.0 → 0 over weeks
  const engagement = Math.min(turnCount / 50, 1); // normalised, caps at 50 turns
  return (0.7 * recency) + (0.3 * engagement);
}
```

### Trigger Logic

All summarisation is fire-and-forget. The user never waits for it. Both triggers live in `ChatViewModel`.

**Rolling bucket** — inside `onAssistantReplyFinished(sessionId, totalTurnCount)`:

```typescript
// Fire after every assistant reply completes
if (totalTurnCount > 0 && totalTurnCount % 20 === 0) {
  void summarizeSessionUseCase.execute({
    sessionId,
    type: 'bucket',
    bucketIndex: Math.floor(totalTurnCount / 20) - 1,
    // turnStart and turnEnd computed from totalTurnCount
  });
}
```

**Cross-session memory** — inside `onSessionLeave(sessionId, totalTurnCount)`:

```typescript
// Fire when user navigates away from the session
if (totalTurnCount < 6) return; // too short to be worth saving
const existing = await memoryRepository.getSessionMemoryBySessionId(sessionId);
if (existing.success && existing.data !== null) return; // already saved
void summarizeSessionUseCase.execute({ sessionId, type: 'cross-session' });
```

---

## Memory Retrieval

### `MemoryService` (`src/features/memory/domain/services/MemoryService.ts`)

The retrieval logic. Pure TypeScript, no third-party dependencies.

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

function recencyScore(createdAt: number): number {
  const daysAgo = (Date.now() - createdAt) / 86_400_000;
  return 1 / (1 + daysAgo);
}
```

**Retrieval flow:**

1. Load all `session_memories` rows from SQLite (~10–50 rows max)
2. Separate `pinned` from `unpinned`
3. If `EmbeddingService.isReady()` is false → return pinned + top-N by `score` (fallback)
4. If ready → embed the current user message, compute cosine similarity against all `unpinned` rows
5. Final score: `(0.6 × semantic) + (0.4 × recency)`
6. Return pinned (always) + top-N unpinned by final score

**At memory write time** — after saving a new `session_memory` row, `MemoryService.embedAndSave(memoryId, summaryText)` is called:

1. Embed the summary text
2. Store result as `JSON.stringify(float[])` in `session_memories.embedding`
3. If `EmbeddingService` is not ready yet, skip — `embedding` column stays `null`, fallback handles it

### Eviction

Called after every `saveSessionMemory()`:

```typescript
async evictIfNeeded(max = 10): Promise<void> {
  const count = await memoryRepository.countNonPinnedMemories();
  if (count.data <= max) return;
  // Deletes the single non-pinned, non-user-edited row with the lowest score
  await memoryRepository.deleteLowestScoredMemory();
}
```

Pinned (`is_pinned = 1`) and user-edited (`is_user_edited = 1`) rows are **never evicted**. The eviction ceiling only applies to auto-generated, non-pinned memories.

---

## Token Budget

### `tokenBudget.ts` (`src/features/chat/domain/utils/tokenBudget.ts`)

A pure function. No side effects, no dependencies. Called inside `SendMessageUseCase.execute()` to assemble the final `LLMMessage[]` array.

```typescript
// 1 token ≈ 4 chars for English/mixed content — conservative estimate
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

**Budget allocation:**

| Block | Allocation | Notes |
|---|---|---|
| System prompt | ≤ 300 tokens | User-editable. Hard cap 1200 chars enforced at save. |
| Pinned facts | ≤ 100 tokens | Always included. Never cut. |
| Cross-session memory | ≤ 200 tokens | Drop lowest-scored memories first if over |
| In-session summaries | ≤ 150 tokens | Drop oldest buckets first if over |
| History turns | ≤ 800 tokens | Drop oldest pairs first, floor = 4 turns |
| Current user message | remainder | Never cut |
| **Total budget** | **~3800 tokens** | Leaves headroom under 4096 |

**Priority cut order** (when total exceeds budget):

1. Drop lowest-scored cross-session memories (keep pinned)
2. Drop oldest in-session summary buckets
3. Drop oldest history turn pairs (down to 4 turn floor)
4. Truncate system prompt tail + append `[truncated]` (last resort)

### Context Assembly

`buildContextMessages(budget: ContextBudget): LLMMessage[]` returns the final array that gets passed to `ILLMEngine.generateResponse()`.

The system message is assembled as a single string with clearly labelled blocks:

```
{system_prompt}

[About you]
{pinned_facts}

[Past conversations]
{cross_session_memory_block}

[Earlier in this conversation]
{in_session_summaries_block}
```

Blocks are omitted entirely (not rendered as empty headings) when their content is empty.

---

## Updated LLM Pipeline

The existing chat turn sequence in `LLM-PIPELINE.md` gains three new steps between `ResolveSystemPromptUseCase` and `ILLMEngine.generateResponse()`:

```
ResolveSystemPromptUseCase.execute(chatId, mode)
  │
  ▼
GetPinnedFactsUseCase.execute()
  └── AsyncStorage key: memory:pinnedFacts
      Returns '' if not set
  │
  ▼
GetRelevantMemoryUseCase.execute(userMessage.content)
  ├── Loads all session_memories from SQLite
  ├── Embeds user message via EmbeddingService (or fallback to score-based)
  └── Returns top-5 SessionMemory rows (pinned always, rest by semantic score)
  │
  ▼
GetSessionSummariesUseCase.execute(sessionId)
  └── Loads all session_summaries for this session from SQLite
  │
  ▼
buildContextMessages(ContextBudget)
  └── Assembles final LLMMessage[] within token budget
  │
  ▼
ILLMEngine.generateResponse(messages, config, onToken)
```

After `FinalizeMessageUseCase`:

```
MaybeSummarizeBucketUseCase.maybeTrigger(sessionId, turnCount)
  └── if turnCount % 20 === 0 → SummarizeSessionUseCase (void, background)
```

---

## `SendMessageUseCase` Changes

### Immediate changes (do before any memory work)

```typescript
// src/features/chat/domain/usecases/SendMessageUseCase.ts
const MAX_LLM_CONVERSATION_MESSAGES = 10;  // was 20
const MAX_CHARS_PER_LLM_MESSAGE = 2_000;   // was 14_000
```

These two changes alone significantly improve response latency and battery life. Ship them immediately, independently of the rest of this feature.

### Constructor change

```typescript
constructor(
  private readonly chatRepository: IChatRepository,
  private readonly llmEngine: ILLMEngine,
  private readonly appSettingsRepository: IAppSettingsRepository,
  private readonly memoryService: MemoryService,               // new
  private readonly memoryRepository: IMemoryRepository,        // new
) {}
```

### `execute()` change — replace the system prompt + llmMessages block

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

---

## Pinned Facts

### What they are

A single free-text field, max 600 chars, always injected into every LLM call as the `[About you]` block. Bypasses all retrieval logic — always present regardless of token pressure (only cut as the absolute last resort).

Intended for facts the user wants the AI to always know: name, language preference, job, ongoing project context.

### `IAppSettingsRepository` additions

```typescript
getPinnedFacts(): Promise<string>;
savePinnedFacts(facts: string): Promise<void>;   // enforces 600 char max at write time
```

AsyncStorage key: `memory:pinnedFacts`

### Use Cases

- `GetPinnedFactsUseCase` — calls `appSettingsRepository.getPinnedFacts()`
- `SavePinnedFactsUseCase` — validates max length, calls `appSettingsRepository.savePinnedFacts()`

---

## Memory Screen UI

**Route:** `app/profile/memory.tsx` (new screen, linked from `ProfileAccountScreen`)

**`MemoryViewModel`** observable state:

```typescript
@observable memories: SessionMemory[] = [];
@observable pinnedFacts: string = '';
@observable isLoading = false;
@observable isSaving = false;
```

### Layout

```
Memory

Pinned facts
┌─────────────────────────────────────────────┐
│ Things LokalMind always knows about you.    │
│                                             │
│ [multiline text input, 600 char max]        │
│                                          42/600│
└─────────────────────────────────────────────┘

Past conversations

  📝  3 days ago · Python Chat               [pin] [delete]
  ┌─────────────────────────────────────────┐
  │ TOPICS: FastAPI, async, Pydantic        │
  │ USER_FACTS: Building a FastAPI app...   │
  │ DECISIONS: Use Pydantic v2              │
  │ OPEN: NONE                              │
  └─────────────────────────────────────────┘

  📝  1 week ago · Cooking                   [pin] [delete]
  ┌─────────────────────────────────────────┐
  │ TOPICS: Keto diet, Indian recipes       │
  │ USER_FACTS: Vegetarian. Prefers paneer. │
  │ ...                                     │
  └─────────────────────────────────────────┘
```

### Behaviour rules

- Pinned facts field auto-saves on blur (debounced 500ms). No explicit save button.
- Memory rows: tap to expand full text, tap again to collapse.
- Pin toggle: flips `is_pinned`, updates score — pinned memories show a pin icon.
- Delete: confirmation sheet before delete, `is_user_edited = 1` rows show "You edited this" label.
- Empty state: "No memories yet. LokalMind remembers things as you chat." with a subtle illustration.
- Pinned rows shown first in the list, then sorted by `created_at DESC`.

---

## Graceful Degradation

Every part of the memory system has a defined fallback. Nothing blocks the user from chatting.

| Component | Failure mode | Fallback |
|---|---|---|
| `EmbeddingService.initialize()` | MiniLM asset fails to load | `isReady()` returns `false`. Retrieval uses score-based top-N. |
| `EmbeddingService.embed()` | Inference throws | Returns `[]`. Cosine similarity returns 0. Score-based fallback activates. |
| `SummarizeSessionUseCase` | LLM returns unparseable output | Log warning, do not save summary. Session continues normally. |
| `MemoryRepository` query | SQLite error | Return `ok([])`. Memory block omitted from context. Chat unaffected. |
| `GetPinnedFactsUseCase` | AsyncStorage read fails | Return `''`. Pinned block omitted. Chat unaffected. |
| Token budget overflow | All cuts exhausted | Truncate system prompt tail + `[truncated]`. Never crash. |

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

// Instantiate at module level (same as llmEngine, downloadService)
const embeddingService = new EmbeddingService();

// In initializeContainer():
const memoryRepository = new MemoryRepositoryImpl(sqliteDriver);
const memoryService = new MemoryService(memoryRepository, embeddingService);

// Fire-and-forget — embedding loads while user is onboarding or browsing
// Never awaited. Memory degrades gracefully if not ready.
void embeddingService.initialize().catch((e) => {
  console.warn('[EmbeddingService] Background init failed, using score-based fallback:', e);
});

// Expose in container object:
// memoryRepository, memoryService, embeddingService
// + new use case instances for SendMessageUseCase and ChatViewModel
```

`SendMessageUseCase` construction in `container.ts` gains `memoryService` and `memoryRepository` as additional arguments.

---

## Implementation Order

Build in this exact order. Each step is independently shippable.

| Step | What | Why first |
|---|---|---|
| 1 | Reduce `MAX_LLM_CONVERSATION_MESSAGES` → 10 and `MAX_CHARS_PER_LLM_MESSAGE` → 2000 | Immediate speed + battery win. Zero risk. |
| 2 | Pinned facts — AsyncStorage key + `IAppSettingsRepository` methods + UI field in Profile | Zero ML, zero new tables. Solves "LLM doesn't know my name" immediately. |
| 3 | New SQLite tables + `IMemoryRepository` + `MemoryRepositoryImpl` | Foundation that everything else depends on. |
| 4 | `tokenBudget.ts` + update `SendMessageUseCase` to use it | Required before memory injection. |
| 5 | `SummarizeSessionUseCase` + trigger in `ChatViewModel` | Rolling summaries + cross-session memory starts building. |
| 6 | `MemoryService` (score-based retrieval only) + inject into `SendMessageUseCase` | Memory is now injected into every chat. No embeddings yet. |
| 7 | Bundle MiniLM + `metro.config.js` + `EmbeddingService` | Embed at write + semantic retrieval at query. Full system live. |
| 8 | Memory Screen UI | User visibility and control. |

---

## Files Changed Summary

| Action | File |
|---|---|
| **Create** | `assets/models/minilm.gguf` |
| **Create** | `metro.config.js` |
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
| **Modify** | `src/features/chat/domain/usecases/SendMessageUseCase.ts` |
| **Modify** | `src/features/chat/presentation/viewmodels/ChatViewModel.ts` |
| **Modify** | `src/infrastructure/storage/sqliteDriver.ts` (via `ChatRepositoryImpl`) |
| **Modify** | `src/core/ports/IAppSettingsRepository.ts` |
| **Modify** | `src/features/profile/data/repositories/AppSettingsRepositoryImpl.ts` |
| **Modify** | `src/core/di/container.ts` |
| **Modify** | `src/infrastructure/storage/asyncStorageDriver.ts` (new key constant) |
| **Update** | `docs/DATA-MODEL.md` (new tables + new AsyncStorage key) |
| **Update** | `docs/LLM-PIPELINE.md` (new steps in chat turn sequence) |
