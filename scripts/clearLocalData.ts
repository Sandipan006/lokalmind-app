import { container } from '@/src/core/di/container';
import { deleteDownloadedModelFiles } from '@/src/infrastructure/storage/deleteDownloadedModelFiles';

/**
 * Deletes all downloaded GGUF model files and the Whisper binary from the
 * document directory. Does NOT touch SQLite or AsyncStorage.
 */
export async function clearLLMFiles(): Promise<void> {
  await deleteDownloadedModelFiles();
}

/**
 * Clears all app-local persisted data (AsyncStorage, SQLite rows, model files).
 * Requires the DI container (call from the app after `initializeContainer()`).
 */
export async function clearLocalData(): Promise<void> {
  await container.initializeContainer();
  await container.localDataReset.resetAllLocalData();
}
