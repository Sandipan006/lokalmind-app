import type { Result } from '@/src/core/types';
import type { ChatMessage } from '../entities/ChatMessage';
import type { IChatRepository } from '../repositories/IChatRepository';

export class GetMessagesUseCase {
  constructor(private readonly chatRepository: IChatRepository) {}

  async execute(sessionId: string): Promise<Result<ChatMessage[]>> {
    return this.chatRepository.getMessages(sessionId);
  }
}
