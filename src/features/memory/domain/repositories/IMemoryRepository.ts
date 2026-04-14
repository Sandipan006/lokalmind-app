import type { Result } from '@/src/core/types';
import type { SessionMemory } from '../entities/SessionMemory';
import type { SessionSummary } from '../entities/SessionSummary';

export interface IMemoryRepository {
  // In-session rolling summaries
  saveSessionSummary(data: SessionSummary): Promise<Result<void>>;
  getSessionSummaries(sessionId: string): Promise<Result<SessionSummary[]>>;

  // Cross-session long-term memories
  saveSessionMemory(data: SessionMemory): Promise<Result<void>>;
  updateSessionMemory(
    id: string,
    fields: Partial<Pick<SessionMemory, 'summary' | 'embedding' | 'score' | 'isPinned' | 'isUserEdited'>>,
  ): Promise<Result<void>>;
  deleteSessionMemory(id: string): Promise<Result<void>>;
  getAllSessionMemories(): Promise<Result<SessionMemory[]>>;
  getSessionMemoryBySessionId(sessionId: string): Promise<Result<SessionMemory | null>>;

  // Eviction
  deleteLowestScoredMemory(): Promise<Result<void>>;
  countNonPinnedMemories(): Promise<Result<number>>;
}
