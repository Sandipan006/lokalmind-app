// llama.rn is imported here in embedding mode — isolation same as llamaRnAdapter.ts.
// No other file may call initLlama for embedding purposes.
import { File, Paths } from 'expo-file-system';
import { initLlama } from 'llama.rn';
import type { LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';
import { getUsableRamBytes } from '@/src/infrastructure/device/deviceCapability';
import { EMBEDDING_CONFIG } from '@/src/infrastructure/downloads/modelConfig';

const EMBED_MODEL_RAM_BYTES = 200 * 1024 * 1024; // 200 MB conservative headroom check

export interface IEmbeddingService {
  initialize(): Promise<void>;
  embed(text: string): Promise<number[]>;
  isReady(): boolean;
  setLlmBusy(busy: boolean): void;
}

export class EmbeddingService implements IEmbeddingService {
  private context: LlamaContext | null = null;
  private initPromise: Promise<void> | null = null;
  private isLlmBusy = false;
  // Queue of resolve functions waiting for LLM to go idle before embedding.
  private embedQueue: Array<() => void> = [];

  async initialize(): Promise<void> {
    if (this.context) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init().finally(() => { this.initPromise = null; });
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    // Model lives in document directory alongside chat models — downloaded via CDN, not bundled.
    const modelFile = new File(Paths.document, 'models', EMBEDDING_CONFIG.filename);
    if (!modelFile.exists) {
      // Not downloaded yet — isReady() stays false, score-based fallback activates.
      if (__DEV__) console.warn('[Embedding] Model file not found — score-based fallback active');
      return;
    }

    // Skip loading if device doesn't have enough RAM headroom.
    const usable = await getUsableRamBytes();
    const usableMB = Math.round(usable / 1024 / 1024);
    if (usable < EMBED_MODEL_RAM_BYTES) {
      if (__DEV__) console.warn(`[Embedding] Insufficient RAM (${usableMB} MB free) — score-based fallback active`);
      return;
    }

    if (__DEV__) console.log(`[Embedding] Loading MiniLM (${usableMB} MB RAM free)…`);
    const modelPath = modelFile.uri.replace(/^file:\/\//, '');
    this.context = await initLlama({
      model: modelPath,
      embedding: true,   // embed-only context, no chat completion
      n_ctx: 512,
      n_threads: Platform.OS === 'ios' ? 4 : 2,
      n_gpu_layers: 0,   // embedding models do not benefit from GPU on mobile
      use_mlock: false,
    });
    if (__DEV__) console.log('[Embedding] MiniLM ready — semantic retrieval active');
  }

  /** Called by ChatViewModel at generation start/end to prevent concurrent LLM+embed. */
  setLlmBusy(busy: boolean): void {
    this.isLlmBusy = busy;
    if (busy) {
      if (__DEV__) console.log('[Embedding] LLM busy — embed calls will queue');
    } else {
      const drained = this.embedQueue.length;
      const queue = this.embedQueue.splice(0);
      queue.forEach((resolve) => resolve());
      if (__DEV__) {
        if (drained > 0) {
          console.log(`[Embedding] LLM idle — drained ${drained} queued embed call(s)`);
        } else {
          console.log('[Embedding] LLM idle');
        }
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.context) return [];

    // Wait for LLM to finish generating before running embedding.
    // Prevents two concurrent LlamaContext inference calls on low-RAM devices.
    if (this.isLlmBusy) {
      if (__DEV__) console.log('[Embedding] Waiting for LLM to finish before embedding…');
      await new Promise<void>((resolve) => { this.embedQueue.push(resolve); });
    }

    try {
      const result = await this.context.embedding(text.slice(0, 1800)); // ~450 token guard
      const vec = result.embedding ?? [];
      if (__DEV__) console.log(`[Embedding] Embedded ${text.length} chars → ${vec.length}-dim vector`);
      return vec;
    } catch (e) {
      if (__DEV__) console.warn('[Embedding] embed() failed, returning empty vector:', e);
      return []; // graceful degradation — falls back to score-based retrieval
    }
  }

  isReady(): boolean {
    return this.context !== null;
  }
}
