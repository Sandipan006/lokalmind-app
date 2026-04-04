import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ILLMEngine, LLMMessage } from '@/src/core/ports/ILLMEngine';
import type { Result } from '@/src/core/types';
import { createError } from '@/src/core/types';
import { resolveSystemPromptForChat } from '../config/systemPromptResolution';
import type { ChatMessage } from '../entities/ChatMessage';
import type { ChatMode } from '../entities/ChatMode';
import { composeTurnContentForLlm } from '../utils/messageReply';
import type { IChatRepository } from '../repositories/IChatRepository';

const MAX_LLM_CONVERSATION_MESSAGES = 20;
const MAX_CHARS_PER_LLM_MESSAGE = 14_000;

function truncateMessageContentForLlm(content: string): string {
  if (content.length <= MAX_CHARS_PER_LLM_MESSAGE) return content;
  const head = 6500;
  const tail = 6500;
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
  ) {}

  async execute(params: RegenerateReplyParams): Promise<Result<ChatMessage>> {
    const { assistantMessage, historyUpToUserTurn, modelId, mode, onToken, signal } = params;

    const turns: LLMMessage[] = historyUpToUserTurn
      .slice(-MAX_LLM_CONVERSATION_MESSAGES)
      .map((m) => ({
        role: m.role as LLMMessage['role'],
        content: composeTurnContentForLlm(m, truncateMessageContentForLlm),
      }));

    let accumulatedContent = '';
    try {
      if (!this.llmEngine.isModelLoaded() || this.llmEngine.getCurrentModelId() !== modelId) {
        await this.llmEngine.initialize(modelId, { modelId });
      }

      const modeOverride = await this.appSettingsRepository.getModeSystemPromptOverride(mode);
      const systemContent = resolveSystemPromptForChat(mode, modeOverride);
      const llmMessages: LLMMessage[] = [{ role: 'system', content: systemContent }, ...turns];

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

      const addResult = await this.chatRepository.addMessageAlternate(
        assistantMessage.id,
        assistantMessage.content,
        finalContent,
      );
      if (!addResult.success) return addResult;

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
      console.error('[Chat][Regen] generation error', e);
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: createError('GENERATION_ERROR', msg || 'LLM regeneration failed', e) };
    }
  }
}
