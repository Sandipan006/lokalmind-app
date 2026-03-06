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
  readonly ramRequirement: string;
  readonly quantization: string;
  readonly provider: string;
  readonly capabilities: readonly string[];
  readonly version: string;
  readonly modelType: string;
  readonly contextSize: number;
  readonly isPaid: boolean;
  readonly stopTokens: readonly string[];
}

export const MODEL_CONFIGS: readonly ModelConfig[] = [
  {
    id: 'qwen3.5-0.8b',
    displayName: 'Qwen 3.5 — 0.8B',
    filename: 'Qwen_Qwen3.5-0.8B-Q4_K_M.gguf',
    sizeBytes: 549_916_416,
    minRamBytes: 2 * 1024 * 1024 * 1024,
    description: 'Alibaba\'s latest edge model. Blazing fast responses with thinking mode built in. Perfect for everyday chat on any device.',
    tags: ['chat', 'multilingual', 'fast', 'general'],
    ramRequirement: '2–3 GB',
    quantization: 'Q4_K_M',
    provider: 'hetzner',
    capabilities: ['chat', 'multilingual', 'fast', 'general'],
    version: '3.5',
    modelType: 'chat',
    contextSize: 32768,
    isPaid: false,
    stopTokens: ['<|im_end|>', '<|end_of_text|>'],
  },
  {
    id: 'qwen3.5-2b',
    displayName: 'Qwen 3.5 — 2B',
    filename: 'Qwen_Qwen3.5-2B-Q4_K_M.gguf',
    sizeBytes: 1_315_634_944,
    minRamBytes: 3 * 1024 * 1024 * 1024,
    description: 'The perfect balance of speed and intelligence. Strong multilingual support across 100+ languages. Great for summaries and general tasks.',
    tags: ['chat', 'multilingual', 'summary', 'reasoning', 'general'],
    ramRequirement: '3–4 GB',
    quantization: 'Q4_K_M',
    provider: 'hetzner',
    capabilities: ['chat', 'multilingual', 'summary', 'reasoning', 'general'],
    version: '3.5',
    modelType: 'chat',
    contextSize: 32768,
    isPaid: false,
    stopTokens: ['<|im_end|>', '<|end_of_text|>'],
  },
  {
    id: 'deepseek-r1-1.5b',
    displayName: 'DeepSeek R1 — 1.5B',
    filename: 'DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    sizeBytes: 1_117_320_832,
    minRamBytes: 3 * 1024 * 1024 * 1024,
    description: 'A reasoning-first model that thinks before it answers. Exceptional for coding, math, and logic. Watch it reason step by step.',
    tags: ['reasoning', 'coding', 'math', 'logic', 'analysis'],
    ramRequirement: '3–4 GB',
    quantization: 'Q4_K_M',
    provider: 'hetzner',
    capabilities: ['reasoning', 'coding', 'math', 'logic', 'analysis'],
    version: 'R1-Distill',
    // DeepSeek R1 distilled on Qwen — same stop tokens as Qwen family.
    modelType: 'reasoning',
    contextSize: 32768,
    isPaid: false,
    stopTokens: ['<|im_end|>', '<|end_of_text|>'],
  },
  {
    id: 'qwen3.5-4b',
    displayName: 'Qwen 3.5 — 4B',
    filename: 'Qwen_Qwen3.5-4B-Q4_K_M.gguf',
    sizeBytes: 2_856_936_448,
    minRamBytes: 5 * 1024 * 1024 * 1024,
    description: 'Alibaba\'s most capable compact model. Handles complex reasoning, creative writing, coding, and marketing copy with remarkable quality.',
    tags: ['chat', 'reasoning', 'coding', 'creative-writing', 'marketing', 'multilingual', 'summary'],
    ramRequirement: '5–6 GB',
    quantization: 'Q4_K_M',
    provider: 'hetzner',
    capabilities: ['chat', 'reasoning', 'coding', 'creative-writing', 'marketing', 'multilingual', 'summary'],
    version: '3.5',
    modelType: 'general',
    contextSize: 32768,
    isPaid: true,
    stopTokens: ['<|im_end|>', '<|end_of_text|>'],
  },
  {
    id: 'qwen3-4b',
    displayName: 'Qwen 3 — 4B',
    filename: 'Qwen_Qwen3-4B-Q4_K_M.gguf',
    sizeBytes: 2_497_280_960,
    minRamBytes: 5 * 1024 * 1024 * 1024,
    description: 'A thinking-mode powerhouse. Switch between fast replies and deep reasoning on demand. Best-in-class for coding and complex problem solving.',
    tags: ['chat', 'reasoning', 'coding', 'math', 'analysis', 'thinking-mode'],
    ramRequirement: '5–6 GB',
    quantization: 'Q4_K_M',
    provider: 'hetzner',
    capabilities: ['chat', 'reasoning', 'coding', 'math', 'analysis', 'thinking-mode'],
    version: '3.0',
    modelType: 'reasoning',
    contextSize: 32768,
    isPaid: true,
    stopTokens: ['<|im_end|>', '<|end_of_text|>'],
  },
  {
    id: 'gemma3-4b',
    displayName: 'Gemma 3 — 4B',
    filename: 'google_gemma-3-4b-it-Q4_K_M.gguf',
    sizeBytes: 2_489_758_720,
    minRamBytes: 5 * 1024 * 1024 * 1024,
    description: 'Google\'s precision-engineered model with an enormous 128K context window. Ideal for long documents, deep analysis, and nuanced conversation.',
    tags: ['chat', 'analysis', 'long-context', 'reasoning', 'coding', 'general'],
    ramRequirement: '5–6 GB',
    quantization: 'Q4_K_M',
    provider: 'hetzner',
    capabilities: ['chat', 'analysis', 'long-context', 'reasoning', 'coding', 'general'],
    version: '3.0',
    modelType: 'general',
    contextSize: 131072,
    isPaid: true,
    stopTokens: ['<end_of_turn>', '<eos>'],
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
