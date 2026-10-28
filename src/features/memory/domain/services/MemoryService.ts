import { logger } from '@/src/core/logger';
import type { Result } from '@/src/core/types';
import { ok } from '@/src/core/types';
import type { SessionMemory } from '../entities/SessionMemory';
import type { IMemoryRepository } from '../repositories/IMemoryRepository';

/**
 * Routing words by language, matched as whole tokens. A word Set is used instead of `\b` regexes because `\b`
 * does not work for Devanagari/Bengali, and lookbehind or `\p{L}` support is not guaranteed on every JS engine.
 * Includes romanised Hindi/Bengali ("Hinglish") since that is how many users type.
 */
const SELF_REFERENCE_WORDS = new Set([
  'i', 'me', 'my', 'mine',
  'मैं', 'मैंने', 'मुझे', 'मुझको', 'मेरा', 'मेरी', 'मेरे', 'हम', 'हमारा', 'हमारी',
  'আমি', 'আমাকে', 'আমার', 'আমরা', 'আমাদের',
  'mera', 'meri', 'mere', 'mujhe', 'mujhko', 'humara', 'hamara', 'ami', 'amar', 'amake',
]);
const DEICTIC_REFERENCE_WORDS = new Set([
  'this', 'that', 'those', 'it', 'again', 'earlier', 'before', 'previous', 'same',
  'यह', 'ये', 'वह', 'वो', 'इसे', 'उसे', 'पहले', 'फिर', 'दोबारा', 'वैसा', 'वही', 'पिछला',
  'এটা', 'এটি', 'ওটা', 'আগে', 'আবার', 'আগের', 'একই',
  'yeh', 'ye', 'woh', 'wo', 'pehle', 'phir', 'dobara', 'wahi', 'aagey', 'abar', 'age', 'ekoi',
]);
const NON_ENGLISH_QUESTION_OPENERS = new Set([
  'क्या', 'कौन', 'कब', 'कहाँ', 'कहां', 'क्यों', 'कैसे', 'कितना', 'कितने',
  'কি', 'কী', 'কে', 'কখন', 'কোথায়', 'কেন', 'কিভাবে', 'কতটা',
  'kya', 'kaun', 'kab', 'kahan', 'kyun', 'kyon', 'kaise', 'kitna', 'ki', 'ke', 'kothay', 'keno', 'kemon', 'koto',
]);
const GENERIC_KNOWLEDGE_OPENING_REGEX =
  /^(what|who|when|where|why|how)\s+(is|are|was|were|do|does|did|can|could|should|would)\b/i;

function tokenize(text: string): string[] {
  return text.split(/[\s,.!?;:"'()[\]{}\u0964\uFF1F]+/).filter(Boolean);
}

// Only inject semantic memories that are clearly related to the current user query.
const MIN_SEMANTIC_CONFIDENCE = 0.3;

export function requiresMemory(userMessage: string, sessionTurnCount: number): boolean {
  if (!userMessage.trim()) return false;
  const text = userMessage.toLowerCase().trim();
  const words = tokenize(text);
  const tokenCount = text.split(/\s+/).filter(Boolean).length;
  const isQuestion =
    /[?\uFF1F]/.test(text) ||
    GENERIC_KNOWLEDGE_OPENING_REGEX.test(text) ||
    NON_ENGLISH_QUESTION_OPENERS.has(words[0] ?? '');
  const hasSelfReference = words.some((w) => SELF_REFERENCE_WORDS.has(w));
  const hasContextReference = words.some((w) => DEICTIC_REFERENCE_WORDS.has(w));

  // Generic standalone knowledge questions should not pull user memory.
  if (isQuestion && !hasSelfReference && !hasContextReference) return false;

  // Explicitly self-referential asks can use memory, especially after a few turns.
  if (hasSelfReference) return sessionTurnCount >= 2 || tokenCount >= 3;

  // Short contextual follow-ups ("same as before", "do that again") may need memory.
  if (hasContextReference && tokenCount <= 12) return true;

  return false;
}

export class MemoryService {
  // embeddingService injected in step 7 - kept as optional to allow step 6 to work without it.
  private embeddingService: { isReady(): boolean; embed(text: string): Promise<number[]> } | null = null;

  constructor(private readonly memoryRepository: IMemoryRepository) {}

  /** Called in step 7 to upgrade to semantic retrieval. */
  setEmbeddingService(svc: { isReady(): boolean; embed(text: string): Promise<number[]> }): void {
    this.embeddingService = svc;
  }

  async getRelevantMemories(
    userMessage: string,
    sessionTurnCount = 0,
  ): Promise<Result<SessionMemory[]>> {
    const allResult = await this.memoryRepository.getAllSessionMemories();
    if (!allResult.success) return ok([]);

    const all = allResult.data;
    const pinned = all.filter((m) => m.isPinned);
    const nonPinned = all.filter((m) => !m.isPinned);

    logger.debug(`[Memory] DB: ${all.length} memories (${pinned.length} pinned, ${nonPinned.length} non-pinned)`);

    if (!requiresMemory(userMessage, sessionTurnCount)) {
      logger.debug('[Memory] Stateless/generic message - skipping cross-session memory injection');
      return ok([]);
    }

    // Score-based fallback when embedding model is not ready.
    if (!this.embeddingService?.isReady()) {
      const top5 = [...nonPinned].sort((a, b) => b.score - a.score).slice(0, 5);
      logger.debug(`[Memory] Score-based retrieval (embedding not ready) → ${top5.length} non-pinned selected`);
      return ok([...pinned, ...top5]);
    }

    // Semantic retrieval via cosine similarity.
    const queryVec = await this.embeddingService.embed(userMessage);
    if (queryVec.length === 0) {
      const top5 = [...nonPinned].sort((a, b) => b.score - a.score).slice(0, 5);
      logger.debug('[Memory] Embed returned empty vector - falling back to score-based');
      return ok([...pinned, ...top5]);
    }

    const rankedWithConfidence = nonPinned
      .map((mem) => {
        const embedding: number[] = mem.embedding ? (JSON.parse(mem.embedding) as number[]) : [];
        const semantic = cosineSimilarity(queryVec, embedding);
        const finalScore = 0.6 * semantic + 0.4 * mem.score;
        return { mem, semantic, finalScore };
      })
      .filter(({ semantic }) => semantic >= MIN_SEMANTIC_CONFIDENCE)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5)
      .map(({ mem }) => mem);

    if (__DEV__) {
      logger.debug(`[Memory] Semantic retrieval → top ${rankedWithConfidence.length} non-pinned above confidence threshold`);
    }
    return ok([...pinned, ...rankedWithConfidence]);
  }

  /** Embeds summary text and stores the vector. No-op until EmbeddingService is injected and ready. */
  async embedAndSave(memoryId: string, summaryText: string): Promise<void> {
    if (!this.embeddingService?.isReady()) {
      logger.debug('[Memory] embedAndSave: embedding not ready, skipping vector write');
      return;
    }
    logger.debug('[Memory] embedAndSave: embedding summary for', memoryId);
    const vec = await this.embeddingService.embed(summaryText);
    if (vec.length === 0) return;
    await this.memoryRepository.updateSessionMemory(memoryId, {
      embedding: JSON.stringify(vec),
    });
    logger.debug('[Memory] embedAndSave: vector written to DB');
  }

  async evictIfNeeded(max = 10): Promise<void> {
    const count = await this.memoryRepository.countNonPinnedMemories();
    if (!count.success || count.data <= max) return;
    await this.memoryRepository.deleteLowestScoredMemory();
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}
