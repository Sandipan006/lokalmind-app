import type { Result } from '@/src/core/types';
import { ok } from '@/src/core/types';
import type { SessionMemory } from '../entities/SessionMemory';
import type { IMemoryRepository } from '../repositories/IMemoryRepository';

// Contextual markers that suggest the user wants cross-session context.
const CONTEXTUAL_MARKERS = [
  'like before', 'same as', 'we discussed', 'you said', 'remember',
  'earlier', 'last time', 'that thing', 'as usual', 'my name', 'i told you',
];

function requiresMemory(userMessage: string, sessionTurnCount: number): boolean {
  // Always inject cross-session memories at the start of a session — history is empty so context must come from memory.
  if (sessionTurnCount < 3) return true;
  const text = userMessage.toLowerCase();
  const hasContextualRef = CONTEXTUAL_MARKERS.some((m) => text.includes(m));
  const isShortStateless = text.split(' ').length < 12 && !hasContextualRef;
  return !isShortStateless;
}

export class MemoryService {
  // embeddingService injected in step 7 — kept as optional to allow step 6 to work without it.
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

    console.log(`[Memory] DB: ${all.length} memories (${pinned.length} pinned, ${nonPinned.length} non-pinned)`);

    if (!requiresMemory(userMessage, sessionTurnCount)) {
      console.log('[Memory] Short/stateless message — injecting pinned facts only');
      return ok(pinned);
    }

    // Score-based fallback when embedding model is not ready.
    if (!this.embeddingService?.isReady()) {
      const top5 = [...nonPinned].sort((a, b) => b.score - a.score).slice(0, 5);
      console.log(`[Memory] Score-based retrieval (embedding not ready) → ${top5.length} non-pinned selected`);
      return ok([...pinned, ...top5]);
    }

    // Semantic retrieval via cosine similarity.
    const queryVec = await this.embeddingService.embed(userMessage);
    if (queryVec.length === 0) {
      const top5 = [...nonPinned].sort((a, b) => b.score - a.score).slice(0, 5);
      console.log('[Memory] Embed returned empty vector — falling back to score-based');
      return ok([...pinned, ...top5]);
    }

    const ranked = nonPinned
      .map((mem) => {
        const embedding: number[] = mem.embedding ? (JSON.parse(mem.embedding) as number[]) : [];
        const semantic = cosineSimilarity(queryVec, embedding);
        const finalScore = 0.6 * semantic + 0.4 * mem.score;
        return { mem, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5)
      .map(({ mem }) => mem);

    console.log(`[Memory] Semantic retrieval → top ${ranked.length} non-pinned by cosine+score`);
    return ok([...pinned, ...ranked]);
  }

  /** Embeds summary text and stores the vector. No-op until EmbeddingService is injected and ready. */
  async embedAndSave(memoryId: string, summaryText: string): Promise<void> {
    if (!this.embeddingService?.isReady()) {
      console.log('[Memory] embedAndSave: embedding not ready, skipping vector write');
      return;
    }
    console.log('[Memory] embedAndSave: embedding summary for', memoryId);
    const vec = await this.embeddingService.embed(summaryText);
    if (vec.length === 0) return;
    await this.memoryRepository.updateSessionMemory(memoryId, {
      embedding: JSON.stringify(vec),
    });
    console.log('[Memory] embedAndSave: vector written to DB');
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
