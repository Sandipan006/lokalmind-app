# LokalMind v2 — Coding Conventions Reference

Full reference for all coding conventions. Cursor rules point here for detail.

---

## 1. Naming Conventions

### File Naming

| Type | Pattern | Example |
|---|---|---|
| Screen | `PascalCase + Screen.tsx` | `ChatScreen.tsx` |
| ViewModel | `PascalCase + ViewModel.ts` | `ChatViewModel.ts` |
| Use Case | `PascalCase + UseCase.ts` | `SendMessageUseCase.ts` |
| Repository Interface | `I + PascalCase + Repository.ts` | `IChatRepository.ts` |
| Repository Impl | `PascalCase + RepositoryImpl.ts` | `ChatRepositoryImpl.ts` |
| Infrastructure Adapter | `camelCase + Adapter.ts` | `llamaRnAdapter.ts` |
| Port Interface | `I + PascalCase.ts` | `ILLMEngine.ts` |
| Entity | `PascalCase.ts` | `Chat.ts`, `Message.ts` |
| Component | `PascalCase.tsx` | `MessageBubble.tsx` |
| Hook | `use + camelCase.ts` | `useViewModel.ts` |
| Test | `{FileName}.test.ts(x)` | `ChatViewModel.test.ts` |
| Route file | `lowercase-hyphen.tsx` | `ai-behavior.tsx`, `[id].tsx` |

### Symbol Naming

- ViewModel class properties: camelCase (`isLoading`, `messages`)
- ViewModel actions: camelCase verbs (`sendMessage`, `loadChats`)
- ViewModel computed: camelCase adjectives/nouns (`hasMessages`, `canSend`)
- Use case public method: always `execute(...args)`
- Repository methods: camelCase verbs (`getChats`, `saveMessage`, `deleteChat`)
- Token constants: `SCREAMING_SNAKE_CASE` (`PRIMARY_ORANGE`, `SPACING_MD`)

### Anti-patterns

- No `Manager`, `Handler`, `Helper`, `Utils` suffixes — use domain-specific names
- No `data`, `info`, `stuff` as variable names
- No `IInterface` redundancy (`ILLMEngine` not `ILLMEngineInterface`)

---

## 2. Folder Structure Rules

### Feature module layout (every feature follows this exactly)

```
src/features/{feature}/
├── presentation/
│   ├── screens/       ← *Screen.tsx files
│   ├── viewmodels/    ← *ViewModel.ts files
│   └── components/    ← feature-specific UI
├── domain/
│   ├── entities/      ← plain TS types/interfaces
│   ├── repositories/  ← I*Repository.ts interfaces
│   └── usecases/      ← *UseCase.ts classes
└── data/
    ├── repositories/  ← *RepositoryImpl.ts
    └── services/      ← low-level data helpers (optional)
```

### Where to put new files

| New file type | Location |
|---|---|
| Screen | `src/features/{feature}/presentation/screens/` |
| ViewModel | `src/features/{feature}/presentation/viewmodels/` |
| Feature component | `src/features/{feature}/presentation/components/` |
| Shared UI component | `src/design-system/components/` |
| Use case | `src/features/{feature}/domain/usecases/` |
| Entity | `src/features/{feature}/domain/entities/` |
| Repository interface | `src/features/{feature}/domain/repositories/` |
| Repository impl | `src/features/{feature}/data/repositories/` |
| Infrastructure adapter | `src/infrastructure/{llm\|whisper\|storage\|downloads}/` |
| Design token | `src/design-system/tokens/` |
| Route | `app/` (expo-router file-based) |

### `app/` rules

- Thin entry points only — no business logic
- Each route file imports one Screen from `src/features/*/presentation/screens/`
- Max 30 lines per `app/` file
- No state, no use cases, no repository calls in `app/` files

---

## 3. Import Conventions

### Always use `@/` alias

```typescript
// Good
import { PRIMARY_ORANGE } from '@/src/design-system/tokens/colors';
import { GlassSurface } from '@/src/design-system/components';

// Bad — deep relative paths
import { PRIMARY_ORANGE } from '../../../design-system/tokens/colors';
```

Single-level relative imports within the same directory are acceptable.

### Import order (blank line between each group)

```typescript
// 1. React / React Native
import React from 'react';
import { View, StyleSheet } from 'react-native';

// 2. Expo packages
import { Stack } from 'expo-router';

// 3. Third-party
import { observer } from 'mobx-react-lite';

// 4. Internal — core/ports/di
import type { ILLMEngine } from '@/src/core/ports';

// 5. Internal — features
import type { Chat } from '@/src/features/chat/domain/entities';

// 6. Internal — design system
import { GlassSurface } from '@/src/design-system/components';
import { PRIMARY_ORANGE } from '@/src/design-system/tokens/colors';
```

### Other rules

- Use `import type` for all type-only imports
- Named exports only in `src/` — default exports only in `app/` (expo-router requirement)
- No circular imports (domain never imports from data/presentation; design-system never imports from features)
- Import from barrel `index.ts` when available, not from individual files

---

## 4. MobX Patterns

### ViewModel template

```typescript
import { makeAutoObservable, runInAction } from 'mobx';

export class ChatViewModel {
  messages: Message[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  constructor(private readonly sendMessageUseCase: SendMessageUseCase) {
    makeAutoObservable(this); // always first in constructor
  }

  setInputText(text: string) { this.inputText = text; }

  async sendMessage() {
    this.isLoading = true;
    const result = await this.sendMessageUseCase.execute(this.inputText);
    runInAction(() => {
      if (!result.success) { this.errorMessage = result.error.message; }
      else { this.messages.push(result.data); }
      this.isLoading = false;
    });
  }

  get hasMessages() { return this.messages.length > 0; }
}
```

