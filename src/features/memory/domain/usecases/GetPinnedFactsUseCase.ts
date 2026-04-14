import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { Result } from '@/src/core/types';
import { ok, createError, err } from '@/src/core/types';

export class GetPinnedFactsUseCase {
  constructor(private readonly appSettingsRepository: IAppSettingsRepository) {}

  async execute(): Promise<Result<string>> {
    try {
      const facts = await this.appSettingsRepository.getPinnedFacts();
      return ok(facts);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to get pinned facts', e));
    }
  }
}
