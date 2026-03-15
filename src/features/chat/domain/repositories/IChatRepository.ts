import type { Result } from '@/src/core/types';
import type { ChatMessage } from '../entities/ChatMessage';
import type { ChatSession } from '../entities/ChatSession';

export interface IChatRepository {
  createSession(modelId: string): Promise<Result<ChatSession>>;
  getSessions(): Promise<Result<ChatSession[]>>;
  getSession(sessionId: string): Promise<Result<ChatSession | null>>;
  updateSessionTitle(sessionId: string, title: string): Promise<Result<void>>;
  updateAutoSessionTitle(sessionId: string, title: string, bucket: number): Promise<Result<void>>;
  saveMessage(message: ChatMessage): Promise<Result<void>>;
  updateMessageContent(messageId: string, content: string, status: ChatMessage['status']): Promise<Result<void>>;
  getMessages(sessionId: string): Promise<Result<ChatMessage[]>>;
  searchSessions(query: string): Promise<Result<ChatSession[]>>;
}
