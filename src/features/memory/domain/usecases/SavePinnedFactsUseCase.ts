import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { Result } from '@/src/core/types';
import { ok, createError, err } from '@/src/core/types';

export class SavePinnedFactsUseCase {
  constructor(private readonly appSettingsRepository: IAppSettingsRepository) {}

  async execute(facts: string): Promise<Result<void>> {
    try {
      await this.appSettingsRepository.savePinnedFacts(facts);
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to save pinned facts', e));
    }
  }
}
