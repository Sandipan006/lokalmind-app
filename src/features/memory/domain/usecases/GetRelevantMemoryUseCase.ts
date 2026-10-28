import type { Result } from '@/src/core/types';
import { createError, err } from '@/src/core/types';
import type { SessionMemory } from '../entities/SessionMemory';
import type { MemoryService } from '../services/MemoryService';

export class GetRelevantMemoryUseCase {
  constructor(private readonly memoryService: MemoryService) {}

  async execute(userMessage: string, sessionTurnCount = 0): Promise<Result<SessionMemory[]>> {
    try {
      return await this.memoryService.getRelevantMemories(userMessage, sessionTurnCount);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to get relevant memories', e));
    }
  }
}
