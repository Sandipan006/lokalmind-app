/** AsyncStorage-backed app settings (per-mode system prompt overrides, etc.). */
export interface IAppSettingsRepository {
  /** Custom prompt for this mode, or null when using the built-in default. */
  getModeSystemPromptOverride(mode: string): Promise<string | null>;
  /** Persists trimmed text; empty string removes the key so the built-in default applies. */
  saveModeSystemPromptOverride(mode: string, value: string): Promise<void>;
  /** Always-injected user facts. Returns '' if not set. */
  getPinnedFacts(): Promise<string>;
  /** Persists facts, enforcing 800 char max at write time (silently trimmed). */
  savePinnedFacts(facts: string): Promise<void>;
  /** LLM-maintained user profile document. Returns '' if not set. */
  getUserProfile(): Promise<string>;
  /** Persists profile, enforcing 600 char max at write time (silently trimmed). */
  saveUserProfile(profile: string): Promise<void>;
}
