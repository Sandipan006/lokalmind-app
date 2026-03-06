import type { Result } from '@/src/core/types';
import type { IModelRepository } from '../repositories/IModelRepository';

export class PauseDownloadUseCase {
  constructor(private readonly modelRepository: IModelRepository) {}

  async execute(modelId: string): Promise<Result<void>> {
    return this.modelRepository.pauseDownload(modelId);
  }
}
