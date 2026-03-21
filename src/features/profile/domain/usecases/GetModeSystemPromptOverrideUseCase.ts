import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ChatMode } from '@/src/features/chat/domain/entities/ChatMode';
import { createError, err, ok, type Result } from '@/src/core/types';

export class GetModeSystemPromptOverrideUseCase {
  constructor(private readonly appSettingsRepository: IAppSettingsRepository) {}

  async execute(mode: ChatMode): Promise<Result<string | null>> {
    try {
      const value = await this.appSettingsRepository.getModeSystemPromptOverride(mode);
      return ok(value);
    } catch (e) {
      return err(
        createError('STORAGE_ERROR', 'Could not load system prompt', e),
      );
    }
  }
}
