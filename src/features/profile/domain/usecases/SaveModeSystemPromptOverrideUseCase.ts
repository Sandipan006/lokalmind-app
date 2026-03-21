import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import type { ChatMode } from '@/src/features/chat/domain/entities/ChatMode';
import { createError, err, ok, type Result } from '@/src/core/types';

export class SaveModeSystemPromptOverrideUseCase {
  constructor(private readonly appSettingsRepository: IAppSettingsRepository) {}

  async execute(mode: ChatMode, draft: string): Promise<Result<void>> {
    try {
      await this.appSettingsRepository.saveModeSystemPromptOverride(mode, draft);
      return ok(undefined);
    } catch (e) {
      return err(
        createError('STORAGE_ERROR', 'Could not save system prompt', e),
      );
    }
  }
}
