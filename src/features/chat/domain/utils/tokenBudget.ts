import type { LLMMessage } from '@/src/core/ports/ILLMEngine';
import type { SessionMemory } from '@/src/features/memory/domain/entities/SessionMemory';
import type { SessionSummary } from '@/src/features/memory/domain/entities/SessionSummary';

/**
 * Token-per-character ratios by script (empirical for LLaMA tokenizer):
 * - Latin/ASCII: ~4 chars per token
 * - Indic (Devanagari, Bengali, Tamil, etc.): ~1 char per token (worst-case)
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

  if (nonLatinFraction > 0.3) return total;                    // Indic worst-case: 1 char/token
  if (nonLatinFraction > 0.1) return Math.ceil(total / 2);    // Mixed
  return Math.ceil(total / 4);                                 // Latin standard
}

export interface ContextBudget {
  systemPrompt: string;
  pinnedFacts: string;
  /** LLM-maintained living document about the user. Injected as a coherent narrative. */
  userProfile: string;
  /** Cross-session memories retrieved from past conversations. Optional - omit for backward compat. */
  crossSessionMemories?: SessionMemory[];
  inSessionSummaries: SessionSummary[];
  history: LLMMessage[];
  currentMessage: LLMMessage;
  /** Active llama.rn n_ctx. When given, the prompt never exceeds contextSize - reservedOutputTokens. */
  contextSize?: number | undefined;
  /** Tokens kept free for the reply (the maxTokens passed to the engine). */
  reservedOutputTokens?: number;
}

const BUDGET_SYSTEM = 300;
const BUDGET_PINNED = 100;            // never cut
const BUDGET_USER_PROFILE = 200;      // living profile document
const BUDGET_CROSS_SESSION = 200;     // past-conversation memories, highest score first
const BUDGET_IN_SESSION = 150;        // cut oldest bucket first
const BUDGET_HISTORY = 800;           // cut oldest pairs, floor = 4 turns
const BUDGET_TOTAL = 3800;
/** Slack for chat-template tokens (role markers) that estimateTokens does not count. */
const TEMPLATE_OVERHEAD = 64;

/** Hard prompt limit: the soft total, lowered to what the active context window can really hold. */
function promptLimit(contextSize: number | undefined, reservedOutputTokens: number): number {
  if (!contextSize) return BUDGET_TOTAL;
  return Math.min(BUDGET_TOTAL, Math.max(0, contextSize - reservedOutputTokens - TEMPLATE_OVERHEAD));
}

/**
 * Assembles the final LLMMessage[] array within the token budget.
 * Pure function - no side effects, no dependencies.
 * All memory blocks injected into a single system message; empty blocks are omitted.
 */
