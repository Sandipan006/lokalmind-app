export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error';

export interface ChatMessage {
  readonly id: string;
  readonly sessionId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly status: MessageStatus;
  readonly createdAt: number;
  /** If set, this user message is a reply to another message (snapshot at send time). */
  readonly replyToMessageId?: string;
  readonly replyPreview?: string;
  readonly replyToRole?: MessageRole;
}
