import type { ILLMEngine, LLMMessage, LLMConfig, LLMResponse } from '@/src/core/ports';
import type { AppError } from '@/src/core/types';

// llama.rn is imported here — the ONLY file in the codebase allowed to do so.
// All LLM calls go through ILLMEngine. Nothing outside this file imports llama.rn.
// TODO Phase 1: implement using llama.rn
// import { initLlama } from 'llama.rn';
// import type { LlamaContext } from 'llama.rn';

export class LlamaRnAdapter implements ILLMEngine {
  private isInitialized = false;
  private currentModelId: string | null = null;
  private initializingPromise: Promise<void> | null = null;

  async initialize(modelId: string, _config: LLMConfig): Promise<void> {
    if (this.isInitialized && this.currentModelId === modelId) return;

    if (this.initializingPromise) {
      await this.initializingPromise;
      return;
    }

    this.initializingPromise = this.performInitialize(modelId, _config);
    try {
      await this.initializingPromise;
    } finally {
      this.initializingPromise = null;
    }
  }

  private async performInitialize(_modelId: string, _config: LLMConfig): Promise<void> {
    // TODO Phase 1: resolve GGUF path, call initLlama(), configure n_ctx/n_threads/n_gpu_layers
    throw this.notImplemented('initialize');
  }

  async generateResponse(
    _messages: LLMMessage[],
    _config: LLMConfig,
    _onToken?: (token: string) => void,
    _signal?: AbortSignal
  ): Promise<LLMResponse> {
    if (!this.isInitialized) {
      throw this.notImplemented('generateResponse — model not loaded');
    }
    // TODO Phase 1: build ChatML prompt, call context.completion(), stream tokens via onToken
    throw this.notImplemented('generateResponse');
  }

  async unloadModel(): Promise<void> {
    // TODO Phase 1: call context.release()
    this.isInitialized = false;
    this.currentModelId = null;
  }

  isModelLoaded(): boolean {
    return this.isInitialized;
  }

  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  private notImplemented(method: string): AppError {
    return {
      code: 'MODEL_LOAD_FAILED',
      message: `LlamaRnAdapter.${method} not yet implemented — Phase 1`,
    };
  }
}
