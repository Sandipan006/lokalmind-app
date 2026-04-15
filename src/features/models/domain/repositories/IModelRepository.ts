import type { Result } from '@/src/core/types';
import type { DownloadProgressInfo } from '../entities/DownloadStatus';
import type { Model } from '../entities/Model';

export interface IModelRepository {
  getAllModels(): Promise<Result<Model[]>>;
  getModelById(id: string): Promise<Result<Model | null>>;
  startDownload(
    modelId: string,
    onProgress: (progress: DownloadProgressInfo) => void
  ): Promise<Result<void>>;
  pauseDownload(modelId: string): Promise<Result<void>>;
  resumeDownload(
    modelId: string,
    onProgress: (progress: DownloadProgressInfo) => void
  ): Promise<Result<void>>;
  cancelDownload(modelId: string): Promise<Result<void>>;
  /** Removes the GGUF file from disk and clears the download record for this model. */
  deleteDownloadedModel(modelId: string): Promise<Result<void>>;
  getDownloadStatus(modelId: string): Promise<Result<DownloadProgressInfo | null>>;
  hasDownloadedModel(): Promise<Result<boolean>>;
  /**
   * Subscribe to live progress for an active download - survives navigation away and back.
   * Immediately replays the last known progress snapshot on subscribe.
   * Returns an unsubscribe function.
   */
  subscribeToDownloadProgress(
    modelId: string,
    listener: (progress: DownloadProgressInfo) => void
  ): () => void;
  /** Returns model IDs that currently have an active (downloading or paused) context. */
  getActiveDownloadIds(): string[];
}
