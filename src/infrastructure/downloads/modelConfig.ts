// Model registry — GGUF filenames, CDN URLs, RAM requirements.
// CDN base URL is read from environment config (never hardcoded here).

export interface ModelConfig {
  readonly id: string;
  readonly displayName: string;
  readonly filename: string;
  readonly sizeBytes: number;
  readonly minRamBytes: number;
  readonly description: string;
  readonly tags: readonly string[];
}

export const MODEL_CONFIGS: readonly ModelConfig[] = [
  {
    id: 'qwen3.5-0.8b',
    displayName: 'Qwen 3.5 0.8B Q4',
    filename: 'Qwen_Qwen3.5-0.8B-Q4_K_M.gguf',
    sizeBytes: 524_288_000,
    minRamBytes: 3 * 1024 * 1024 * 1024,
    description: 'Fast responses, ideal for quick tasks on low-RAM devices.',
    tags: ['fast', 'multilingual', 'general'],
  },
  {
    id: 'qwen3.5-2b',
    displayName: 'Qwen 3.5 2B Q4',
    filename: 'Qwen_Qwen3.5-2B-Q4_K_M.gguf',
    sizeBytes: 1_288_490_188,
    minRamBytes: 4 * 1024 * 1024 * 1024,
    description: 'Balanced quality and speed. Best for everyday use.',
    tags: ['balanced', 'multilingual', 'general'],
  },
  {
    id: 'qwen3.5-4b',
    displayName: 'Qwen 3.5 4B Q4_K_M',
    filename: 'Qwen_Qwen3.5-4B-Q4_K_M.gguf',
    sizeBytes: 2_684_354_560,
    minRamBytes: 6 * 1024 * 1024 * 1024,
    description: 'High quality, complex reasoning, and long-form writing.',
    tags: ['quality', 'multilingual', 'reasoning'],
  },
  {
    id: 'gemma3-4b',
    displayName: 'Gemma 3 4B Q4_K_M',
    filename: 'gemma-3-4b-it-Q4_K_M.gguf',
    sizeBytes: 2_684_354_560,
    minRamBytes: 6 * 1024 * 1024 * 1024,
    description: 'Excellent for coding, structured tasks, and analytical queries.',
    tags: ['coding', 'structured', 'analytical'],
  },
  {
    id: 'deepseek-r1-1.5b',
    displayName: 'DeepSeek R1 1.5B Q4',
    filename: 'DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    sizeBytes: 966_367_641,
    minRamBytes: 4 * 1024 * 1024 * 1024,
    description: 'Step-by-step reasoning, math, and logic chains.',
    tags: ['reasoning', 'math', 'deep-think'],
  },
] as const;

export const WHISPER_CONFIG = {
  id: 'whisper-base',
  displayName: 'Whisper Base (STT)',
  filename: 'ggml-base.bin',
  sizeBytes: 148_897_792,
  description: '99 languages, auto language detection. Required for voice input.',
} as const;

export const getModelConfig = (id: string): ModelConfig | undefined =>
  MODEL_CONFIGS.find((m) => m.id === id);

export const getRecommendedModelId = (availableRamBytes: number): string => {
  const usableRam = availableRamBytes * 0.6;
  const sorted = [...MODEL_CONFIGS].sort((a, b) => b.sizeBytes - a.sizeBytes);
  const best = sorted.find((m) => m.sizeBytes <= usableRam);
  return best?.id ?? 'qwen3.5-0.8b';
};
