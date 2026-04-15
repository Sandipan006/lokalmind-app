import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ILLMEngine, LLMMessage } from '@/src/core/ports/ILLMEngine';
import type { ILocalNotifications } from '@/src/core/ports/ILocalNotifications';
import type { Result } from '@/src/core/types';
import { createError } from '@/src/core/types';
import type { SessionMemory } from '@/src/features/memory/domain/entities/SessionMemory';
import type { IMemoryRepository } from '@/src/features/memory/domain/repositories/IMemoryRepository';
import { resolveSystemPromptForChat } from '../config/systemPromptResolution';
import type { ChatMessage } from '../entities/ChatMessage';
import type { ChatMode } from '../entities/ChatMode';
import type { IChatRepository } from '../repositories/IChatRepository';
import { composeTurnContentForLlm } from '../utils/messageReply';
import { buildContextMessages } from '../utils/tokenBudget';

const MAX_LLM_CONVERSATION_MESSAGES = 10;
const MAX_CHARS_PER_LLM_MESSAGE = 2_000;

function truncateMessageContentForLlm(content: string): string {
  if (content.length <= MAX_CHARS_PER_LLM_MESSAGE) return content;
  const head = 900;
  const tail = 900;
  return `${content.slice(0, head)}\n\n[…truncated…]\n\n${content.slice(-tail)}`;
}

function isSelfMemoryQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  // Generic self-reference intent detection (not tied to specific user phrases).
  const hasSelfRef = /\b(i|me|my|mine)\b/i.test(t);
  const hasMemoryIntent =
    t.includes('?') ||
    /\b(who|what|where|which|remember|recall|tell|mentioned|said|told|building|from|using)\b/i.test(t);
  return hasSelfRef && hasMemoryIntent;
}

function enforceSecondPersonForSelfQuestion(userText: string, assistantText: string): string {
  if (!isSelfMemoryQuestion(userText)) return assistantText;
  return assistantText
    .replace(/(^|[.!?]\s+)i am\b/gi, (_m, p1: string) => `${p1}You are`)
    .replace(/(^|[.!?]\s+)i'm\b/gi, (_m, p1: string) => `${p1}You are`)
    .replace(/(^|[.!?]\s+)my\b/gi, (_m, p1: string) => `${p1}Your`);
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
  /** Onboarding display name - used as profile seed when memory profile is still empty. */
  userDisplayName?: string;
}

export class RegenerateReplyUseCase {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly llmEngine: ILLMEngine,
    private readonly appSettingsRepository: IAppSettingsRepository,
    private readonly memoryRepository?: IMemoryRepository,
    private readonly memoryService?: {
      getRelevantMemories(message: string, turnCount?: number): Promise<Result<SessionMemory[]>>;
    },
    private readonly localNotifications?: ILocalNotifications,
  ) {}

  async execute(params: RegenerateReplyParams): Promise<Result<ChatMessage>> {
    const { assistantMessage, historyUpToUserTurn, modelId, mode, onToken, signal, userDisplayName } = params;

    const cappedHistory: LLMMessage[] = historyUpToUserTurn
      .slice(-MAX_LLM_CONVERSATION_MESSAGES)
      .map((m) => ({
        role: m.role as LLMMessage['role'],
        content: composeTurnContentForLlm(m, truncateMessageContentForLlm),
      }));

    const historyOnly = cappedHistory.slice(0, -1);
    const currentMsg = cappedHistory[cappedHistory.length - 1]!;

    let accumulatedContent = '';
    try {
      if (!this.llmEngine.isModelLoaded() || this.llmEngine.getCurrentModelId() !== modelId) {
        await this.llmEngine.initialize(modelId, { modelId });
      }

      const sessionId = historyUpToUserTurn[0]?.sessionId ?? '';
      const sessionTurnCount = historyUpToUserTurn.length;
      const userTurnContent = currentMsg.content;

      const [modeOverride, pinnedFacts, userProfile, memoriesResult, summariesResult] = await Promise.all([
        this.appSettingsRepository.getModeSystemPromptOverride(mode),
        this.appSettingsRepository.getPinnedFacts(),
        this.appSettingsRepository.getUserProfile(),
        this.memoryService
          ? this.memoryService.getRelevantMemories(userTurnContent, sessionTurnCount)
          : Promise.resolve({ success: true as const, data: [] as SessionMemory[] }),
        this.memoryRepository && sessionId
          ? this.memoryRepository.getSessionSummaries(sessionId)
          : Promise.resolve({ success: true as const, data: [] }),
      ]);

      const systemPrompt = resolveSystemPromptForChat(mode, modeOverride);

      const effectiveProfile = userProfile.trim()
        ? userProfile
        : userDisplayName?.trim()
          ? `The person you are talking to is named ${userDisplayName.trim()}.`
          : '';

      const llmMessages = buildContextMessages({
        systemPrompt,
        pinnedFacts,
        userProfile: effectiveProfile,
        crossSessionMemories: memoriesResult.success ? memoriesResult.data : [],
        inSessionSummaries: summariesResult.success ? summariesResult.data : [],
        history: historyOnly,
        currentMessage: currentMsg,
      });

      const response = await this.llmEngine.generateResponse(
        llmMessages,
        { modelId, temperature: 0.7 },
        (token) => {
          accumulatedContent += token;
          onToken(token);
        },
        signal,
      );

      const rawFinalContent = response.text || accumulatedContent;
      const finalContent = enforceSecondPersonForSelfQuestion(currentMsg.content, rawFinalContent);

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
