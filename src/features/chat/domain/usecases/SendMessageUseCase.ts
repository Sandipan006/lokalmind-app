import { env } from '@/src/config/env';
import { logger } from '@/src/core/logger';
import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ILLMEngine, LLMMessage } from '@/src/core/ports/ILLMEngine';
import type { ILocalNotifications } from '@/src/core/ports/ILocalNotifications';
import type { Result } from '@/src/core/types';
import { createError } from '@/src/core/types';
import { resolveSystemPromptForChat } from '../config/systemPromptResolution';
import type { ChatMessage } from '../entities/ChatMessage';
import type { ChatMode } from '../entities/ChatMode';
import type { IChatRepository } from '../repositories/IChatRepository';
import { composeTurnContentForLlm } from '../utils/messageReply';
import { buildContextMessages, fitInputToTokens, INPUT_TRUNCATION_NOTICE, maxInputTokens } from '../utils/tokenBudget';

/** Max user + assistant messages passed to the LLM (system prompt is separate). */
const MAX_LLM_CONVERSATION_MESSAGES = 10;

/**
 * Cap each message so one huge assistant reply does not break llama.rn completion (OOM / native errors).
 * Keeps head + tail so code blocks at either end remain usable for follow-ups like "same in JS".
 */
const MAX_CHARS_PER_LLM_MESSAGE = 2_000;

function truncateMessageContentForLlm(content: string): string {
  if (content.length <= MAX_CHARS_PER_LLM_MESSAGE) return content;
  const head = 900;
  const tail = 900;
  return `${content.slice(0, head)}\n\n[…truncated…]\n\n${content.slice(-tail)}`;
}

function buildCappedLlmTurns(
  history: ChatMessage[],
  userMessage: ChatMessage,
  fitUserTurn: (content: string) => string,
): LLMMessage[] {
  const turns: LLMMessage[] = [
    ...history.map((m) => ({
      role: m.role as LLMMessage['role'],
      content: composeTurnContentForLlm(m, truncateMessageContentForLlm),
    })),
    {
      role: 'user' as const,
      content: composeTurnContentForLlm(userMessage, fitUserTurn),
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
    private readonly localNotifications?: ILocalNotifications,
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

      // The current message is cut by tokens, never silently: the user is told when it happens.
      const inputLimit = maxInputTokens(this.llmEngine.getContextSize() ?? undefined, env.models.chatMaxTokens);
      let inputTruncated = false;
      const rawTurns = buildCappedLlmTurns(history, userMessage, (content) => {
        const fit = fitInputToTokens(content, inputLimit);
        inputTruncated = fit.truncated;
        return fit.text;
      });
      const historyOnly = rawTurns.slice(0, -1);
      const currentMsg = rawTurns[rawTurns.length - 1]!;

      const modeOverride = await this.appSettingsRepository.getModeSystemPromptOverride(mode);
      const systemPrompt = resolveSystemPromptForChat(mode, modeOverride);

      const llmMessages = buildContextMessages({
        systemPrompt,
        history: historyOnly,
        currentMessage: currentMsg,
        contextSize: this.llmEngine.getContextSize() ?? undefined,
        reservedOutputTokens: env.models.chatMaxTokens,
      });

      if (__DEV__) {
        logger.debug('[Chat][LLM] Mode:', mode);
        logger.debug('[Chat][LLM] Context stats:', {
          historyMessages: history.length,
          llmMessages: llmMessages.length,
          userChars: userMessage.content.length,
        });
      }

      if (inputTruncated) {
        accumulatedContent += INPUT_TRUNCATION_NOTICE;
        onToken(INPUT_TRUNCATION_NOTICE);
      }

      const response = await this.llmEngine.generateResponse(
        llmMessages,
        { modelId, temperature: 0.7, maxTokens: env.models.chatMaxTokens },
        (token) => {
          accumulatedContent += token;
          onToken(token);
        },
        signal,
      );

      const rawFinalContent = response.text
        ? (inputTruncated ? INPUT_TRUNCATION_NOTICE : '') + response.text
        : accumulatedContent;
      const finalContent = rawFinalContent;
      const finalStatus = 'done';
      logger.debug('[Chat][LLM] Response:', finalContent);

      await this.chatRepository.updateMessageContent(assistantId, finalContent, finalStatus);

      void this.localNotifications?.notifyChatTurnComplete({ sessionId, success: true });
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
      if (__DEV__) console.error('[Chat][LLM] generation error', e);
      await this.chatRepository.updateMessageContent(assistantId, '', 'error');
      const msg = e instanceof Error ? e.message : String(e);
      void this.localNotifications?.notifyChatTurnComplete({
        sessionId,
        success: false,
        errorMessage: msg || 'LLM generation failed',
      });
      return { success: false, error: createError('GENERATION_ERROR', msg || 'LLM generation failed', e) };
    }
  }
}
