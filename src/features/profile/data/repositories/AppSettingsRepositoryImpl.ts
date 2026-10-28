import type { IAppSettingsRepository } from '@/src/core/ports/IAppSettingsRepository';
import { CHAT_MODES } from '@/src/features/chat/domain/entities/ChatMode';
import { STORAGE_KEYS } from '@/src/infrastructure/storage/asyncStorageDriver';
import type { IAsyncStorageDriver } from '@/src/infrastructure/storage/asyncStorageDriver';

const allowedModes = new Set<string>(CHAT_MODES);

export class AppSettingsRepositoryImpl implements IAppSettingsRepository {
  constructor(private readonly storage: IAsyncStorageDriver) {}

  async getModeSystemPromptOverride(mode: string): Promise<string | null> {
    if (!allowedModes.has(mode)) return null;
    return this.storage.getString(STORAGE_KEYS.modeSystemPrompt(mode));
  }

  async saveModeSystemPromptOverride(mode: string, value: string): Promise<void> {
    if (!allowedModes.has(mode)) return;
    const trimmed = value.trim();
    const key = STORAGE_KEYS.modeSystemPrompt(mode);
    if (!trimmed) {
      await this.storage.remove(key);
      return;
    }
    await this.storage.setString(key, trimmed);
  }
}
