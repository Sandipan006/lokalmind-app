export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  imagePath?: string;
}

export interface LLMConfig {
  modelId: string;
  contextSize?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  finishReason: 'stop' | 'length' | 'error';
}

export interface ILLMEngine {
  initialize(modelId: string, config: LLMConfig): Promise<void>;
  generateResponse(
    messages: LLMMessage[],
    config: LLMConfig,
    onToken?: (token: string) => void,
    signal?: AbortSignal
  ): Promise<LLMResponse>;
  unloadModel(): Promise<void>;
  isModelLoaded(): boolean;
  getCurrentModelId(): string | null;
  /** Active n_ctx of the loaded model, or null when none is loaded. */
  getContextSize(): number | null;
  /** True while generateResponse() is active - used by SummarizeSessionUseCase and EmbeddingService. */
  isGenerating(): boolean;
  /** Releases all native llama contexts (chat + embedding). Call when app backgrounds to reduce zombie state after process death. */
  releaseAllContexts(): Promise<void>;
}
