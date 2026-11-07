import type { ISQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';

/**
 * Creates the chat tables and adds columns older installs lack. Safe to run on every start.
 * `session_summaries` and `session_memories` are kept so data from older versions stays in place,
 * even though the app no longer writes to them.
 */
export async function ensureChatSchema(driver: ISQLiteDriver): Promise<void> {
    await driver.execute(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New Chat',
        is_title_locked INTEGER NOT NULL DEFAULT 0,
        last_title_bucket INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    await driver.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'done',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );
    `);

    await driver.execute(
      `CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id, created_at);`
    );

    const columns = await driver.query<{ name: string }>('PRAGMA table_info(chat_sessions)');
    const names = new Set(columns.map((c) => c.name));
    if (!names.has('is_title_locked')) {
      await driver.execute('ALTER TABLE chat_sessions ADD COLUMN is_title_locked INTEGER NOT NULL DEFAULT 0');
    }
    if (!names.has('last_title_bucket')) {
      await driver.execute('ALTER TABLE chat_sessions ADD COLUMN last_title_bucket INTEGER NOT NULL DEFAULT 0');
    }

    const msgColumns = await driver.query<{ name: string }>('PRAGMA table_info(chat_messages)');
    const msgNames = new Set(msgColumns.map((c) => c.name));
    if (!msgNames.has('reply_to_message_id')) {
      await driver.execute('ALTER TABLE chat_messages ADD COLUMN reply_to_message_id TEXT');
    }
    if (!msgNames.has('reply_preview')) {
      await driver.execute('ALTER TABLE chat_messages ADD COLUMN reply_preview TEXT');
    }
    if (!msgNames.has('reply_to_role')) {
      await driver.execute('ALTER TABLE chat_messages ADD COLUMN reply_to_role TEXT');
    }

    // Alternate (regenerated) assistant message versions - ordered by seq ASC (oldest first).
    await driver.execute(`
      CREATE TABLE IF NOT EXISTS message_alternates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        content TEXT NOT NULL,
        seq INTEGER NOT NULL,
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
      );
    `);
    await driver.execute(
      `CREATE INDEX IF NOT EXISTS idx_alternates_message ON message_alternates(message_id, seq);`
    );

    // Rolling in-session summaries - one row per 20-turn bucket per session.
    await driver.execute(`
      CREATE TABLE IF NOT EXISTS session_summaries (
        id            TEXT PRIMARY KEY,
        session_id    TEXT NOT NULL,
        bucket_index  INTEGER NOT NULL,
        summary       TEXT NOT NULL,
        turn_start    INTEGER NOT NULL,
        turn_end      INTEGER NOT NULL,
        created_at    INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );
    `);
    await driver.execute(
      `CREATE INDEX IF NOT EXISTS idx_summaries_session ON session_summaries(session_id, bucket_index);`
    );

    // Cross-session long-term memory - one row per completed session (≥ 6 turns).
    await driver.execute(`
      CREATE TABLE IF NOT EXISTS session_memories (
        id             TEXT PRIMARY KEY,
        session_id     TEXT NOT NULL,
        session_title  TEXT NOT NULL,
        summary        TEXT NOT NULL,
        embedding      TEXT,
        score          REAL NOT NULL DEFAULT 0.0,
        is_pinned      INTEGER NOT NULL DEFAULT 0,
        is_user_edited INTEGER NOT NULL DEFAULT 0,
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );
    `);
}
