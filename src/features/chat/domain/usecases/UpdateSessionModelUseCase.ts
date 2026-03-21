import type { Result } from '@/src/core/types';
import type { IChatRepository } from '../repositories/IChatRepository';

export class UpdateSessionModelUseCase {
  constructor(private readonly chatRepository: IChatRepository) {}

  execute(sessionId: string, modelId: string): Promise<Result<void>> {
    return this.chatRepository.updateSessionModelId(sessionId, modelId);
  }
}
