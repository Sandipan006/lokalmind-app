import type { Result } from '@/src/core/types';
import type { ChatSession } from '../entities/ChatSession';
import type { IChatRepository } from '../repositories/IChatRepository';

export class CreateSessionUseCase {
  constructor(private readonly chatRepository: IChatRepository) {}

  async execute(modelId: string): Promise<Result<ChatSession>> {
    return this.chatRepository.createSession(modelId);
  }
}
