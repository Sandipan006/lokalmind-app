import { env } from '@/src/config/env';
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

const MAX_LLM_CONVERSATION_MESSAGES = 10;
const MAX_CHARS_PER_LLM_MESSAGE = 2_000;

function truncateMessageContentForLlm(content: string): string {
  if (content.length <= MAX_CHARS_PER_LLM_MESSAGE) return content;
  const head = 900;
  const tail = 900;
  return `${content.slice(0, head)}\n\n[…truncated…]\n\n${content.slice(-tail)}`;
}

export interface RegenerateReplyParams {
  /** The assistant message to regenerate. */
  assistantMessage: ChatMessage;
  /** All messages before and including the user turn that preceded this assistant message. */
  historyUpToUserTurn: ChatMessage[];
  modelId: string;
  mode: ChatMode;
  onToken: (token: string) => void;
  signal: AbortSignal;
}

export class RegenerateReplyUseCase {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly llmEngine: ILLMEngine,
    private readonly appSettingsRepository: IAppSettingsRepository,
    private readonly localNotifications?: ILocalNotifications,
  ) {}

  async execute(params: RegenerateReplyParams): Promise<Result<ChatMessage>> {
    const { assistantMessage, historyUpToUserTurn, modelId, mode, onToken, signal } = params;

    const cappedHistory: LLMMessage[] = historyUpToUserTurn
      .slice(-MAX_LLM_CONVERSATION_MESSAGES)
      .map((m, i, all) => ({
        role: m.role as LLMMessage['role'],
        // The last turn is the one being answered; it is fitted by tokens after the engine is ready.
        content: composeTurnContentForLlm(m, i === all.length - 1 ? (c) => c : truncateMessageContentForLlm),
      }));

    const historyOnly = cappedHistory.slice(0, -1);
    let currentMsg = cappedHistory[cappedHistory.length - 1]!;
    let inputTruncated = false;

    let accumulatedContent = '';
    try {
      if (!this.llmEngine.isModelLoaded() || this.llmEngine.getCurrentModelId() !== modelId) {
        await this.llmEngine.initialize(modelId, { modelId });
      }

      const fit = fitInputToTokens(
        currentMsg.content,
        maxInputTokens(this.llmEngine.getContextSize() ?? undefined, env.models.chatMaxTokens),
      );
      inputTruncated = fit.truncated;
      currentMsg = { ...currentMsg, content: fit.text };

      const modeOverride = await this.appSettingsRepository.getModeSystemPromptOverride(mode);
      const systemPrompt = resolveSystemPromptForChat(mode, modeOverride);

      const llmMessages = buildContextMessages({
        systemPrompt,
        history: historyOnly,
        currentMessage: currentMsg,
        contextSize: this.llmEngine.getContextSize() ?? undefined,
        reservedOutputTokens: env.models.chatMaxTokens,
      });

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

      const addResult = await this.chatRepository.addMessageAlternate(
        assistantMessage.id,
        assistantMessage.content,
        finalContent,
      );
      if (!addResult.success) return addResult;

      void this.localNotifications?.notifyChatTurnComplete({
        sessionId: assistantMessage.sessionId,
        success: true,
      });

      const existingAlternates = assistantMessage.alternateContents ?? [];
      // After save: alternates = [original, ...previous regens]; new content becomes active.
      const updatedAlternates =
        existingAlternates.length === 0
          ? [assistantMessage.content, finalContent]
          : [...existingAlternates, finalContent];

      return {
        success: true,
        data: {
          ...assistantMessage,
          content: finalContent,
          status: 'done',
          alternateContents: updatedAlternates,
        },
      };
    } catch (e) {
      if (signal.aborted) {
        const partial = accumulatedContent;
        if (partial) {
          await this.chatRepository.addMessageAlternate(assistantMessage.id, assistantMessage.content, partial);
        }
        const updatedAlternates =
          (assistantMessage.alternateContents?.length ?? 0) === 0
            ? [assistantMessage.content, partial]
            : [...(assistantMessage.alternateContents ?? []), partial];
        return {
          success: true,
          data: { ...assistantMessage, content: partial || assistantMessage.content, status: 'done', alternateContents: updatedAlternates },
        };
      }
      if (__DEV__) console.error('[Chat][Regen] generation error', e);
      const msg = e instanceof Error ? e.message : String(e);
      void this.localNotifications?.notifyChatTurnComplete({
        sessionId: assistantMessage.sessionId,
        success: false,
        errorMessage: msg || 'LLM regeneration failed',
      });
      return { success: false, error: createError('GENERATION_ERROR', msg || 'LLM regeneration failed', e) };
    }
  }
}