### Rules

1. `makeAutoObservable(this)` — always first statement in constructor
2. Async mutations — always in `runInAction()`
3. Computed — getter syntax only, no `@computed` decorator
4. ViewModels receive use cases via constructor — never instantiate inside ViewModel
5. No `useState` for ViewModel state, no `useReducer`, no `useContext` for VM state
6. All screens/components reading VM state must be wrapped with `observer()`
7. MobX allowed only in `presentation/` — never in `domain/`, `data/`, `infrastructure/`

---

## 5. Error Handling

### Result type (all use cases return this)

```typescript
// src/core/types/Result.ts
type Result<T, E = AppError> = { success: true; data: T } | { success: false; error: E };
```

### Rules

- Use cases MUST return `Result<T>` — never throw
- ViewModels MUST handle both `success` and `error` branches
- Infrastructure adapters MUST catch third-party exceptions and wrap as `AppError`
- Never use `any` as error type
- Never swallow errors silently — every `catch` must re-throw as `AppError` or return `err(...)`
- `AppErrorCode` values: `VALIDATION_ERROR`, `STORAGE_ERROR`, `MODEL_NOT_LOADED`, `MODEL_LOAD_FAILED`, `GENERATION_ERROR`, `GENERATION_CANCELLED`, `DOWNLOAD_FAILED`, `TRANSCRIPTION_ERROR`, `MEMORY_EXTRACTION_ERROR`, `NOT_FOUND`, `UNKNOWN_ERROR`

---

## 6. Async Patterns

### LLM generation — required patterns

```typescript
// AbortSignal on every generation call
const controller = new AbortController();
await llmEngine.generateResponse(messages, config, onToken, controller.signal);

// Token debounce — 50ms batch window, never per-token runInAction
private flushTimer: ReturnType<typeof setTimeout> | null = null;
appendToken(token: string) {
  this.buffer += token;
  if (this.flushTimer) return;
  this.flushTimer = setTimeout(() => {
    runInAction(() => { this.streamingText += this.buffer; this.buffer = ''; this.flushTimer = null; });
  }, 50);
}
```

### Rules

- Every LLM generation MUST accept `AbortSignal` — every ViewModel MUST expose `cancelGeneration()`
- Token updates MUST be debounced (50ms)
- Download progress MUST be throttled (250ms)
- Background tasks (memory extraction) MUST be fire-and-forget: `.catch(() => {})`
- Never `await` inside MobX `reaction` or `autorun`
- Always clean up `useEffect` subscriptions

---

## 7. Testing

### File location

Tests are co-located with the code they test:
```
SendMessageUseCase.ts
SendMessageUseCase.test.ts   ← same directory
```

### What must be tested

| Layer | Required |
|---|---|
| Domain — Use Cases | Every UseCase — no exceptions |
| Presentation — ViewModels | Every ViewModel: initial state, each action, computed, async success + failure |
| Data — Repositories | Unit tests with mocked infrastructure drivers |

### Mock at the interface boundary

```typescript
// Good — mock the interface
class MockChatRepository implements IChatRepository {
  saveMessage = jest.fn();
}

// Bad — mock the concrete implementation
jest.mock('expo-sqlite');
```

### PR requirements

- New UseCase → must ship with tests
- New ViewModel → must ship with tests
- Bug fix → must include regression test

---

## 8. Design System

### Glass surfaces

```typescript
// Always use GlassSurface — never GlassView or BlurView directly
import { GlassSurface } from '@/src/design-system/components';

<GlassSurface tier="heavy" style={styles.card}>{children}</GlassSurface>
<GlassSurface tier="heavy" tint="brand" style={styles.selected}>{children}</GlassSurface>
```

Tiers: `ultra` (40px blur, modals) · `heavy` (24px, cards) · `medium` (16px, input bars) · `light` (8px, highlights)
Tints: `default` (neutral) · `brand` (orange-warmed, active states)

### Tokens — never hardcode

```typescript
// Colors → @/src/design-system/tokens/colors
// Typography → @/src/design-system/tokens/typography (FONTS, FONT_SIZE)
// Spacing → @/src/design-system/tokens/spacing (SPACING, BORDER_RADIUS)
```

### Prohibited

- No hex literals in StyleSheet or inline styles
- No named colors (`'white'`, `'black'`)
- No raw pixel values for spacing
- No `Animated` from `react-native` — use `react-native-reanimated` only
- No `GlassView` or `BlurView` imports outside `GlassSurface.tsx`

---

## 9. Git Conventions

### Commit format

```
DD/MM/YYYY - [description] - #N
```

- Date: `DD/MM/YYYY`
- Description: imperative, point-wise with `·` for multiple items
- Serial: `#N` — incrementing, unique across entire history

### Examples

```
04/03/2026 - Add GlassSurface with expo-blur fallback - #1
04/03/2026 - Add ChatViewModel · SendMessageUseCase · IChatRepository - #2
04/03/2026 - Phase 1: LLM pipeline - #3

· Add llamaRnAdapter implementing ILLMEngine
· Add resumable model download
· Add streaming token debounce
```

### Branch naming

`feature/` · `fix/` · `refactor/` · `docs/` · `phase/`

Examples: `feature/reply-to-message` · `fix/streaming-cursor` · `phase/2-chat-ui`

### Rules

- Never commit to `main` directly — always branch + PR
- Never commit `node_modules/`, `.expo/`, `*.gguf`, `*.bin`, `.env`
