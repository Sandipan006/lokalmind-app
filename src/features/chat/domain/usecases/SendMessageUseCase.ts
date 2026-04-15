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

/** Max user + assistant messages passed to the LLM (system prompt is separate). */
const MAX_LLM_CONVERSATION_MESSAGES = 10;

const DISMISSIVE_MESSAGES = new Set([
  'no', 'nope', 'nah', 'nothing', 'none', 'never mind', 'nevermind',
  'nm', 'ok', 'okay', 'k', 'fine', 'sure', 'alright', 'cool',
]);

function isDismissive(text: string): boolean {
  return DISMISSIVE_MESSAGES.has(text.trim().toLowerCase());
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

function buildCappedLlmTurns(history: ChatMessage[], userMessage: ChatMessage): LLMMessage[] {
  const turns: LLMMessage[] = [
    ...history.map((m) => ({
      role: m.role as LLMMessage['role'],
      content: composeTurnContentForLlm(m, truncateMessageContentForLlm),
    })),
    {
      role: 'user' as const,
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
  /** Fired right before generateResponse() - used to set embeddingService busy AFTER memory retrieval. */
  onBeforeGenerate?: () => void;
  /** Onboarding display name - used as profile seed when memory profile is still empty. */
  userDisplayName?: string;
}

export class SendMessageUseCase {
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

  async execute(params: SendMessageParams): Promise<Result<ChatMessage>> {
      const { sessionId, modelId, userMessage, history, mode, onToken, signal, onBeforeGenerate, userDisplayName } = params;

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

      const rawTurns = buildCappedLlmTurns(history, userMessage);
      const historyOnly = rawTurns.slice(0, -1);
      const currentMsg = rawTurns[rawTurns.length - 1]!;

      const sessionTurnCount = history.length;
      const [modeOverride, pinnedFacts, userProfile, memoriesResult, summariesResult] = await Promise.all([
        this.appSettingsRepository.getModeSystemPromptOverride(mode),
        this.appSettingsRepository.getPinnedFacts(),
        this.appSettingsRepository.getUserProfile(),
        this.memoryService
          ? this.memoryService.getRelevantMemories(userMessage.content, sessionTurnCount)
          : Promise.resolve({ success: true as const, data: [] as SessionMemory[] }),
        this.memoryRepository?.getSessionSummaries(sessionId)
          ?? Promise.resolve({ success: true as const, data: [] }),
      ]);

      const systemPrompt = resolveSystemPromptForChat(mode, modeOverride);

      // Fall back to onboarding display name when memory hasn't built a profile yet.
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

      if (__DEV__) {
        console.log('[Chat][LLM] Mode:', mode);
        console.log('[Chat][LLM] Profile injected:', effectiveProfile || '(empty)');
        console.log('[Chat][LLM] Context stats:', {
          historyMessages: history.length,
          llmMessages: llmMessages.length,
          userChars: userMessage.content.length,
        });
      }

      if (isDismissive(userMessage.content)) {
        const canned = 'Got it.';
        await this.chatRepository.updateMessageContent(assistantId, canned, 'done');
        void this.localNotifications?.notifyChatTurnComplete({ sessionId, success: true });
        return { success: true, data: { ...assistantMessage, content: canned, status: 'done' } };
      }

      onBeforeGenerate?.();
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
      const finalContent = enforceSecondPersonForSelfQuestion(userMessage.content, rawFinalContent);
      const finalStatus = 'done';
      if (__DEV__) console.log('[Chat][LLM] Response:', finalContent);

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
