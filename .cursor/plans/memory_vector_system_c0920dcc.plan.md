---
name: Memory Vector System
overview: Implement the full Memory & Vector Embedding System from `docs/MEMORY-VECTOR-SYSTEM.md` across 8 sequential steps, from token limit reductions through to the Memory Screen UI.
todos:
  - id: step1-token-limits
    content: Reduce MAX_LLM_CONVERSATION_MESSAGES to 10 and MAX_CHARS_PER_LLM_MESSAGE to 2000 in SendMessageUseCase and RegenerateReplyUseCase
    status: completed
  - id: step2-pinned-facts
    content: Add MEMORY_PINNED_FACTS key, IAppSettingsRepository methods, AppSettingsRepositoryImpl impl, GetPinnedFactsUseCase, SavePinnedFactsUseCase, pinned facts UI field in Profile screen
    status: completed
  - id: step3-sqlite-tables
    content: Add session_summaries and session_memories tables to ChatRepositoryImpl, create SessionSummary/SessionMemory entities, IMemoryRepository, MemoryRepositoryImpl, wire in container.ts
    status: completed
  - id: step4-token-budget
    content: Create tokenBudget.ts with estimateTokens() and buildContextMessages()
    status: completed
  - id: step5-summarisation
    content: Add isGenerating() to ILLMEngine + LlamaRnAdapter, create SummarizeSessionUseCase, add maybeSaveSessionMemory() to ChatViewModel, extend ChatScreen useFocusEffect cleanup, update app/chat/[id].tsx
    status: completed
  - id: step6-memory-service
    content: Create MemoryService (score-based retrieval), GetRelevantMemoryUseCase, GetSessionSummariesUseCase, inject into SendMessageUseCase and RegenerateReplyUseCase via buildContextMessages()
    status: completed
  - id: step7-embedding-service
    content: Add EMBEDDING_CONFIG to modelConfig.ts, create EmbeddingService in infrastructure/llm/, trigger silent download in ModelRepositoryImpl.startDownload(), upgrade MemoryService with cosine similarity, add setLlmBusy() calls in ChatViewModel
    status: completed
  - id: step8-memory-screen
    content: Create MemoryViewModel, MemoryScreen, and app/profile/memory.tsx route
    status: completed
isProject: false
---

# Memory & Vector Embedding System Implementation

## Key files modified / created

**Modified:**
- [`src/core/ports/ILLMEngine.ts`](src/core/ports/ILLMEngine.ts) - add `isGenerating(): boolean`
- [`src/core/ports/IAppSettingsRepository.ts`](src/core/ports/IAppSettingsRepository.ts) - add `getPinnedFacts()` / `savePinnedFacts()`
- [`src/core/di/container.ts`](src/core/di/container.ts) - wire `embeddingService`, `memoryRepository`, `memoryService`, `summarizeSessionUseCase`
- [`src/infrastructure/llm/llamaRnAdapter.ts`](src/infrastructure/llm/llamaRnAdapter.ts) - `private generating = false` flag
- [`src/infrastructure/downloads/modelConfig.ts`](src/infrastructure/downloads/modelConfig.ts) - add `EMBEDDING_CONFIG`
- [`src/infrastructure/storage/deleteDownloadedModelFiles.ts`](src/infrastructure/storage/deleteDownloadedModelFiles.ts) - delete embedding file
- [`src/infrastructure/storage/asyncStorageDriver.ts`](src/infrastructure/storage/asyncStorageDriver.ts) - add `MEMORY_PINNED_FACTS` key, remove `SETTINGS_MEMORY_ENABLED`
- [`src/features/chat/domain/usecases/SendMessageUseCase.ts`](src/features/chat/domain/usecases/SendMessageUseCase.ts) - new limits + memory context
- [`src/features/chat/domain/usecases/RegenerateReplyUseCase.ts`](src/features/chat/domain/usecases/RegenerateReplyUseCase.ts) - new limits + memory context
- [`src/features/chat/presentation/viewmodels/ChatViewModel.ts`](src/features/chat/presentation/viewmodels/ChatViewModel.ts) - busy flag, bucket trigger, `maybeSaveSessionMemory()`
- [`src/features/chat/presentation/screens/chat-screen/ChatScreen.tsx`](src/features/chat/presentation/screens/chat-screen/ChatScreen.tsx) - extend `useFocusEffect` cleanup
- [`src/features/profile/data/repositories/AppSettingsRepositoryImpl.ts`](src/features/profile/data/repositories/AppSettingsRepositoryImpl.ts) - implement pinned facts
- [`src/features/chat/data/repositories/ChatRepositoryImpl.ts`](src/features/chat/data/repositories/ChatRepositoryImpl.ts) - add `session_summaries` + `session_memories` tables
- [`src/features/models/data/repositories/ModelRepositoryImpl.ts`](src/features/models/data/repositories/ModelRepositoryImpl.ts) - silent embedding download trigger
- [`app/chat/[id].tsx`](app/chat/[id].tsx) - updated `ChatViewModel` + use case constructors (new deps)

