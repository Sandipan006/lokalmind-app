/**
 * Wipes all on-device app data (settings, chats, SQLite, downloaded models).
 * Implemented only in infrastructure; use cases depend on this port.
 */
export interface ILocalDataReset {
  resetAllLocalData(): Promise<void>;
}
