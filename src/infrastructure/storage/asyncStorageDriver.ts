// @react-native-async-storage/async-storage is imported here — the ONLY file allowed to do so.
// All AsyncStorage access goes through this driver.
// TODO Phase 1: implement using @react-native-async-storage/async-storage
// import AsyncStorage from '@react-native-async-storage/async-storage';

// All AsyncStorage keys are defined here as constants — never use raw strings elsewhere.
export const STORAGE_KEYS = {
  USER_DISPLAY_NAME: 'user:displayName',
  USER_PROFILE_IMAGE: 'user:profileImage',
  USER_JOIN_DATE: 'user:joinDate',
  MODELS_DOWNLOADED: 'models:downloaded',
  MODELS_ACTIVE: 'models:active',
  WHISPER_DOWNLOADED: 'whisper:downloaded',
  WHISPER_MODEL_PATH: 'whisper:modelPath',
  SETTINGS_CONTEXT_WINDOW: 'settings:contextWindow',
  SETTINGS_GLOBAL_SYSTEM_PROMPT: 'settings:globalSystemPrompt',
  SETTINGS_MEMORY_ENABLED: 'settings:memoryEnabled',
  ONBOARDING_COMPLETE: 'onboarding:complete',
  modeSystemPrompt: (mode: string) => `settings:mode:${mode}:systemPrompt`,
} as const;

export interface IAsyncStorageDriver {
  getString(key: string): Promise<string | null>;
  setString(key: string, value: string): Promise<void>;
  getNumber(key: string): Promise<number | null>;
  setNumber(key: string, value: number): Promise<void>;
  getBoolean(key: string): Promise<boolean | null>;
  setBoolean(key: string, value: boolean): Promise<void>;
  getObject<T>(key: string): Promise<T | null>;
  setObject<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class AsyncStorageDriver implements IAsyncStorageDriver {
  private readonly cache = new Map<string, string>();

  async getString(_key: string): Promise<string | null> {
    // TODO Phase 1: check cache first, then AsyncStorage.getItem(key)
    throw new Error('AsyncStorageDriver.getString not yet implemented — Phase 1');
  }

  async setString(_key: string, _value: string): Promise<void> {
    // TODO Phase 1: cache.set(key, value); AsyncStorage.setItem(key, value)
    throw new Error('AsyncStorageDriver.setString not yet implemented — Phase 1');
  }

  async getNumber(_key: string): Promise<number | null> {
    // TODO Phase 1: getString, then parseFloat
    throw new Error('AsyncStorageDriver.getNumber not yet implemented — Phase 1');
  }

  async setNumber(_key: string, _value: number): Promise<void> {
    throw new Error('AsyncStorageDriver.setNumber not yet implemented — Phase 1');
  }

  async getBoolean(_key: string): Promise<boolean | null> {
    // TODO Phase 1: getString, then === 'true'
    throw new Error('AsyncStorageDriver.getBoolean not yet implemented — Phase 1');
  }

  async setBoolean(_key: string, _value: boolean): Promise<void> {
    throw new Error('AsyncStorageDriver.setBoolean not yet implemented — Phase 1');
  }

  async getObject<T>(_key: string): Promise<T | null> {
    // TODO Phase 1: getString, then JSON.parse
    throw new Error('AsyncStorageDriver.getObject not yet implemented — Phase 1');
  }

  async setObject<T>(_key: string, _value: T): Promise<void> {
    // TODO Phase 1: JSON.stringify, then setString
    throw new Error('AsyncStorageDriver.setObject not yet implemented — Phase 1');
  }

  async remove(_key: string): Promise<void> {
    // TODO Phase 1: cache.delete(key); AsyncStorage.removeItem(key)
    throw new Error('AsyncStorageDriver.remove not yet implemented — Phase 1');
  }

  async clear(): Promise<void> {
    // TODO Phase 1: cache.clear(); AsyncStorage.clear()
    throw new Error('AsyncStorageDriver.clear not yet implemented — Phase 1');
  }
}
