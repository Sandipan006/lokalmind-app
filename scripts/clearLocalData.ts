import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'lokalmind.db';

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
