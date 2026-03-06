import type { Result } from '@/src/core/types';
import type { Model } from '../entities/Model';
import type { IModelRepository } from '../repositories/IModelRepository';

export class GetAllModelsUseCase {
  constructor(private readonly modelRepository: IModelRepository) {}

  async execute(): Promise<Result<Model[]>> {
    return this.modelRepository.getAllModels();
  }
}
