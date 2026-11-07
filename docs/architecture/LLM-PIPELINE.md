# LokalMind - LLM Pipeline

How a chat turn runs: engine contract, turn sequence, context assembly, queue, and the Whisper boundary.

> LokalMind has no memory feature. Cross-session memories, the learned profile, pinned facts, in-chat summaries and embeddings were removed. A turn sends only the system prompt, recent history and the current message.

---

## Core Interfaces

### ILLMEngine (`src/core/ports/ILLMEngine.ts`)

`llama.rn` is wrapped behind this contract. `LlamaRnAdapter` (`src/infrastructure/llm/llamaRnAdapter.ts`) is the only file that imports it.

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
  getContextSize(): number | null;   // active n_ctx, null when nothing is loaded
  isGenerating(): boolean;
  releaseAllContexts(): Promise<void>;
}
```

**Native call queue.** Load, generate, unload and release all run through one serial queue (`runExclusive`) because native `llama.rn` throws "Context is busy" if a call starts before the last one unwinds.

- A call that waits in the queue re-checks the model it needs once it runs. `initialize` skips the load if the model is already there; `generateResponse` throws if another model was loaded meanwhile.
- A queued call whose `AbortSignal` is already aborted is dropped without waiting.
- Aborting the running call stops generation at once (`stopCompletion`), even with other work queued.
- A model load that finishes after the 60 s timeout is released, not kept.

### IWhisperEngine (`src/core/ports/IWhisperEngine.ts`)

`whisper.rn` is isolated behind one adapter contract for on-device transcription. Voice input is planned (TODO G.1); the adapter is a stub.

---

## Chat Turn Sequence

Send, edit and regenerate all go through `ChatViewModel.runStreamedTurn`, which creates a fresh `AbortController`, streams tokens, turns a thrown error into a failed result, and always resets the busy flags.

```
ChatViewModel.sendMessage()
  ├─ if already streaming:
  │    enqueue in pendingQueue (max 3), clear composer, return
  └─ runSendTurn()
      ├─ optimistic user bubble added
      └─ runStreamedTurn()
          └─ SendMessageUseCase.execute()
              ├─ persist user message + assistant placeholder (fail -> return error)
              ├─ ensure the model is loaded
              ├─ fit the current message to the input limit (tell the user if cut)
              ├─ read the mode prompt override
              ├─ buildContextMessages() with token budgeting
              ├─ llmEngine.generateResponse(..., maxTokens, signal)
              └─ save final content (fail -> return error, no success notification)
      ├─ success: add reply, generate title in the background
      │  failure: show the error, drop the streaming bubble
      └─ flush next queued message (FIFO)
```

`EditMessageUseCase` rewrites the edited message and drops later ones, then the same send path runs. `RegenerateReplyUseCase` follows the same context steps and saves the new reply as an alternate of the old one.

---

## Context Assembly

`buildContextMessages()` (`src/features/chat/domain/utils/tokenBudget.ts`) is a pure function.

Inputs: system prompt (mode default or the user's mode override), history, current message, the active `n_ctx` and the reserved output tokens (`env.models.chatMaxTokens`, default 512).

1. **Pre-cap.** Before assembly, history is limited to the last 10 messages (including the current one), and each older message to 2000 characters (head 900 + tail 900, with a marker). The current message is not cut this way.
2. **Current message.** `fitInputToTokens` cuts it to `maxInputTokens(n_ctx, reserved)`. When it cuts, the reply starts with a visible notice (`INPUT_TRUNCATION_NOTICE`).
3. **System prompt.** Capped at 300 tokens.
4. **History.** Soft budget 800 tokens: oldest pairs are dropped, but at least 4 turns stay.
5. **Hard limit.** The whole prompt never exceeds `min(3800, n_ctx - reservedOutput - 64)` tokens. If it would, oldest history pairs are dropped even below the 4-turn floor. The system prompt and current message always stay.

Token counts come from `estimateTokens`, a character-based estimate, not the real tokenizer.

---

## Generation Settings

`SendMessageUseCase` and `RegenerateReplyUseCase` pass `temperature: 0.7` and `maxTokens: env.models.chatMaxTokens` to the engine, so `n_predict` is never unbounded. Stop tokens come from the model entry in `modelConfig.ts`. `<think>...</think>` blocks (DeepSeek R1, Qwen thinking mode) are stripped from the saved text by the adapter and shown separately while streaming by `MessageRenderer`.

---

## Queue Behavior

- State: `ChatViewModel.pendingQueue`, in memory only.
- Maximum depth: `MAX_PENDING_MESSAGE_QUEUE = 3`.
- Each item keeps text, mode and optional reply metadata. It can be edited or cancelled while waiting.
- The next item is sent automatically after every finished, failed or stopped turn.
- Switching to another chat clears the queue.

---

## Busy State and App Updates

`src/core/appBusy.ts` tracks work a reload would destroy: chat typing, streaming or model loading, and active downloads. `useOtaUpdates` fetches an update when found but reloads only when the app is idle.

---

## Whisper STT (Contract Level)

- Transcription stays on device through `IWhisperEngine`.
- Output text is inserted into the composer for review before send.
- Download and readiness checks come before recording.
