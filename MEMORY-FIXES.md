# LokalMind — Memory System: Gap Fixes

**Companion to `MEMORY-SYSTEM.md` · v1.1**

This document corrects seven implementation gaps and one missing feature identified after the initial PRD was written. Cursor must apply all of these changes on top of `MEMORY-SYSTEM.md`. Where a fix contradicts the original PRD, this document wins.

---

## Fix 1 — Two simultaneous `LlamaContext` instances

### Problem

`EmbeddingService` calls `initLlama()` independently of the chat model. On a 6GB device running a 3–4B chat model, both contexts together can exceed available RAM and cause OOM kills or silent inference failures from the OS memory pressure system.

### Fix

**Never run embedding concurrently with LLM generation.** Two rules:

1. `EmbeddingService.embed()` must only be called when the chat model is idle — i.e., after `onToken` stream completes, never during it.
2. `EmbeddingService.initialize()` must check available RAM before loading. If a chat model is currently loaded, defer until the device is confirmed to have headroom.

**`embeddingService.ts` — add an idle guard:**

```typescript
export class EmbeddingService implements IEmbeddingService {
  private context: LlamaContext | null = null;
  private initPromise: Promise<void> | null = null;
  // Set to true by the chat pipeline during active generation.
  // embed() blocks until this is false.
  private isLlmBusy = false;
  private embedQueue: Array<() => void> = [];

  /** Called by ChatViewModel at generation start. */
  setLlmBusy(busy: boolean): void {
    this.isLlmBusy = busy;
    if (!busy) {
      // Drain any queued embed calls now that LLM is idle.
      const next = this.embedQueue.shift();
      if (next) next();
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.context) return [];

    // If LLM is currently generating, wait for it to finish before embedding.
    if (this.isLlmBusy) {
      await new Promise<void>((resolve) => {
        this.embedQueue.push(resolve);
      });
    }

    try {
      const result = await this.context.embedding(text.slice(0, 1800));
      return result.embedding ?? [];
    } catch {
      return [];
    }
  }

  // ... rest unchanged
}
```

**`ChatViewModel` — notify `EmbeddingService` of generation state:**

```typescript
// In runSendTurn(), before calling sendMessageUseCase.execute():
embeddingService.setLlmBusy(true);

// In the finally block of runSendTurn(), after isStreaming = false:
embeddingService.setLlmBusy(false);
```

`embeddingService` is injected into `ChatViewModel` via the DI container. Add it to the constructor.

**`EmbeddingService.initialize()` — RAM check:**

```typescript
private async _init(): Promise<void> {
  // Only load if usable RAM headroom exceeds the embedding model's footprint.
  // MiniLM Q4_K_M needs ~80MB. We check for 200MB to be conservative.
  const EMBED_MODEL_RAM_BYTES = 200 * 1024 * 1024;
  const usable = await getUsableRamBytes();
  if (usable < EMBED_MODEL_RAM_BYTES) {
    console.warn('[EmbeddingService] Insufficient RAM for embedding model, skipping init');
    return; // isReady() stays false, score-based fallback activates
  }

  const [asset] = await Asset.loadAsync(EMBED_ASSET);
  const modelPath = asset.localUri!.replace(/^file:\/\//, '');
  this.context = await initLlama({
    model: modelPath,
    embedding: true,
    n_ctx: 512,
    n_threads: Platform.OS === 'ios' ? 4 : 2,
    n_gpu_layers: 0,
    use_mlock: false,
  });
}
```

`getUsableRamBytes` is already implemented in `src/infrastructure/device/deviceCapability.ts` — import it directly.

---

## Fix 2 — `SummarizeSessionUseCase` called when chat model is unloaded

### Problem

`onSessionLeave` fires when the user navigates away. By that point the LLM context may have been released (user switched models, app backgrounded, low memory event). Calling `llmEngine.generateResponse()` on an unloaded context throws and produces no summary.

### Fix

