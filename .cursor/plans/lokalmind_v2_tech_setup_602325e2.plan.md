---
name: LokalMind v2 Tech Setup
overview: Create a full technical architecture document and strict cursor rules for LokalMind v2, then reset the Expo scaffold to a clean base structure ready for development.
todos:
  - id: tech-doc
    content: Create docs/ARCHITECTURE.md — full technical architecture document
    status: completed
  - id: cursor-rules
    content: Create .cursor/rules/ — 5 strict cursor rule files (architecture, naming, folder-structure, mobx, design-system)
    status: completed
  - id: scaffold-reset
    content: "Delete default boilerplate and create clean folder skeleton with placeholder fileStarting the ui of the "
    status: completed
isProject: false
---

# LokalMind v2 — Tech Doc + Cursor Rules + Scaffold Reset

## What gets created

### 1. Technical Architecture Document

File: `docs/ARCHITECTURE.md`

Covers:

- Full folder structure (feature modules + infrastructure + design-system + app/)
- All layer rules (domain has zero 3rd-party deps, presentation never imports infra, etc.)
- `ILLMEngine` interface (in `src/core/ports/ILLMEngine.ts`)
- `IWhisperEngine` interface (in `src/core/ports/IWhisperEngine.ts`)
- SQLite schema (chats, messages, memory_facts tables)
- AsyncStorage key registry
- Model config (all 5 models with GGUF filenames, RAM tiers, device recommendations)
- Design token spec (Liquid Glass tiers via `expo-glass-effect`, color tokens, typography, fallback strategy for iOS < 26)
- LLM pipeline sequence (SendMessage → EnsureModelLoaded → ResolveSystemPrompt → BuildPrompt → generate → Finalize → MemoryExtraction)
- Message queue + reply-to-message pipeline
- Whisper STT pipeline
- Navigation route tree (expo-router v6)
- DI container approach (constructor injection, no global imports)

### 2. Cursor Rules

Files in `.cursor/rules/`:

- `architecture.mdc` — layer enforcement: no infra imports in domain/presentation, no direct llama.rn/whisper.rn usage outside adapters
- `naming.mdc` — file naming (PascalCase screens, camelCase hooks, `*UseCase.ts`, `*RepositoryImpl.ts`, `*Adapter.ts`, `I*.ts` for interfaces)
- `folder-structure.mdc` — where new files must go (feature module layout, shared infra, design-system)
- `mobx.mdc` — MobX rules: ViewModels only in `presentation/`, `makeAutoObservable` in constructor, no MobX in domain/data layers
- `design-system.mdc` — no hardcoded colors/fonts outside `design-system/tokens/`, always use `GlassView`/`GlassContainer` from `expo-glass-effect` for glass surfaces (never raw `expo-blur`), always guard with `isGlassEffectAPIAvailable()` + fallback

### 3. Scaffold Reset

- Delete default boilerplate: `app/(tabs)/`, `app/modal.tsx`, `components/`, `constants/`, `hooks/` (default ones), `assets/` placeholder images
- Create clean folder skeleton:

```
  src/
    core/
      ports/         ← ILLMEngine.ts, IWhisperEngine.ts
      entities/      ← (empty, ready)
      di/            ← container.ts
    features/
      chat/
      models/
      profile/
      memory/
    infrastructure/
      llm/
      whisper/
      storage/
      downloads/
    design-system/
      tokens/        ← colors.ts, typography.ts, glass.ts
      components/    ← (empty, ready)
  app/
    _layout.tsx      ← root stack (cleaned)
    index.tsx        ← splash entry
    onboarding/
    (tabs)/
  

```

## Glass Effect Implementation Notes

- **Package**: `expo-glass-effect` (requires Expo SDK 55, not 54 as in PRD — bump needed)
- **Native glass**: `GlassView` / `GlassContainer` from `expo-glass-effect` — uses iOS 26+ `UIVisualEffectView`
- **Fallback**: iOS < 26 → `expo-blur` `BlurView` with manual `rgba` background (same token values from PRD)
- **Guard pattern** (required everywhere before rendering `GlassView`):

```ts
  import { isGlassEffectAPIAvailable, GlassView } from 'expo-glass-effect';
  // render GlassView only if isGlassEffectAPIAvailable() === true, else render fallback
  

```

- **Tint for active/selected states**: use `tintColor="rgba(255,66,11,0.15)"` on `GlassView` (PRD's orange-warmed glass)
- `**GlassContainer`**: use for grouped surfaces (e.g. input bar + send button, sidebar header)
- A shared `GlassSurface` component in `design-system/components/` will wrap this logic — all features use `GlassSurface`, never `GlassView` directly

## Key files to reference from old code

- `lokalmind-oldcode/src/llm/llamaCppBridge.ts` — port ILLMEngine methods from this
- `lokalmind-oldcode/src/services/db/database.ts` — extend schema with memory_facts
- `lokalmind-oldcode/src/services/db/storage.ts` — reuse AsyncStorage pattern
- `lokalmind-oldcode/src/constants/colors.ts` — migrate + extend with v2 Liquid Glass tokens

## Model lineup (as in PRD, GGUF filenames from local files)

- Qwen 3.5 0.8B Q4_K_M → `Qwen_Qwen3.5-0.8B-Q4_K_M.gguf`
- Qwen 3.5 2B Q4_K_M
- Qwen 3.5 4B Q4_K_M
- Gemma 3 4B Q4_K_M
- DeepSeek R1 1.5B Q4_K_M → `DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf`

