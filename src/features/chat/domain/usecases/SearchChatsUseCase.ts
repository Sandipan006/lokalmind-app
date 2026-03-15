import type { Result } from '@/src/core/types';
import type { ChatSession } from '../entities/ChatSession';
import type { IChatRepository } from '../repositories/IChatRepository';

export class SearchChatsUseCase {
  constructor(private readonly chatRepository: IChatRepository) {}

  async execute(query: string): Promise<Result<ChatSession[]>> {
    if (!query.trim()) {
      return this.chatRepository.getSessions();
    }
    return this.chatRepository.searchSessions(query.trim());
  }
}
