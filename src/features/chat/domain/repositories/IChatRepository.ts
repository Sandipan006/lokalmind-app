import type { Result } from '@/src/core/types';
import type { ChatMessage } from '../entities/ChatMessage';
import type { ChatSession } from '../entities/ChatSession';

export interface IChatRepository {
  createSession(modelId: string): Promise<Result<ChatSession>>;
  getSessions(): Promise<Result<ChatSession[]>>;
  getSession(sessionId: string): Promise<Result<ChatSession | null>>;
  updateSessionModelId(sessionId: string, modelId: string): Promise<Result<void>>;
  updateSessionTitle(sessionId: string, title: string): Promise<Result<void>>;
  deleteSession(sessionId: string): Promise<Result<void>>;
  updateAutoSessionTitle(sessionId: string, title: string, bucket: number): Promise<Result<void>>;
  saveMessage(message: ChatMessage): Promise<Result<void>>;
  updateMessageContent(messageId: string, content: string, status: ChatMessage['status']): Promise<Result<void>>;
  /** Delete all messages in a session whose createdAt is strictly after the given timestamp. */
  deleteMessagesAfter(sessionId: string, afterCreatedAt: number): Promise<Result<void>>;
  getMessages(sessionId: string): Promise<Result<ChatMessage[]>>;
  searchSessions(query: string): Promise<Result<ChatSession[]>>;
  /** Push current content to alternates, then store the new generation as the active content. */
  addMessageAlternate(messageId: string, previousContent: string, newContent: string): Promise<Result<void>>;
}
