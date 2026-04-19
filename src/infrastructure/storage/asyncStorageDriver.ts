import AsyncStorage from '@react-native-async-storage/async-storage';

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
  MEMORY_PINNED_FACTS: 'memory:pinnedFacts',
  MEMORY_USER_PROFILE: 'memory:userProfile',
  ONBOARDING_COMPLETE: 'onboarding:complete',
  /** Local calendar day (YYYYMMDD) for inactivity notification daily cap. */
  NOTIFICATION_INACTIVITY_DAILY_YMD: 'lm:notif:inactivity:dailyYmd',
  /** How many inactivity reminders were scheduled today (max 4). */
  NOTIFICATION_INACTIVITY_DAILY_COUNT: 'lm:notif:inactivity:dailyCount',
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
  getAllKeys(): Promise<readonly string[]>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class AsyncStorageDriver implements IAsyncStorageDriver {
  private readonly cache = new Map<string, string>();

  async getString(key: string): Promise<string | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key) ?? null;
    }
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      this.cache.set(key, value);
    }
    return value;
  }

  async setString(key: string, value: string): Promise<void> {
    this.cache.set(key, value);
    await AsyncStorage.setItem(key, value);
  }

  async getNumber(key: string): Promise<number | null> {
    const value = await this.getString(key);
    if (value === null) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  async setNumber(key: string, value: number): Promise<void> {
    await this.setString(key, value.toString());
  }

  async getBoolean(key: string): Promise<boolean | null> {
    const value = await this.getString(key);
    if (value === null) return null;
    return value === 'true';
  }

  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.setString(key, value.toString());
  }

  async getObject<T>(key: string): Promise<T | null> {
    const value = await this.getString(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    await this.setString(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(key);
    await AsyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.clear();
  }

  async getAllKeys(): Promise<readonly string[]> {
    return AsyncStorage.getAllKeys();
  }

  async getItem(key: string): Promise<string | null> {
    return this.getString(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return this.setString(key, value);
  }

  async removeItem(key: string): Promise<void> {
    return this.remove(key);
  }
}