Add a readiness guard at the top of `SummarizeSessionUseCase.execute()`:

```typescript
async execute(params: SummarizeSessionParams): Promise<Result<void>> {
  // Guard 1 — model must be loaded. If not, skip silently.
  // The session will not be summarized this time; that is acceptable.
  if (!this.llmEngine.isModelLoaded()) {
    console.log('[Memory] Skipping summarization — no model loaded');
    return ok(undefined);
  }

  // Guard 2 — do not summarize while generation is active.
  // (Belt-and-suspenders: ChatViewModel should not trigger this during streaming,
  // but the use case should be self-contained and safe to call from anywhere.)
  if (this.llmEngine.isGenerating?.()) {
    console.log('[Memory] Skipping summarization — LLM is generating');
    return ok(undefined);
  }

  // ... rest of implementation
}
```

Add `isGenerating(): boolean` to `ILLMEngine` interface and implement it in `LlamaRnAdapter`:

```typescript
// ILLMEngine.ts — add to interface:
isGenerating(): boolean;

// llamaRnAdapter.ts — add to class:
// completionEnd is already a Promise that resolves when generation finishes.
// Track active state with a simple flag:
private generating = false;

isGenerating(): boolean {
  return this.generating;
}

// In generateResponse(), set this.generating = true at the start,
// and this.generating = false in the finally block.
```

---

## Fix 3 — Summarisation prompt fails on small models

### Problem

1–3B models frequently ignore structured output instructions, prefix responses with conversational filler ("Sure! Here's your summary:"), or reformat field names. A strict parser expecting exact field names on exact lines will silently discard valid summaries.

### Fix

**Two changes: a more forgiving prompt, and a fault-tolerant parser.**

**Revised prompt** — simpler instruction, single-word field labels, explicit failure message:

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

Key changes from original: shorter field names (easier for small models), no JSON, no markdown instruction, explicit "No extra text", conversation capped at 3000 chars.

**Fault-tolerant parser** — add to `SummarizeSessionUseCase.ts`:

```typescript
interface ParsedSummary {
  topics: string;
  facts: string;
  done: string;
  open: string;
}

function parseSummaryResponse(raw: string): ParsedSummary {
  const result: ParsedSummary = {
    topics: 'NONE',
    facts: 'NONE',
    done: 'NONE',
    open: 'NONE',
  };

  // Split into lines, try to find each field regardless of casing or spacing
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

function formatParsedSummary(parsed: ParsedSummary, sessionTitle: string, createdAt: number): string {
  const daysAgo = Math.floor((Date.now() - createdAt) / 86_400_000);
  const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;

  const lines = [
    `[${label} · ${sessionTitle}]`,
    parsed.topics !== 'NONE' ? `Topics: ${parsed.topics}` : null,
    parsed.facts !== 'NONE' ? `About user: ${parsed.facts}` : null,
    parsed.done !== 'NONE' ? `Resolved: ${parsed.done}` : null,
    parsed.open !== 'NONE' ? `Open: ${parsed.open}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}
