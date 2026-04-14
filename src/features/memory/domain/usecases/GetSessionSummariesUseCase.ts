import type { Result } from '@/src/core/types';
import { createError, err } from '@/src/core/types';
import type { SessionSummary } from '../entities/SessionSummary';
import type { IMemoryRepository } from '../repositories/IMemoryRepository';

export class GetSessionSummariesUseCase {
  constructor(private readonly memoryRepository: IMemoryRepository) {}

  async execute(sessionId: string): Promise<Result<SessionSummary[]>> {
    try {
      return await this.memoryRepository.getSessionSummaries(sessionId);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to get session summaries', e));
    }
  }
}
