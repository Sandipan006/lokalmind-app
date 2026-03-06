import type { Result } from '@/src/core/types';
import type { DownloadProgressInfo } from '../entities/DownloadStatus';
import type { IModelRepository } from '../repositories/IModelRepository';

export class ResumeDownloadUseCase {
  constructor(private readonly modelRepository: IModelRepository) {}

  async execute(
    modelId: string,
    onProgress: (progress: DownloadProgressInfo) => void
  ): Promise<Result<void>> {
    return this.modelRepository.resumeDownload(modelId, onProgress);
  }
}
