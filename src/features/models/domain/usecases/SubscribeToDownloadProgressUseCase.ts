import type { DownloadProgressInfo } from '../entities/DownloadStatus';
import type { IModelRepository } from '../repositories/IModelRepository';

export class SubscribeToDownloadProgressUseCase {
  constructor(private readonly modelRepository: IModelRepository) {}

  execute(
    modelId: string,
    listener: (progress: DownloadProgressInfo) => void
  ): () => void {
    return this.modelRepository.subscribeToDownloadProgress(modelId, listener);
  }

  getActiveIds(): string[] {
    return this.modelRepository.getActiveDownloadIds();
  }
}