**Created:**
- `src/infrastructure/llm/embeddingService.ts`
- `src/features/chat/domain/utils/tokenBudget.ts`
- `src/features/memory/domain/entities/SessionSummary.ts`
- `src/features/memory/domain/entities/SessionMemory.ts`
- `src/features/memory/domain/repositories/IMemoryRepository.ts`
- `src/features/memory/domain/services/MemoryService.ts`
- `src/features/memory/domain/usecases/SummarizeSessionUseCase.ts`
- `src/features/memory/domain/usecases/GetRelevantMemoryUseCase.ts`
- `src/features/memory/domain/usecases/GetSessionSummariesUseCase.ts`
- `src/features/memory/domain/usecases/GetPinnedFactsUseCase.ts`
- `src/features/memory/domain/usecases/SavePinnedFactsUseCase.ts`
- `src/features/memory/data/repositories/MemoryRepositoryImpl.ts`
- `src/features/memory/presentation/viewmodels/MemoryViewModel.ts`
- `src/features/memory/presentation/screens/memory-screen/MemoryScreen.tsx`
- `app/profile/memory.tsx`

---

## Step 1 - Token limits

In both `SendMessageUseCase.ts` and `RegenerateReplyUseCase.ts`:
```typescript
const MAX_LLM_CONVERSATION_MESSAGES = 10;  // was 20
const MAX_CHARS_PER_LLM_MESSAGE = 2_000;   // was 14_000
```
Adjust the `truncateMessageContentForLlm` head/tail splits to `900`/`900` accordingly.

---

## Step 2 - Pinned facts

- `asyncStorageDriver.ts`: add `MEMORY_PINNED_FACTS: 'memory:pinnedFacts'` to `STORAGE_KEYS`; remove `SETTINGS_MEMORY_ENABLED`
- `IAppSettingsRepository.ts`: add `getPinnedFacts(): Promise<string>` and `savePinnedFacts(facts: string): Promise<void>`
- `AppSettingsRepositoryImpl.ts`: implement using `storage.getString(STORAGE_KEYS.MEMORY_PINNED_FACTS)` / `storage.setString(..., facts.slice(0, 800))`
- Create `GetPinnedFactsUseCase` and `SavePinnedFactsUseCase` in `src/features/memory/domain/usecases/`
- Wire both in `container.ts` (exposed via getters)
- Add pinned facts `TextInput` field to the existing Profile/AI-behavior screen - multiline, 800 char cap, char counter, auto-save on blur debounced 500ms

---

## Step 3 - SQLite tables + MemoryRepository

Add to `ChatRepositoryImpl.ensureInitialized()` (after existing tables):
```sql
CREATE TABLE IF NOT EXISTS session_summaries (id, session_id, bucket_index, summary, turn_start, turn_end, created_at, FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_summaries_session ON session_summaries(session_id, bucket_index);
CREATE TABLE IF NOT EXISTS session_memories (id, session_id, session_title, summary, embedding, score, is_pinned, is_user_edited, created_at, updated_at, FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE);
```

Create entities, `IMemoryRepository`, and `MemoryRepositoryImpl` (takes `ISQLiteDriver` via constructor - same pattern as `ChatRepositoryImpl`). Add `memoryRepository` to `container.ts`.

---

## Step 4 - Token budget utility

Create `src/features/chat/domain/utils/tokenBudget.ts`:
- `estimateTokens(text)`: single-pass codepoint scan; Indic → 1:1, CJK → 1:1.5, Arabic → 1:2, Latin → 1:4
- `buildContextMessages(params: ContextBudget): LLMMessage[]`: assembles the single system message with memory blocks (omit empty blocks entirely); applies budget cuts in specified order (cross-session lowest-score first → in-session oldest bucket → history oldest pairs, floor 4 turns)

Both `SendMessageUseCase` and `RegenerateReplyUseCase` import from this shared utility - never duplicate.