export function buildContextMessages(params: ContextBudget): LLMMessage[] {
  const { systemPrompt, pinnedFacts, userProfile, crossSessionMemories = [], inSessionSummaries, history, currentMessage, contextSize, reservedOutputTokens = 0 } = params;

  // --- System prompt: cap at BUDGET_SYSTEM tokens ---
  let resolvedSystem = systemPrompt;
  if (estimateTokens(resolvedSystem) > BUDGET_SYSTEM) {
    let lo = 0;
    let hi = resolvedSystem.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (estimateTokens(resolvedSystem.slice(0, mid)) <= BUDGET_SYSTEM) lo = mid;
      else hi = mid - 1;
    }
    resolvedSystem = resolvedSystem.slice(0, lo) + ' [truncated]';
  }

  // --- In-session summaries: budget BUDGET_IN_SESSION, cut oldest first ---
  let inSessionBudgetLeft = BUDGET_IN_SESSION;
  const sortedSummaries = [...inSessionSummaries].sort((a, b) => a.bucketIndex - b.bucketIndex);
  const includedSummaries: SessionSummary[] = [];
  for (const s of sortedSummaries) {
    const t = estimateTokens(s.summary);
    if (inSessionBudgetLeft >= t) {
      includedSummaries.push(s);
      inSessionBudgetLeft -= t;
    }
  }

  // --- Build system message ---
  // Memory sections always carry an explicit "this is about the USER" label so any
  // system prompt (including user-customised ones) can't cause the model to misread them.
  let pinnedBlock = '';
  let profileBlock = '';
  let crossBlock = '';
  let summaryBlock = '';

  if (pinnedFacts.trim()) {
    const facts = estimateTokens(pinnedFacts) <= BUDGET_PINNED
      ? pinnedFacts
      : pinnedFacts.slice(0, Math.floor(BUDGET_PINNED * 4));
    pinnedBlock = `\nUser notes: ${facts}`;
  }

  if (userProfile.trim()) {
    const profile = estimateTokens(userProfile) <= BUDGET_USER_PROFILE
      ? userProfile
      : userProfile.slice(0, Math.floor(BUDGET_USER_PROFILE * 4));
    // Explicit anti-role-confusion rule for small models (0.8B): these facts are about the human user.
    // The assistant must never claim them as its own identity.
    profileBlock =
      `\n[Human profile - about the USER, not the assistant]
Use these facts only to answer about the user.
Never say "I am <user>" or "I am building <user project>".
Never say "I am currently working on your project".
When referring to these facts, address the user as "you/your".
If the user asks about themselves (e.g. "who am I", "what am I building"), reply in second person ("You are...", "You are building...").
Do not invent project details, stack choices, or plans not explicitly present in user notes/profile/history.
If the user asks a similar follow-up question, do not repeat the exact previous answer; provide a concise delta or short restatement in 1-2 lines.
${profile}`;
  }

  // --- Cross-session memories: budget BUDGET_CROSS_SESSION, highest score first ---
  if (crossSessionMemories.length > 0) {
    let crossBudgetLeft = BUDGET_CROSS_SESSION;
    const includedMemories: string[] = [];
    const sortedMemories = [...crossSessionMemories].sort((a, b) => b.score - a.score);
    for (const mem of sortedMemories) {
      const t = estimateTokens(mem.summary);
      if (crossBudgetLeft >= t) {
        includedMemories.push(mem.summary);
        crossBudgetLeft -= t;
      }
    }
    if (includedMemories.length > 0) {
      crossBlock = `\n[Past conversations]\n${includedMemories.join('\n\n')}`;
    }
  }

  if (includedSummaries.length > 0) {
    const block = includedSummaries.map((s) => s.summary).join('\n\n');
    summaryBlock = `\n[Earlier in this conversation]\n${block}`;
  }

  // Least important blocks are dropped first when the hard limit is hit. System prompt and pinned notes are never cut.
  const optional = { profile: profileBlock, cross: crossBlock, summary: summaryBlock };
  const renderSystem = () => resolvedSystem + pinnedBlock + optional.profile + optional.cross + optional.summary;

  // --- History: soft budget BUDGET_HISTORY, cut oldest pairs, floor = 4 turns ---
  const MIN_HISTORY_TURNS = 4;
  let historyToInclude = [...history];
  while (
    historyToInclude.length > MIN_HISTORY_TURNS &&
    estimateTokens(historyToInclude.map((m) => m.content).join(' ')) > BUDGET_HISTORY
  ) {
    // Drop oldest pair (user + assistant) from the front.
    historyToInclude = historyToInclude.slice(2);
  }

  // --- Hard limit: always keep the current message; the 4-turn floor does not apply here ---
  const limit = promptLimit(contextSize, reservedOutputTokens);
  const currentTokens = estimateTokens(currentMessage.content);
  const total = () =>
    estimateTokens(renderSystem()) +
    historyToInclude.reduce((sum, m) => sum + estimateTokens(m.content), 0) +
    currentTokens;

  while (total() > limit && historyToInclude.length > 0) {
    historyToInclude = historyToInclude.slice(2);
  }
  for (const key of ['summary', 'cross', 'profile'] as const) {
    if (total() <= limit) break;
    optional[key] = '';
  }

  return [
    { role: 'system', content: renderSystem() },
    ...historyToInclude,
    currentMessage,
  ];
}
