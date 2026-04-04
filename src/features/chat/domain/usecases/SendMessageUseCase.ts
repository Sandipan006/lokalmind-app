import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ILLMEngine, LLMMessage } from '@/src/core/ports/ILLMEngine';
import type { Result } from '@/src/core/types';
import { createError } from '@/src/core/types';
import { resolveSystemPromptForChat } from '../config/systemPromptResolution';
import type { ChatMessage } from '../entities/ChatMessage';
import type { ChatMode } from '../entities/ChatMode';
import { composeTurnContentForLlm } from '../utils/messageReply';
import type { IChatRepository } from '../repositories/IChatRepository';

/** Max user + assistant messages passed to the LLM (system prompt is separate). */
const MAX_LLM_CONVERSATION_MESSAGES = 20;

/**
 * Cap each message so one huge assistant reply does not break llama.rn completion (OOM / native errors).
 * Keeps head + tail so code blocks at either end remain usable for follow-ups like "same in JS".
 */
const MAX_CHARS_PER_LLM_MESSAGE = 14_000;

function truncateMessageContentForLlm(content: string): string {
  if (content.length <= MAX_CHARS_PER_LLM_MESSAGE) return content;
  const head = 6500;
  const tail = 6500;
  return `${content.slice(0, head)}\n\n[…truncated…]\n\n${content.slice(-tail)}`;
}

function buildCappedLlmTurns(history: ChatMessage[], userMessage: ChatMessage): LLMMessage[] {
  const turns: LLMMessage[] = [
    ...history.map((m) => ({
      role: m.role as LLMMessage['role'],
      content: composeTurnContentForLlm(m, truncateMessageContentForLlm),
    })),
    {
      role: 'user',
      content: composeTurnContentForLlm(userMessage, truncateMessageContentForLlm),
    },
  ];
  return turns.slice(-MAX_LLM_CONVERSATION_MESSAGES);
}

export interface SendMessageParams {
  sessionId: string;
  modelId: string;
  userMessage: ChatMessage;
  history: ChatMessage[];
  mode: ChatMode;
  onToken: (token: string) => void;
  signal: AbortSignal;
}

export class SendMessageUseCase {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly llmEngine: ILLMEngine,
    private readonly appSettingsRepository: IAppSettingsRepository,
  ) {}

  async execute(params: SendMessageParams): Promise<Result<ChatMessage>> {
    const { sessionId, modelId, userMessage, history, mode, onToken, signal } = params;

    const saveResult = await this.chatRepository.saveMessage(userMessage);
    if (!saveResult.success) return saveResult;

    const assistantId = `msg_${Date.now()}_assistant`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      sessionId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: Date.now(),
    };

    const savePlaceholderResult = await this.chatRepository.saveMessage(assistantMessage);
    if (!savePlaceholderResult.success) return savePlaceholderResult;

    let accumulatedContent = '';
    try {
      if (!this.llmEngine.isModelLoaded() || this.llmEngine.getCurrentModelId() !== modelId) {
        await this.llmEngine.initialize(modelId, { modelId });
      }

      const modeOverride = await this.appSettingsRepository.getModeSystemPromptOverride(mode);
      const systemContent = resolveSystemPromptForChat(mode, modeOverride);
      const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemContent },
        ...buildCappedLlmTurns(history, userMessage),
      ];
      console.log('[Chat][LLM] Mode:', mode);
      console.log('[Chat][LLM] History:', history);
      console.log('[Chat][LLM] User message:', userMessage);
      // console.log('[Chat][LLM] System prompt:', systemContent);
      // console.log('[Chat][LLM] Messages:', llmMessages.map((m) => ({ role: m.role, content: m.content })));

      const response = await this.llmEngine.generateResponse(
        llmMessages,
        { modelId, temperature: 0.7 },
        (token) => {
          accumulatedContent += token;
          onToken(token);
        },
        signal,
      );

      const finalContent = response.text || accumulatedContent;
      const finalStatus = 'done';
      console.log('[Chat][LLM] Response:', finalContent);

      await this.chatRepository.updateMessageContent(assistantId, finalContent, finalStatus);

      return {
        success: true,
        data: { ...assistantMessage, content: finalContent, status: finalStatus },
      };
    } catch (e) {
      if (signal.aborted) {
        const partial = accumulatedContent;
        await this.chatRepository.updateMessageContent(assistantId, partial, 'done');
        return { success: true, data: { ...assistantMessage, content: partial, status: 'done' } };
      }
      console.error('[Chat][LLM] generation error', e);
      await this.chatRepository.updateMessageContent(assistantId, '', 'error');
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: createError('GENERATION_ERROR', msg || 'LLM generation failed', e) };
    }
  }
}
