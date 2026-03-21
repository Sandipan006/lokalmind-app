/** AsyncStorage-backed app settings (per-mode system prompt overrides, etc.). */
export interface IAppSettingsRepository {
  /** Custom prompt for this mode, or null when using the built-in default. */
  getModeSystemPromptOverride(mode: string): Promise<string | null>;
  /** Persists trimmed text; empty string removes the key so the built-in default applies. */
  saveModeSystemPromptOverride(mode: string, value: string): Promise<void>;
}
