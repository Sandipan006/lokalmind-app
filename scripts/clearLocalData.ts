import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import { MODEL_CONFIGS, WHISPER_CONFIG } from '@/src/infrastructure/downloads/modelConfig';

const DB_NAME = 'lokalmind.db';

/**
 * Deletes all downloaded GGUF model files and the Whisper binary from the
 * document directory. Does NOT touch SQLite or AsyncStorage.
 */
export async function clearLLMFiles(): Promise<void> {
  for (const config of MODEL_CONFIGS) {
    const file = new File(Paths.document, 'models', config.filename);
    if (file.exists) {
      await file.delete();
      console.log(`[clearLLMFiles] Deleted ${config.filename}`);
    } else {
      console.log(`[clearLLMFiles] Not found (already gone): ${config.filename}`);
    }
  }

  const whisperFile = new File(Paths.document, 'models', WHISPER_CONFIG.filename);
  if (whisperFile.exists) {
    await whisperFile.delete();
    console.log(`[clearLLMFiles] Deleted ${WHISPER_CONFIG.filename}`);
  } else {
    console.log(`[clearLLMFiles] Not found (already gone): ${WHISPER_CONFIG.filename}`);
  }

  // Verify: log remaining size of the models directory.
  const modelsDir = new File(Paths.document, 'models');
  if (modelsDir.exists) {
    console.log(`[clearLLMFiles] models/ dir still exists (may be empty) — size: ${modelsDir.size} bytes`);
  } else {
    console.log('[clearLLMFiles] models/ dir no longer exists. All clear.');
  }
}

/**
 * Clears all app-local persisted data:
 * - AsyncStorage keys (display_name, onboarding_complete, model flags, etc.)
 * - SQLite app tables (users, chats, messages, models, and future tables)
 */
export async function clearLocalData(): Promise<void> {
  await AsyncStorage.clear();

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%';`
  );

  await db.withTransactionAsync(async () => {
    for (const { name } of tables) {
      if (!/^[a-zA-Z0-9_]+$/.test(name)) continue;
      await db.execAsync(`DELETE FROM "${name}";`);
    }
  });
}
