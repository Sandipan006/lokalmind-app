import type { Result } from '@/src/core/types';
import type { ChatSession } from '../entities/ChatSession';
import type { IChatRepository } from '../repositories/IChatRepository';

export class GetSessionUseCase {
  constructor(private readonly chatRepository: IChatRepository) {}

  async execute(sessionId: string): Promise<Result<ChatSession | null>> {
    return this.chatRepository.getSession(sessionId);
  }
}
