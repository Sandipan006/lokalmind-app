import type { Result } from '@/src/core/types';
import { ok } from '@/src/core/types';
import type { SessionMemory } from '../entities/SessionMemory';
import type { IMemoryRepository } from '../repositories/IMemoryRepository';

const DEICTIC_REFERENCE_REGEX = /\b(this|that|those|it|again|earlier|before|previous|same)\b/i;
const SELF_REFERENCE_REGEX = /\b(i|me|my|mine)\b/i;
const GENERIC_KNOWLEDGE_OPENING_REGEX =
  /^(what|who|when|where|why|how)\s+(is|are|was|were|do|does|did|can|could|should|would)\b/i;

// Only inject semantic memories that are clearly related to the current user query.
const MIN_SEMANTIC_CONFIDENCE = 0.3;

function requiresMemory(userMessage: string, sessionTurnCount: number): boolean {
  if (!userMessage.trim()) return false;
  const text = userMessage.toLowerCase().trim();
  const tokenCount = text.split(/\s+/).filter(Boolean).length;
  const isQuestion = text.includes('?') || GENERIC_KNOWLEDGE_OPENING_REGEX.test(text);
  const hasSelfReference = SELF_REFERENCE_REGEX.test(text);
  const hasContextReference = DEICTIC_REFERENCE_REGEX.test(text);

  // Generic standalone knowledge questions should not pull user memory.
  if (isQuestion && !hasSelfReference && !hasContextReference) return false;

  // Explicitly self-referential asks can use memory, especially after a few turns.
  if (hasSelfReference) return sessionTurnCount >= 2 || tokenCount >= 4;

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

    if (__DEV__) console.log(`[Memory] DB: ${all.length} memories (${pinned.length} pinned, ${nonPinned.length} non-pinned)`);

    if (!requiresMemory(userMessage, sessionTurnCount)) {
      if (__DEV__) console.log('[Memory] Stateless/generic message - skipping cross-session memory injection');
      return ok([]);
    }

    // Score-based fallback when embedding model is not ready.
    if (!this.embeddingService?.isReady()) {
      const top5 = [...nonPinned].sort((a, b) => b.score - a.score).slice(0, 5);
      if (__DEV__) console.log(`[Memory] Score-based retrieval (embedding not ready) → ${top5.length} non-pinned selected`);
      return ok([...pinned, ...top5]);
    }

    // Semantic retrieval via cosine similarity.
    const queryVec = await this.embeddingService.embed(userMessage);
    if (queryVec.length === 0) {
      const top5 = [...nonPinned].sort((a, b) => b.score - a.score).slice(0, 5);
      if (__DEV__) console.log('[Memory] Embed returned empty vector - falling back to score-based');
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
      console.log(`[Memory] Semantic retrieval → top ${rankedWithConfidence.length} non-pinned above confidence threshold`);
    }
    return ok([...pinned, ...rankedWithConfidence]);
  }

  /** Embeds summary text and stores the vector. No-op until EmbeddingService is injected and ready. */
  async embedAndSave(memoryId: string, summaryText: string): Promise<void> {
    if (!this.embeddingService?.isReady()) {
      if (__DEV__) console.log('[Memory] embedAndSave: embedding not ready, skipping vector write');
      return;
    }
    if (__DEV__) console.log('[Memory] embedAndSave: embedding summary for', memoryId);
    const vec = await this.embeddingService.embed(summaryText);
    if (vec.length === 0) return;
    await this.memoryRepository.updateSessionMemory(memoryId, {
      embedding: JSON.stringify(vec),
    });
    if (__DEV__) console.log('[Memory] embedAndSave: vector written to DB');
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
