import type { Result } from '@/src/core/types';
import type { Model } from '../entities/Model';
import type { DownloadProgressInfo } from '../entities/DownloadStatus';

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
  getDownloadStatus(modelId: string): Promise<Result<DownloadProgressInfo | null>>;
  hasDownloadedModel(): Promise<Result<boolean>>;
}