```

**Add `maxTokens: 80` cap** on the summarisation call to prevent runaway output on models that ignore length instructions:

```typescript
const response = await this.llmEngine.generateResponse(
  messages,
  { modelId, temperature: 0.3, maxTokens: 80 }, // low temp for structured output
  undefined,
  signal,
);
```

Use `temperature: 0.3` (not 0.7) — summarisation is not a creative task. Lower temperature produces more consistent structured output on small models.

If `parseSummaryResponse` produces all `NONE` fields (model completely failed), log a warning and do not save the summary. Do not throw.

---

## Fix 4 — `embedding` stored as TEXT: document the decision

### Problem

384 floats × ~7 chars/float = ~2.7KB per row as JSON text. Not a performance issue at 10–50 rows, but it looks like an oversight.

### Resolution

Keep `TEXT`. Do not use `BLOB`. Reason: `JSON.parse` of 2.7KB takes <1ms on iPhone. BLOB serialisation of `Float32Array` requires manual `ArrayBuffer` ↔ `Uint8Array` conversion and is significantly more complex to read back correctly across expo-sqlite versions. The simplicity tradeoff is correct at this scale.

Add this comment to the `session_memories` schema in `MemoryRepositoryImpl.ts`:

```typescript
// embedding TEXT: JSON-serialised float[384].
// ~2.7KB per row. At max 50 rows = 135KB total.
// JSON.parse is <1ms per row — BLOB adds complexity with no measurable benefit.
```

No code change needed.

---

## Fix 5 — `onSessionLeave` trigger: exact lifecycle hook

### Problem

The PRD says "when user navigates away" but doesn't specify which React Navigation / expo-router hook. `useEffect` cleanup, `useFocusEffect` cleanup, back button, and tab switch all fire at different times and some fire multiple times.

### Fix

Use the **`useFocusEffect` cleanup function** in `ChatScreen.tsx`. This is the correct hook because:

- Fires on back navigation ✓
- Fires on tab switch ✓  
- Does not fire on re-renders ✓
- Does not fire multiple times for the same leave event ✓

The existing `useFocusEffect` in `ChatScreen.tsx` (lines 291–300) already has a cleanup `return`. Extend it:

```typescript
useFocusEffect(
  useCallback(() => {
    void refreshDownloadedModel();

    // Return = cleanup, fires when screen loses focus (back nav or tab switch).
    return () => {
      composerInputRef.current?.blur();
      Keyboard.dismiss();

      // Trigger cross-session memory summarisation on leave.
      // Fire-and-forget — never await here, screen is already leaving.
      const sessionId = viewModel.session?.id;
      const turnCount = viewModel.messages.length;
      if (sessionId) {
        void viewModel.maybeSaveSessionMemory(sessionId, turnCount);
      }
    };
  }, [refreshDownloadedModel, viewModel]),
);
```

**`ChatViewModel`** — add the method:

```typescript
async maybeSaveSessionMemory(sessionId: string, turnCount: number): Promise<void> {
  if (turnCount < 6) return;
  if (!this.llmEngine.isModelLoaded()) return; // Fix 2 guard re-applied at call site
  const existing = await this.memoryRepository.getSessionMemoryBySessionId(sessionId);
  if (existing.success && existing.data !== null) return;
  void this.summarizeSessionUseCase.execute({
    sessionId,
    sessionTitle: this.session?.title ?? 'Chat',
    type: 'cross-session',
  });
}
```

**Rolling bucket trigger** — add to `ChatViewModel.runSendTurn()`, in the `runInAction` block after `result.success`:

```typescript
// After the assistant reply is finalised:
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

---

## Fix 6 — Token estimation wrong for non-Latin scripts

### Problem

`Math.ceil(text.length / 4)` works for English (~4 chars/token). For Hindi (Devanagari), Bengali, Tamil, and Arabic, the token/char ratio can be 1:1 or worse — a 1200-char system prompt in Hindi is ~1200 tokens, not ~300. LokalMind's target market includes heavy Hindi/Bengali users.

### Fix

Replace the flat `/ 4` ratio with a script-aware estimator in `tokenBudget.ts`:

