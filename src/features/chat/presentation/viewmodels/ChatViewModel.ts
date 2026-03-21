import * as Haptics from 'expo-haptics';
import { makeAutoObservable, runInAction } from 'mobx';
import type { ChatMessage } from '../../domain/entities/ChatMessage';
import { CHAT_MODES, type ChatMode } from '../../domain/entities/ChatMode';
import type { ChatSession } from '../../domain/entities/ChatSession';
import type { CreateSessionUseCase } from '../../domain/usecases/CreateSessionUseCase';
import type { GenerateChatTitleUseCase } from '../../domain/usecases/GenerateChatTitleUseCase';
import type { GetMessagesUseCase } from '../../domain/usecases/GetMessagesUseCase';
import type { GetSessionUseCase } from '../../domain/usecases/GetSessionUseCase';
import type { SendMessageUseCase } from '../../domain/usecases/SendMessageUseCase';
import type { UpdateSessionModelUseCase } from '../../domain/usecases/UpdateSessionModelUseCase';

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

  private abortController: AbortController | null = null;
  private pendingWordFragment = '';
  private wordsSinceLastHaptic = 0;
  private nextWordTriggerCount = 2;

  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly getMessagesUseCase: GetMessagesUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly generateChatTitleUseCase: GenerateChatTitleUseCase,
    private readonly updateSessionModelUseCase: UpdateSessionModelUseCase,
  ) {
    makeAutoObservable(this);
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
    runInAction(() => { this.isLoading = true; this.error = null; });
    try {
      const [sessionResult, messagesResult] = await Promise.all([
        this.getSessionUseCase.execute(sessionId),
        this.getMessagesUseCase.execute(sessionId),
      ]);

      runInAction(() => {
        if (sessionResult.success) this.session = sessionResult.data;
        if (messagesResult.success) this.messages = messagesResult.data;
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
      runInAction(() => { this.session = result.data; this.messages = []; });
      return result.data.id;
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async sendMessage(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.isStreaming || !this.session) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      sessionId: this.session.id,
      role: 'user',
      content: text,
      status: 'done',
      createdAt: Date.now(),
    };
    const currentSessionId = this.session.id;
    const currentModelId = this.session.modelId;

    runInAction(() => {
      this.messages = [...this.messages, userMessage];
      this.inputText = '';
      this.isStreaming = true;
      this.isModelLoading = true;
      this.streamingContent = '';
      this.error = null;
    });

    this.abortController = new AbortController();
    this.pendingWordFragment = '';
    this.wordsSinceLastHaptic = 0;
    this.nextWordTriggerCount = 2;

    const result = await this.sendMessageUseCase.execute({
      sessionId: this.session.id,
      modelId: this.session.modelId,
      userMessage,
      history: this.messages.filter((m) => m.role !== 'assistant' || m.status === 'done').slice(0, -1),
      mode: this.selectedMode,
      onToken: (token) => {
        this.triggerStreamHapticByWords(token);
        runInAction(() => {
          // First token means model finished loading, generation started.
          this.isModelLoading = false;
          this.streamingContent += token;
        });
      },
      signal: this.abortController.signal,
    });

    runInAction(() => {
      this.isStreaming = false;
      this.isModelLoading = false;
      this.streamingContent = '';

      if (result.success) {
        // Final subtle confirmation when assistant response is committed.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        // Replace the placeholder streaming bubble with the final persisted message.
        this.messages = [
          ...this.messages.filter((m) => m.role !== 'assistant' || m.status !== 'streaming'),
          result.data,
        ];
        // Title can auto-improve at 3 lifecycle thresholds unless user locked it.
        void this.generateChatTitleUseCase.execute(currentSessionId, currentModelId);
      } else {
        this.error = result.error.message;
        this.messages = this.messages.filter((m) => m.status !== 'streaming');
      }
    });
  }

  private triggerStreamHapticByWords(token: string): void {
    const combined = `${this.pendingWordFragment}${token}`;
    const endsWithWhitespace = /\s$/.test(combined);
    const parts = combined.split(/\s+/).filter((part) => part.length > 0);

    if (!endsWithWhitespace && parts.length > 0) {
      this.pendingWordFragment = parts.pop() ?? '';
    } else {
      this.pendingWordFragment = '';
    }

    this.wordsSinceLastHaptic += parts.length;

    // Fire haptics roughly every 1.5–2 words by alternating 2,1,2,1...
    while (this.wordsSinceLastHaptic >= this.nextWordTriggerCount) {
      this.wordsSinceLastHaptic -= this.nextWordTriggerCount;
      this.nextWordTriggerCount = this.nextWordTriggerCount === 2 ? 1 : 2;
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }

  stopGeneration(): void {
    this.abortController?.abort();
  }

  clearError(): void {
    this.error = null;
  }
}
