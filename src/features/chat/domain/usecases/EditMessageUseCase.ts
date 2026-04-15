import type { Result } from '@/src/core/types';
import type { ChatMessage } from '../entities/ChatMessage';
import type { IChatRepository } from '../repositories/IChatRepository';

export interface EditMessageParams {
  message: ChatMessage;
  newContent: string;
}

export interface EditMessageResult {
  updatedMessage: ChatMessage;
  /** History to pass to SendMessageUseCase - all messages that came before the edited one. */
  historyBefore: ChatMessage[];
}

export class EditMessageUseCase {
  constructor(private readonly chatRepository: IChatRepository) {}

  async execute(
    params: EditMessageParams,
    allMessages: ChatMessage[],
  ): Promise<Result<EditMessageResult>> {
    const { message, newContent } = params;

    // Delete everything that came after the edited message (strictly later createdAt).
    const deleteResult = await this.chatRepository.deleteMessagesAfter(
      message.sessionId,
      message.createdAt,
    );
    if (!deleteResult.success) return deleteResult;

    // Update the user message content in place (same id, same createdAt).
    const updateResult = await this.chatRepository.updateMessageContent(
      message.id,
      newContent,
      'done',
    );
    if (!updateResult.success) return updateResult;

    const updatedMessage: ChatMessage = { ...message, content: newContent, status: 'done' };

    // History = all done messages that existed before the edited one.
    const historyBefore = allMessages.filter(
      (m) => m.createdAt < message.createdAt && (m.role !== 'assistant' || m.status === 'done'),
    );

    return { success: true, data: { updatedMessage, historyBefore } };
  }
}