```typescript
/**
 * Estimates token count for a string.
 *
 * Token-per-character ratios by script (empirical for LLaMA tokenizer):
 * - ASCII/Latin: ~4 chars per token
 * - CJK (Chinese, Japanese, Korean): ~1.5 chars per token
 * - Indic scripts (Devanagari, Bengali, Tamil, Telugu, etc.): ~1 char per token
 * - Arabic/Hebrew: ~2 chars per token
 *
 * We use the worst-case ratio for the dominant script in the string.
 * Fast: single-pass char scan, no regex.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let indicChars = 0;
  let cjkChars = 0;
  let arabicChars = 0;
  let total = text.length;

  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i) ?? 0;
    if (
      (cp >= 0x0900 && cp <= 0x097F) || // Devanagari (Hindi, Marathi)
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
    } else if (cp >= 0x0600 && cp <= 0x06FF) { // Arabic
      arabicChars++;
    }
  }

  // Use worst-case ratio for the dominant non-Latin script present.
  const dominantNonLatin = Math.max(indicChars, cjkChars, arabicChars);
  const nonLatinFraction = total > 0 ? dominantNonLatin / total : 0;

  if (nonLatinFraction > 0.3) {
    // Predominantly non-Latin — use 1 char/token (worst case for Indic)
    return total;
  } else if (nonLatinFraction > 0.1) {
    // Mixed script — use 2 chars/token
    return Math.ceil(total / 2);
  }

  // Mostly Latin/ASCII — standard 4 chars/token
  return Math.ceil(total / 4);
}
```

**Tighten the system prompt char cap** in the Profile UI. Change the hard cap from 1200 to **800 chars** to ensure even a full-Devanagari system prompt stays under 300 tokens. Update the `savePinnedFacts` and `saveModeSystemPromptOverride` validation accordingly.

---

## Fix 7 — `RegenerateReplyUseCase` missing memory injection and updated limits

### Problem

`SendMessageUseCase` gets memory injection and updated token limits (Fix applied in original PRD). `RegenerateReplyUseCase` is a parallel use case that also builds LLM messages — it currently has the old `MAX_LLM_CONVERSATION_MESSAGES = 20` and `MAX_CHARS_PER_LLM_MESSAGE = 14_000` limits and no memory injection. Regenerated replies will be context-blind.

### Fix

`RegenerateReplyUseCase` should share `buildContextMessages()` with `SendMessageUseCase`. Both need the same constructor additions.

**Updated `RegenerateReplyUseCase` constructor:**

```typescript
export class RegenerateReplyUseCase {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly llmEngine: ILLMEngine,
    private readonly appSettingsRepository: IAppSettingsRepository,
    private readonly memoryService: MemoryService,       // new
    private readonly memoryRepository: IMemoryRepository, // new
  ) {}
```

**Updated `execute()` — replace the `turns` build block:**

```typescript
// The last message in historyUpToUserTurn is the user message being regenerated against.
const userMessage = historyUpToUserTurn[historyUpToUserTurn.length - 1];
const queryText = userMessage?.content ?? '';

const modeOverride = await this.appSettingsRepository.getModeSystemPromptOverride(mode);
const systemPrompt = resolveSystemPromptForChat(mode, modeOverride);
const pinnedFacts = await this.appSettingsRepository.getPinnedFacts();

const [memoriesResult, summariesResult] = await Promise.all([
  this.memoryService.getRelevantMemories(queryText),
  this.memoryRepository.getSessionSummaries(assistantMessage.sessionId),
]);

// historyUpToUserTurn is already the right slice — pass all of it as history
// (the last item is the user turn, so currentMessage is that item)
const historyOnly = historyUpToUserTurn.slice(0, -1);
const currentMsg: LLMMessage = {
  role: 'user',
  content: composeTurnContentForLlm(
    historyUpToUserTurn[historyUpToUserTurn.length - 1]!,
    (c) => c.slice(0, 2_000), // same MAX_CHARS_PER_LLM_MESSAGE as SendMessageUseCase
  ),
};

const llmMessages = buildContextMessages({
  systemPrompt,
  pinnedFacts,
  crossSessionMemories: memoriesResult.success ? memoriesResult.data : [],
  inSessionSummaries: summariesResult.success ? summariesResult.data : [],
  history: historyOnly.slice(-9).map((m) => ({ // 10 turns max, same as SendMessageUseCase
    role: m.role as LLMMessage['role'],
    content: composeTurnContentForLlm(m, (c) => c.slice(0, 2_000)),
  })),
  currentMessage: currentMsg,
});
```

