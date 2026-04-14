# LokalMind v2 — LLM Pipeline

Covers current chat generation flow, context assembly, queue behavior, memory integration, and voice/STT boundary contracts.

---

## Core Interfaces

### ILLMEngine (`src/core/ports/ILLMEngine.ts`)

`llama.rn` is wrapped behind this contract. Key runtime controls:

```typescript
export interface ILLMEngine {
  initialize(modelId: string, config: LLMConfig): Promise<void>;
  generateResponse(
    messages: LLMMessage[],
    config: LLMConfig,
    onToken?: (token: string) => void,
    signal?: AbortSignal
  ): Promise<LLMResponse>;
  unloadModel(): Promise<void>;
  isModelLoaded(): boolean;
  getCurrentModelId(): string | null;
  isGenerating(): boolean;
  releaseAllContexts(): Promise<void>;
}
```

### IWhisperEngine (`src/core/ports/IWhisperEngine.ts`)

`whisper.rn` remains isolated behind a single adapter contract for on-device transcription.

---

## Chat Turn Sequence

```
ChatViewModel.sendMessage()
  ├─ if already streaming:
  │    enqueue in pendingQueue (max 3), clear composer, return
  └─ runSendTurn()
      ├─ optimistic user bubble added
      ├─ SendMessageUseCase.execute()
      │   ├─ persist user + assistant placeholder rows
      │   ├─ ensure model is loaded
      │   ├─ fetch context inputs in parallel:
      │   │   - mode override
      │   │   - pinned facts
      │   │   - user profile summary
      │   │   - relevant cross-session memories
      │   │   - in-session summaries
      │   ├─ buildContextMessages() with token budgeting
      │   └─ llmEngine.generateResponse(..., signal)
      ├─ stream tokens into UI
      ├─ finalize assistant row content
      ├─ optional background summarization triggers
      └─ flush next queued message (FIFO)
```

---

## Prompt Resolution and Context

- System prompt still resolves by priority: mode override -> mode default fallback logic.
- `buildContextMessages()` composes a single bounded prompt from:
  - system prompt
  - pinned facts (`memory:pinnedFacts`)
  - derived user profile (`memory:userProfile`)
  - relevant `session_memories`
  - recent `session_summaries`
  - capped chat history + current user turn
- Raw conversation payload is capped to the last 10 messages (`MAX_LLM_CONVERSATION_MESSAGES`) before budget assembly, and each message is hard-clamped to 2000 chars before send.
- `buildContextMessages()` then applies token budgets (system/memory/history) and can trim oldest history pairs further while keeping a minimum floor.

---

## Queue Behavior

- Queue state: `ChatViewModel.pendingQueue`.
- Maximum depth: `MAX_PENDING_MESSAGE_QUEUE = 3`.
- Queue is in-memory only.
- Each queued item keeps text, mode, and optional reply metadata.
- Flush is automatic after every completed/failed/aborted turn.

---

## Memory Pipeline (Current)

Current memory model is summary-based (not `memory_facts`):

- `session_summaries`: rolling in-session summary buckets.
- `session_memories`: cross-session memory cards (optional embeddings + scores).
- `memory:pinnedFacts`: always-injected user facts.
- `memory:userProfile`: compact profile summary used for personalization.

Generation-time retrieval:

1. Relevant memories are selected by `MemoryService`.
2. Embedding path is used when available; fallback ranking uses score/recency.
3. Retrieved memories are injected only through token-budgeted context assembly.

Background updates:

- `ChatViewModel` can trigger bucket summarization and cross-session memory save after turns.
- Summarization is skipped if model is unloaded or already generating.

---

## Whisper STT Pipeline (Contract Level)

- Voice transcription remains on-device through `IWhisperEngine`.
- Output text is inserted into composer for user review before send.
- Download/readiness checks happen before recording/transcription flows.
