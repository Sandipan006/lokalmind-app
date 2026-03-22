import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ILLMEngine, LLMMessage } from '@/src/core/ports/ILLMEngine';
import type { Result } from '@/src/core/types';
import { createError } from '@/src/core/types';
import { resolveSystemPromptForChat } from '../config/systemPromptResolution';
import type { ChatMessage } from '../entities/ChatMessage';
import type { ChatMode } from '../entities/ChatMode';
import type { IChatRepository } from '../repositories/IChatRepository';

/** Max user + assistant messages passed to the LLM (system prompt is separate). */
const MAX_LLM_CONVERSATION_MESSAGES = 20;

function buildCappedLlmTurns(history: ChatMessage[], userMessage: ChatMessage): LLMMessage[] {
  const turns: LLMMessage[] = [
    ...history.map((m) => ({ role: m.role as LLMMessage['role'], content: m.content })),
    { role: 'user', content: userMessage.content },
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

      let accumulatedContent = '';
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
      const finalStatus = signal.aborted ? 'done' : 'done';
      console.log('[Chat][LLM] Response:', finalContent);

      await this.chatRepository.updateMessageContent(assistantId, finalContent, finalStatus);

      return {
        success: true,
        data: { ...assistantMessage, content: finalContent, status: finalStatus },
      };
    } catch (e) {
      if (signal.aborted) {
        await this.chatRepository.updateMessageContent(assistantId, '', 'done');
        return { success: true, data: { ...assistantMessage, content: '', status: 'done' } };
      }
      await this.chatRepository.updateMessageContent(assistantId, '', 'error');
      return { success: false, error: createError('GENERATION_ERROR', 'LLM generation failed', e) };
    }
  }
}