**Update `container.ts`** — `RegenerateReplyUseCase` construction gains `memoryService` and `memoryRepository`, same as `SendMessageUseCase`.

---

## Fix 8 — Re-embed after user edits a memory

### Problem

When a user edits a memory's text in `MemoryScreen`, the stored `embedding` vector corresponds to the old text. All future semantic retrieval will use the stale vector — the edited content will be ignored or incorrectly ranked.

### Fix

In `MemoryViewModel.updateMemory()`, regenerate the embedding after saving the text edit:

```typescript
// MemoryViewModel.ts
async updateMemory(id: string, newSummary: string): Promise<void> {
  runInAction(() => { this.isSaving = true; });

  try {
    // Step 1 — save the new text + mark as user-edited
    const saveResult = await this.updateSessionMemoryUseCase.execute(id, {
      summary: newSummary,
      isUserEdited: true,
    });

    if (!saveResult.success) {
      runInAction(() => { this.error = saveResult.error.message; });
      return;
    }

    // Step 2 — regenerate the embedding for the new text.
    // Fire-and-forget: if embedding service is not ready, the old vector
    // stays null until the next background embed pass.
    // Never await — this should not block the UI save confirmation.
    void this.memoryService.embedAndSave(id, newSummary).catch((e) => {
      console.warn('[Memory] Re-embed after edit failed:', e);
    });

    // Step 3 — optimistically update local state
    runInAction(() => {
      this.memories = this.memories.map((m) =>
        m.id === id ? { ...m, summary: newSummary, isUserEdited: true } : m,
      );
    });
  } finally {
    runInAction(() => { this.isSaving = false; });
  }
}
```

`embedAndSave` in `MemoryService` already exists per the original PRD spec:

```typescript
// MemoryService.ts — no changes needed here, already correct:
async embedAndSave(memoryId: string, summaryText: string): Promise<void> {
  if (!this.embeddingService.isReady()) return;
  const vec = await this.embeddingService.embed(summaryText);
  if (vec.length === 0) return;
  await this.memoryRepository.updateSessionMemory(memoryId, {
    embedding: JSON.stringify(vec),
  });
}
```

The ViewModel calls it; the service executes it. No circular dependency.

---

## Summary of changes to `MEMORY-SYSTEM.md`

| Section | Change |
|---|---|
| `EmbeddingService` | Add `setLlmBusy()` + embed queue (Fix 1) |
| `EmbeddingService.initialize()` | Add RAM check via `getUsableRamBytes()` (Fix 1) |
| `ILLMEngine` | Add `isGenerating(): boolean` (Fix 2) |
| `LlamaRnAdapter` | Implement `isGenerating()` (Fix 2) |
| `SummarizeSessionUseCase` | Add model readiness guard (Fix 2) |
| Summarisation prompt | Simplified field names, 3000-char cap (Fix 3) |
| `parseSummaryResponse()` | New fault-tolerant parser function (Fix 3) |
| `generateResponse()` call in summariser | `maxTokens: 80`, `temperature: 0.3` (Fix 3) |
| `session_memories` schema comment | Document TEXT vs BLOB rationale (Fix 4) |
| `ChatScreen.tsx` `useFocusEffect` | Add session leave trigger in cleanup (Fix 5) |
| `ChatViewModel` | Add `maybeSaveSessionMemory()` (Fix 5) |
| `ChatViewModel.runSendTurn()` | Add rolling bucket trigger (Fix 5) |
| `estimateTokens()` | Script-aware implementation (Fix 6) |
| System prompt char cap | 1200 → 800 (Fix 6) |
| `RegenerateReplyUseCase` | Add memory injection + updated limits (Fix 7) |
| `container.ts` | Add `memoryService` + `memoryRepository` to `RegenerateReplyUseCase` (Fix 7) |
| `MemoryViewModel.updateMemory()` | Call `embedAndSave()` after text edit (Fix 8) |
