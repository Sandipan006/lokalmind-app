// llama.rn is imported here - the ONLY file in the codebase allowed to do so.
// All LLM calls go through ILLMEngine. Nothing outside this file imports llama.rn.
import type { ILLMEngine, LLMConfig, LLMMessage, LLMResponse } from '@/src/core/ports';
import { resolveContextSize } from '@/src/infrastructure/device/deviceCapability';
import { getModelConfig } from '@/src/infrastructure/downloads/modelConfig';
import { File, Paths } from 'expo-file-system';
import type { LlamaContext } from 'llama.rn';
import { initLlama, releaseAllLlama } from 'llama.rn';
import { Platform } from 'react-native';

// 60 s is generous for model loading; a corrupt/truncated GGUF would hang indefinitely without this.
const INIT_TIMEOUT_MS = 60_000;

// iOS has more performance cores available; Android stays conservative for thermals.
const N_THREADS = Platform.OS === 'ios' ? 6 : 4;

// Strips DeepSeek R1 chain-of-thought blocks before returning to the caller.
// The <think>…</think> wrapper is an implementation detail of the reasoning model, not user content.
// Also handles incomplete blocks when generation is aborted mid-think.
function stripThinkingTags(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')  // complete blocks
    .replace(/<think>[\s\S]*/g, '')             // incomplete block (aborted mid-generation)
    .trimStart();
}

export class LlamaRnAdapter implements ILLMEngine {
  private context: LlamaContext | null = null;
  private currentModelId: string | null = null;
  // Deduplicate concurrent initialize() calls - prevents double-loading during app boot races.
  private initializingPromise: Promise<void> | null = null;
  /** One completion at a time — native throws "Context is busy" if a new completion starts before the last fully unwinds. */
  private completionEnd: Promise<void> = Promise.resolve();
  private generating = false;

  async initialize(modelId: string, config: LLMConfig): Promise<void> {
    if (this.context && this.currentModelId === modelId) return;

    if (this.initializingPromise) {
      await this.initializingPromise;
      return;
    }

    this.initializingPromise = this.performInitialize(modelId, config);
    try {
      await this.initializingPromise;
    } finally {
      this.initializingPromise = null;
    }
  }

  private async performInitialize(modelId: string, config: LLMConfig): Promise<void> {
    // Release any previously loaded model before loading a new one.
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.currentModelId = null;
    }

    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      throw new Error(`[LlamaRnAdapter] Unknown model id: ${modelId}`);
    }

    const modelFile = new File(Paths.document, 'models', modelConfig.filename);
    if (!modelFile.exists) {
      throw new Error(`[LlamaRnAdapter] Model file not found on disk: ${modelConfig.filename}`);
    }

    // Strip file:// prefix - initLlama handles it but being explicit avoids platform edge cases.
    const modelPath = modelFile.uri.replace(/^file:\/\//, '');

    // Compute a context size that fits in available device RAM alongside the model weights.
    const n_ctx = await resolveContextSize(
      modelConfig.sizeBytes,
      config.contextSize ?? modelConfig.contextSize,
    );

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error('[LlamaRnAdapter] Model load timed out after 60 s')),
        INIT_TIMEOUT_MS,
      );
    });

    try {
      this.context = await Promise.race([
        initLlama({
          model: modelPath,
          n_ctx,
          n_threads: N_THREADS,
          n_gpu_layers: 99,   // llama.rn auto-caps at what the device supports
          n_batch: 256,
          use_mlock: false,   // never lock memory on mobile - risks OOM kills
          ctx_shift: false,   // avoid silent context corruption on some models
        }),
        timeoutPromise,
      ]);
    } finally {
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    }

    this.currentModelId = modelId;
  }

  async generateResponse(
    messages: LLMMessage[],
    config: LLMConfig,
    onToken?: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<LLMResponse> {
    if (!this.context) {
      throw new Error('[LlamaRnAdapter] Model not loaded. Call initialize() first.');
    }

    await this.completionEnd;

    let releaseCompletion!: () => void;
    this.completionEnd = new Promise<void>((resolve) => {
      releaseCompletion = resolve;
    });

    const modelConfig = this.currentModelId ? getModelConfig(this.currentModelId) : null;

    const oaiMessages = messages.map((m) => ({ role: m.role, content: m.content }));

    let stopped = false;
    const stopCompletion = () => {
      if (!stopped) {
        stopped = true;
        this.context?.stopCompletion();
      }
    };

    signal?.addEventListener('abort', stopCompletion);

    this.generating = true;
    try {
      const result = await this.context.completion(
        {
          messages: oaiMessages,
          n_predict: config.maxTokens ?? -1,
          temperature: config.temperature ?? 0.7,
          stop: modelConfig?.stopTokens ? [...modelConfig.stopTokens] : ['<|im_end|>', '</s>'],
        },
        onToken ? (data) => { if (data.token) onToken(data.token); } : undefined,
      );

      const finishReason: LLMResponse['finishReason'] =
        result.stopped_eos || result.stopped_word
          ? 'stop'
          : result.stopped_limit
            ? 'length'
            : 'stop';

      return {
        text: stripThinkingTags(result.content),
        tokensUsed: result.tokens_predicted + result.tokens_evaluated,
        finishReason,
      };
    } finally {
      this.generating = false;
      signal?.removeEventListener('abort', stopCompletion);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      releaseCompletion();
    }
  }

  async unloadModel(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
    }
    this.currentModelId = null;
    this.initializingPromise = null;
    this.completionEnd = Promise.resolve();
  }

  isModelLoaded(): boolean {
    return this.context !== null;
  }

  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  isGenerating(): boolean {
    return this.generating;
  }

  // Releases all llama contexts - call on app teardown.
  async releaseAll(): Promise<void> {
    await releaseAllLlama();
    this.context = null;
    this.currentModelId = null;
    this.initializingPromise = null;
    this.completionEnd = Promise.resolve();
  }
}
