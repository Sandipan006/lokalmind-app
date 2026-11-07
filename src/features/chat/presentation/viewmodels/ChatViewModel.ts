import { logger } from '@/src/core/logger';
import type { Result } from '@/src/core/types';
import { createError } from '@/src/core/types';
import type { ILLMEngine } from '@/src/core/ports/ILLMEngine';
import * as Haptics from 'expo-haptics';
import { makeAutoObservable, runInAction } from 'mobx';
import type { ChatMessage } from '../../domain/entities/ChatMessage';
import { CHAT_MODES, type ChatMode } from '../../domain/entities/ChatMode';
import type { ChatSession } from '../../domain/entities/ChatSession';
import type { CreateSessionUseCase } from '../../domain/usecases/CreateSessionUseCase';
import type { EditMessageUseCase } from '../../domain/usecases/EditMessageUseCase';
import type { GenerateChatTitleUseCase } from '../../domain/usecases/GenerateChatTitleUseCase';
import type { GetMessagesUseCase } from '../../domain/usecases/GetMessagesUseCase';
import type { GetSessionUseCase } from '../../domain/usecases/GetSessionUseCase';
import type { RegenerateReplyUseCase } from '../../domain/usecases/RegenerateReplyUseCase';
import type { SendMessageUseCase } from '../../domain/usecases/SendMessageUseCase';
import type { UpdateSessionModelUseCase } from '../../domain/usecases/UpdateSessionModelUseCase';
import { buildReplyPreviewSnapshot, type MessageReplyDraft } from '../../domain/utils/messageReply';
import { StreamHaptics } from './StreamHaptics';

/** Max outbound messages waiting while the LLM is busy (FIFO). */
export const MAX_PENDING_MESSAGE_QUEUE = 3;

export interface QueuedMessage {
  readonly id: string;
  readonly text: string;
  readonly mode: ChatMode;
  readonly reply?: MessageReplyDraft;
}

export class ChatViewModel {
  messages: ChatMessage[] = [];
  session: ChatSession | null = null;
  // Streaming content for the in-flight assistant bubble - avoids mutating the messages array on every token.
  streamingContent: string = '';
  isStreaming = false;
  isLoading = false;
  isModelLoading = false;
  error: string | null = null;
  inputText = '';
  selectedMode: ChatMode = 'general';
  /** Non-null while the user is editing a past message. */
  editingMessage: ChatMessage | null = null;

  /** Composer: reply target (WhatsApp-style) until send or dismiss. */
  replyTarget: MessageReplyDraft | null = null;

  /** FIFO: user messages to send after the current generation finishes. */
  pendingQueue: QueuedMessage[] = [];

  /** Set during regeneration so the UI can stream in-place on the existing bubble. */
  regeneratingMessageId: string | null = null;