---

## Step 5 - Summarisation

- `ILLMEngine.ts`: add `isGenerating(): boolean`
- `LlamaRnAdapter.ts`: `private generating = false`; set true at start of `generateResponse()`, false in finally
- Create `SummarizeSessionUseCase` - readiness guard, fault-tolerant parser, score calc via `computeScore(createdAt, turnCount)`, saves bucket to `session_summaries` or cross-session to `session_memories` then calls `evictIfNeeded`
- `ChatViewModel`: add `summarizeSessionUseCase`, `memoryRepository` to constructor; add `maybeSaveSessionMemory(sessionId, turnCount)` method; add rolling bucket trigger after `runInAction` in `runSendTurn()` when `turnCount % 20 === 0`
- `ChatScreen.tsx`: extend existing `useFocusEffect` cleanup to also call `viewModel.maybeSaveSessionMemory(sessionId, turnCount)`
- Update `app/chat/[id].tsx` to pass new deps to `ChatViewModel` constructor

---

## Step 6 - MemoryService + context injection (score-based)

Create `src/features/memory/domain/services/MemoryService.ts`:
- `getRelevantMemories(userMsg)`: load all, separate pinned; `requiresMemory()` heuristic; fallback to score-based top-5
- `embedAndSave(memoryId, text)`: stub (no-op until step 7)
- `evictIfNeeded(max=10)`: delete lowest non-pinned when count > max

Create `GetRelevantMemoryUseCase` and `GetSessionSummariesUseCase`.

Update `SendMessageUseCase.execute()`: replace current system+history block with `buildContextMessages()` call using retrieved memory. Add `memoryService` + `memoryRepository` to constructor. Same for `RegenerateReplyUseCase`.

Update `container.ts` and `app/chat/[id].tsx` with new use case constructor args.

---

## Step 7 - EmbeddingService + download

- `modelConfig.ts`: add `EMBEDDING_CONFIG` const (id, filename, cdnFolder, sizeBytes, description)
- `deleteDownloadedModelFiles.ts`: add `EMBEDDING_CONFIG.filename` deletion block
- Create `src/infrastructure/llm/embeddingService.ts`: `IEmbeddingService` + `EmbeddingService` as specified in doc (file check, RAM headroom, `initLlama({embedding:true})`, LLM-busy queue)
- `ModelRepositoryImpl.startDownload()`: after `markDownloaded`, fire-and-forget download of `EMBEDDING_CONFIG` if file not already present, then call `embeddingService.initialize()`. URL: `${cdnBaseUrl}/models/${EMBEDDING_CONFIG.cdnFolder}/${EMBEDDING_CONFIG.filename}`
- `MemoryService`: accept `IEmbeddingService` via constructor; use cosine similarity when `isReady()`; implement `embedAndSave()`
- `ChatViewModel`: add `embeddingService`; call `setLlmBusy(true/false)` around generation
- `container.ts`: `const embeddingService = new EmbeddingService()` at module level; fire-and-forget `initialize()` in `initializeContainer()`; `memoryRepository` receives `sqliteDriver`; `memoryService` receives `memoryRepository, embeddingService`

---

## Step 8 - Memory Screen UI

- `app/profile/memory.tsx`: expo-router entry point → `<MemoryScreen />`
- `MemoryViewModel`: MobX, `makeAutoObservable(this)` first; state: `memories`, `pinnedFacts`, `isLoading`, `isSaving`, `error`; methods: `load()`, `updateMemory(id, text)` (save + fire-and-forget re-embed), `togglePin(id)`, `deleteMemory(id)`, `savePinnedFacts(text)`
- `MemoryScreen`: pinned facts input at top (800 char cap, char counter, auto-save on blur); scrollable list of `session_memories` (pinned first, then `created_at DESC`); collapsible cards with pin/delete buttons; confirmation bottom sheet before delete; "You edited this" label when `isUserEdited`; empty state text

---

## Architecture notes

- `EmbeddingService` lives in `src/infrastructure/llm/` - only place using `llama.rn` for embedding
- `MemoryService` lives in `src/features/memory/domain/services/` - no infra imports, receives `IEmbeddingService` interface
- `buildContextMessages` is a pure function in `tokenBudget.ts` - shared, never duplicated
- All use case async mutations in ViewModels wrapped in `runInAction`; all use cases return `Result<T>`
- Summarisation is always fire-and-forget - never awaited in the UI path