  private abortController: AbortController | null = null;
  private readonly streamHaptics = new StreamHaptics();

  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly getMessagesUseCase: GetMessagesUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly editMessageUseCase: EditMessageUseCase,
    private readonly generateChatTitleUseCase: GenerateChatTitleUseCase,
    private readonly updateSessionModelUseCase: UpdateSessionModelUseCase,
    private readonly regenerateReplyUseCase: RegenerateReplyUseCase,
    private readonly llmEngine: ILLMEngine,
  ) {
    makeAutoObservable(this);
  }

  get canAcceptMoreQueuedMessages(): boolean {
    return this.pendingQueue.length < MAX_PENDING_MESSAGE_QUEUE;
  }

  setInputText(text: string) {
    this.inputText = text;
  }

  setSelectedMode(mode: ChatMode): void {
    this.selectedMode = mode;
  }

  cycleMode(): void {
    const currentIndex = CHAT_MODES.indexOf(this.selectedMode);
    const nextIndex = (currentIndex + 1) % CHAT_MODES.length;
    this.selectedMode = CHAT_MODES[nextIndex] ?? 'general';
  }

  async loadSession(sessionId: string): Promise<void> {
    const sessionIdBeforeLoad = this.session?.id;
    runInAction(() => { this.isLoading = true; this.error = null; });
    try {
      const [sessionResult, messagesResult] = await Promise.all([
        this.getSessionUseCase.execute(sessionId),
        this.getMessagesUseCase.execute(sessionId),
      ]);

      runInAction(() => {
        if (sessionResult.success) this.session = sessionResult.data;
        // Never replace in-memory transcript while a turn is active - async load can finish mid-generate and wipe bubbles + break tokens.
        if (messagesResult.success && !this.isStreaming) {
          this.messages = messagesResult.data;
        } else if (messagesResult.success && this.isStreaming) {
          logger.debug('[Chat][Queue] loadSession: skipped messages overwrite (isStreaming)', { sessionId: sessionId });
        }
        // Only clear queue when switching chats - not on a late refresh of the same session (would wipe FIFO while streaming).
        const loadedSession = sessionResult.success ? sessionResult.data : null;
        if (
          sessionIdBeforeLoad !== undefined &&
          loadedSession !== null &&
          loadedSession.id !== sessionIdBeforeLoad
        ) {
          this.pendingQueue = [];
          this.replyTarget = null;
        }
      });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async updateSessionModel(modelId: string): Promise<void> {
    if (!this.session) return;
    const result = await this.updateSessionModelUseCase.execute(this.session.id, modelId);
    if (!result.success) {
      runInAction(() => {
        this.error = result.error.message;
      });
      return;
    }
    runInAction(() => {
      this.session = { ...this.session!, modelId };
      this.error = null;
    });
  }

  async initNewSession(modelId: string): Promise<string | null> {
    runInAction(() => { this.isLoading = true; this.error = null; });
    try {
      const result = await this.createSessionUseCase.execute(modelId);
      if (!result.success) {
        runInAction(() => { this.error = result.error.message; });
        return null;
      }
      runInAction(() => {
        this.session = result.data;
        this.messages = [];
        this.pendingQueue = [];
        this.replyTarget = null;
      });
      return result.data.id;
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  setReplyTargetFromMessage(message: ChatMessage): void {
    runInAction(() => {
      this.replyTarget = {
        replyToMessageId: message.id,
        replyPreview: buildReplyPreviewSnapshot(message.content),
        replyToRole: message.role,
      };
    });
  }

  clearReplyTarget(): void {
    runInAction(() => {
      this.replyTarget = null;
    });
  }

  async sendMessage(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || !this.session) return;

    const replyDraft = this.replyTarget;

    if (this.isStreaming) {
      if (!this.canAcceptMoreQueuedMessages) return;
      const queued: QueuedMessage = {
        id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        text,
        mode: this.selectedMode,
        ...(replyDraft ? { reply: replyDraft } : {}),
      };
      logger.debug('[Chat][Queue] enqueue', { id: queued.id, textPreview: text.slice(0, 80), mode: queued.mode, depthAfter: this.pendingQueue.length + 1 });
      runInAction(() => {
        this.pendingQueue = [...this.pendingQueue, queued];
        this.inputText = '';
        this.replyTarget = null;
      });
      return;
    }

    await this.runSendTurn(text, this.selectedMode, {
      clearInput: true,
      ...(replyDraft ? { reply: replyDraft } : {}),
    });
  }

  cancelQueuedMessage(id: string): void {
    runInAction(() => {
      this.pendingQueue = this.pendingQueue.filter((q) => q.id !== id);
    });
  }

  /** Updates queued text in place - flush uses whatever is stored when the turn ends. */
  updateQueuedMessage(id: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    runInAction(() => {
      this.pendingQueue = this.pendingQueue.map((q) =>
        q.id === id ? { ...q, text: trimmed } : q,
      );
    });
  }

  private async runSendTurn(
    text: string,
    mode: ChatMode,
    options?: { clearInput?: boolean; reply?: MessageReplyDraft },
  ): Promise<void> {
    if (!this.session) return;

    const clearInput = options?.clearInput ?? true;
    const reply = options?.reply;
    logger.debug('[Chat][Queue] runSendTurn start', {
      textPreview: text.slice(0, 80),
      mode,
      clearInput,
      fromQueue: !clearInput,
      pendingRemaining: this.pendingQueue.length,
      messagesLenBefore: this.messages.length,
    });

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      sessionId: this.session.id,
      role: 'user',
      content: text,
      status: 'done',
      createdAt: Date.now(),
      ...(reply
        ? {
            replyToMessageId: reply.replyToMessageId,
            replyPreview: reply.replyPreview,
            replyToRole: reply.replyToRole,
          }
        : {}),
    };
    const currentSessionId = this.session.id;
    const currentModelId = this.session.modelId;

    runInAction(() => {
      this.messages = [...this.messages, userMessage];
      if (clearInput) {
        this.inputText = '';
        this.replyTarget = null;
      }
      this.isStreaming = true;
      this.isModelLoading = true;
      this.streamingContent = '';
      this.error = null;
    });
    logger.debug('[Chat][Queue] user bubble added', { userId: userMessage.id, messagesLen: this.messages.length, isStreaming: this.isStreaming });

    await this.runStreamedTurn(
      ({ onToken, signal }) =>
        this.sendMessageUseCase.execute({
          sessionId: currentSessionId,
          modelId: currentModelId,
          userMessage,
          history: this.messages.filter((m) => m.role !== 'assistant' || m.status === 'done').slice(0, -1),
          mode,
          onToken,
          signal,
        }),
      (result) => this.applySentTurn(result, currentSessionId, currentModelId),
    );

    logger.debug('[Chat][Queue] before flushNextQueuedAfterTurn', { pendingLen: this.pendingQueue.length });
    await this.flushNextQueuedAfterTurn();
  }

  /** After a turn fully completes (including thrown errors), send the next queued user message to the LLM. */
  private async flushNextQueuedAfterTurn(): Promise<void> {
    const next = this.pendingQueue[0];
    if (!next) {
      logger.debug('[Chat][Queue] flush: empty queue');
      return;
    }
    logger.debug('[Chat][Queue] flush: dequeuing', { id: next.id, textPreview: next.text.slice(0, 80), mode: next.mode });
    runInAction(() => {
      this.pendingQueue = this.pendingQueue.slice(1);
    });
    await this.runSendTurn(next.text, next.mode, {
      clearInput: false,
      ...(next.reply ? { reply: next.reply } : {}),
    });
  }

  startEdit(message: ChatMessage): void {
    runInAction(() => {
      this.editingMessage = message;
      this.inputText = message.content;
      this.replyTarget = null;
    });
  }

  cancelEdit(): void {
    runInAction(() => {
      this.editingMessage = null;
      this.inputText = '';
    });
  }

  async submitEdit(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.isStreaming || !this.session || !this.editingMessage) return;

    const targetMessage = this.editingMessage;
    const currentSessionId = this.session.id;
    const currentModelId = this.session.modelId;

    runInAction(() => {
      this.editingMessage = null;
      this.inputText = '';
      this.isStreaming = true;
      this.isModelLoading = true;
      this.streamingContent = '';
      this.error = null;
    });

    const editResult = await this.editMessageUseCase.execute(
      { message: targetMessage, newContent: text },
      this.messages,
    );

    if (!editResult.success) {
      runInAction(() => {
        this.isStreaming = false;
        this.isModelLoading = false;
        this.error = editResult.error.message;
      });
      return;
    }

    const { updatedMessage, historyBefore } = editResult.data;

    // Trim the in-memory list to everything before the edited message, then add the updated one.
    runInAction(() => {
      this.messages = [
        ...this.messages.filter((m) => m.createdAt < targetMessage.createdAt),
        updatedMessage,
      ];
    });

    await this.runStreamedTurn(
      ({ onToken, signal }) =>
        this.sendMessageUseCase.execute({
          sessionId: currentSessionId,
          modelId: currentModelId,
          userMessage: updatedMessage,
          history: historyBefore,
          mode: this.selectedMode,
          onToken,
          signal,
        }),
      (result) => this.applySentTurn(result, currentSessionId, currentModelId),
    );
  }

  stopGeneration(): void {
    this.abortController?.abort();
  }

  /**
   * Regenerate the last assistant message. Keeps all previous versions in `alternateContents`.
   * The new generation becomes the active content (last in `alternateContents`).
   */
  async regenerateLastReply(): Promise<void> {
    if (this.isStreaming || !this.session) return;

    // Find the last assistant message and the history up to (and including) the user turn before it.
    const lastAssistant = [...this.messages].reverse().find((m) => m.role === 'assistant' && m.status === 'done');
    if (!lastAssistant) return;

    const sessionModelId = this.session.modelId;
    const assistantIndex = this.messages.findIndex((m) => m.id === lastAssistant.id);
    // Everything before the assistant message (user turn + prior history) is the LLM context.
    const historyUpToUserTurn = this.messages.slice(0, assistantIndex);

    runInAction(() => {
      this.isStreaming = true;
      this.isModelLoading = true;
      this.streamingContent = '';
      this.regeneratingMessageId = lastAssistant.id;
      this.error = null;
    });

    await this.runStreamedTurn(
      ({ onToken, signal }) =>
        this.regenerateReplyUseCase.execute({
          assistantMessage: lastAssistant,
          historyUpToUserTurn,
          modelId: sessionModelId,
          mode: this.selectedMode,
          onToken,
          signal,
        }),
      (result) => {
        this.regeneratingMessageId = null;
        if (result.success) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          this.messages = this.messages.map((m) => (m.id === lastAssistant.id ? result.data : m));
        } else {
          this.error = result.error.message;
        }
      },
    );
  }

  /**
   * One path for every generation (send, edit, regenerate): fresh abort controller, token streaming,
   * thrown errors turned into a failed Result, and busy flags always reset.
   */
  private async runStreamedTurn(
    execute: (handlers: { onToken: (token: string) => void; signal: AbortSignal }) => Promise<Result<ChatMessage>>,
    onSettled: (result: Result<ChatMessage>) => void,
  ): Promise<void> {
    const controller = new AbortController();
    this.abortController = controller;
    this.streamHaptics.reset();

    let result: Result<ChatMessage>;
    try {
      result = await execute({
        signal: controller.signal,
        onToken: (token) => {
          this.streamHaptics.onToken(token);
          runInAction(() => {
            // First token means the model finished loading and generation started.
            this.isModelLoading = false;
            this.streamingContent += token;
          });
        },
      });
    } catch (e) {
      logger.debug('[Chat][Queue] turn threw', e);
      const message = e instanceof Error ? e.message : 'Generation failed';
      result = { success: false, error: createError('GENERATION_ERROR', message, e) };
    }

    runInAction(() => {
      this.isStreaming = false;
      this.isModelLoading = false;
      this.streamingContent = '';
      onSettled(result);
    });
  }

  /** Shared by send and edit: put the finished reply in the transcript or show the error. */
  private applySentTurn(result: Result<ChatMessage>, sessionId: string, modelId: string): void {
    if (result.success) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      this.messages = [
        ...this.messages.filter((m) => m.role !== 'assistant' || m.status !== 'streaming'),
        result.data,
      ];
      void this.generateChatTitleUseCase.execute(sessionId, modelId).catch(() => undefined);
    } else {
      this.error = result.error.message;
      this.messages = this.messages.filter((m) => m.status !== 'streaming');
    }
  }

  clearError(): void {
    this.error = null;
  }
}
