import { ok, err, createError } from '@/src/core/types';
import type { Result } from '@/src/core/types';
import type { IChatRepository } from '../../domain/repositories/IChatRepository';
import type { ChatMessage } from '../../domain/entities/ChatMessage';
import type { ChatSession } from '../../domain/entities/ChatSession';
import type { ISQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';

export class ChatRepositoryImpl implements IChatRepository {
  private initialized = false;

  constructor(private readonly sqliteDriver: ISQLiteDriver) {}

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    await this.sqliteDriver.execute(`
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

    await this.sqliteDriver.execute(`
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

    await this.sqliteDriver.execute(
      `CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id, created_at);`
    );

    const columns = await this.sqliteDriver.query<{ name: string }>('PRAGMA table_info(chat_sessions)');
    const names = new Set(columns.map((c) => c.name));
    if (!names.has('is_title_locked')) {
      await this.sqliteDriver.execute('ALTER TABLE chat_sessions ADD COLUMN is_title_locked INTEGER NOT NULL DEFAULT 0');
    }
    if (!names.has('last_title_bucket')) {
      await this.sqliteDriver.execute('ALTER TABLE chat_sessions ADD COLUMN last_title_bucket INTEGER NOT NULL DEFAULT 0');
    }

    this.initialized = true;
  }

  async createSession(modelId: string): Promise<Result<ChatSession>> {
    try {
      await this.ensureInitialized();
      const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      await this.sqliteDriver.execute(
        `INSERT INTO chat_sessions (id, model_id, title, is_title_locked, last_title_bucket, created_at, updated_at)
         VALUES (?, ?, ?, 0, 0, ?, ?)`,
        [id, modelId, 'New Chat', now, now],
      );
      return ok({ id, modelId, title: 'New Chat', isTitleLocked: false, lastTitleBucket: 0, createdAt: now, updatedAt: now });
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to create chat session', e));
    }
  }

  async getSessions(): Promise<Result<ChatSession[]>> {
    try {
      await this.ensureInitialized();
      const rows = await this.sqliteDriver.query<{
        id: string; model_id: string; title: string; is_title_locked: number; last_title_bucket: number; created_at: number; updated_at: number;
      }>(`
        SELECT s.*
        FROM chat_sessions s
        WHERE EXISTS (
          SELECT 1
          FROM chat_messages m
          WHERE m.session_id = s.id
        )
        ORDER BY s.updated_at DESC
      `);

      const sessions: ChatSession[] = rows.map((r) => ({
        id: r.id,
        modelId: r.model_id,
        title: r.title,
        isTitleLocked: r.is_title_locked === 1,
        lastTitleBucket: r.last_title_bucket ?? 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      return ok(sessions);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to get sessions', e));
    }
  }

  async getSession(sessionId: string): Promise<Result<ChatSession | null>> {
    try {
      await this.ensureInitialized();
      const rows = await this.sqliteDriver.query<{
        id: string; model_id: string; title: string; is_title_locked: number; last_title_bucket: number; created_at: number; updated_at: number;
      }>(`SELECT * FROM chat_sessions WHERE id = ?`, [sessionId]);

      if (rows.length === 0) return ok(null);
      const r = rows[0]!;
      return ok({
        id: r.id,
        modelId: r.model_id,
        title: r.title,
        isTitleLocked: r.is_title_locked === 1,
        lastTitleBucket: r.last_title_bucket ?? 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to get session', e));
    }
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<Result<void>> {
    try {
      await this.ensureInitialized();
      await this.sqliteDriver.execute(
        `UPDATE chat_sessions
           SET title = ?, is_title_locked = 1, updated_at = ?
         WHERE id = ?`,
        [title, Date.now(), sessionId],
      );
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to update session title', e));
    }
  }

  async deleteSession(sessionId: string): Promise<Result<void>> {
    try {
      await this.ensureInitialized();
      await this.sqliteDriver.transaction(async (driver) => {
        await driver.execute(`DELETE FROM chat_messages WHERE session_id = ?`, [sessionId]);
        await driver.execute(`DELETE FROM chat_sessions WHERE id = ?`, [sessionId]);
      });
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to delete session', e));
    }
  }

  async updateAutoSessionTitle(sessionId: string, title: string, bucket: number): Promise<Result<void>> {
    try {
      await this.ensureInitialized();
      await this.sqliteDriver.execute(
        `UPDATE chat_sessions
           SET title = ?, last_title_bucket = ?, updated_at = ?
         WHERE id = ? AND is_title_locked = 0`,
        [title, bucket, Date.now(), sessionId],
      );
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to auto-update session title', e));
    }
  }

  async saveMessage(message: ChatMessage): Promise<Result<void>> {
    try {
      await this.ensureInitialized();
      await this.sqliteDriver.transaction(async (driver) => {
        await driver.execute(
          `INSERT OR REPLACE INTO chat_messages (id, session_id, role, content, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [message.id, message.sessionId, message.role, message.content, message.status, message.createdAt],
        );
        await driver.execute(
          `UPDATE chat_sessions SET updated_at = ? WHERE id = ?`,
          [Date.now(), message.sessionId],
        );
      });
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to save message', e));
    }
  }

  async updateMessageContent(messageId: string, content: string, status: ChatMessage['status']): Promise<Result<void>> {
    try {
      await this.ensureInitialized();
      await this.sqliteDriver.transaction(async (driver) => {
        await driver.execute(
          `UPDATE chat_messages SET content = ?, status = ? WHERE id = ?`,
          [content, status, messageId],
        );
        await driver.execute(
          `UPDATE chat_sessions
             SET updated_at = ?
           WHERE id = (SELECT session_id FROM chat_messages WHERE id = ?)`,
          [Date.now(), messageId],
        );
      });
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to update message', e));
    }
  }

  async getMessages(sessionId: string): Promise<Result<ChatMessage[]>> {
    try {
      await this.ensureInitialized();
      const rows = await this.sqliteDriver.query<{
        id: string; session_id: string; role: string; content: string; status: string; created_at: number;
      }>(`SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`, [sessionId]);

      const messages: ChatMessage[] = rows.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        role: r.role as ChatMessage['role'],
        content: r.content,
        status: r.status as ChatMessage['status'],
        createdAt: r.created_at,
      }));

      return ok(messages);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to get messages', e));
    }
  }

  async searchSessions(query: string): Promise<Result<ChatSession[]>> {
    try {
      await this.ensureInitialized();
      const searchPattern = `%${query}%`;
      const rows = await this.sqliteDriver.query<{
        id: string; model_id: string; title: string; is_title_locked: number; last_title_bucket: number; created_at: number; updated_at: number;
      }>(
        `SELECT DISTINCT s.*
         FROM chat_sessions s
         WHERE s.title LIKE ?
            OR EXISTS (
              SELECT 1 FROM chat_messages m
              WHERE m.session_id = s.id AND m.content LIKE ?
            )
         ORDER BY s.updated_at DESC`,
        [searchPattern, searchPattern],
      );

      const sessions: ChatSession[] = rows.map((r) => ({
        id: r.id,
        modelId: r.model_id,
        title: r.title,
        isTitleLocked: r.is_title_locked === 1,
        lastTitleBucket: r.last_title_bucket ?? 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      return ok(sessions);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to search sessions', e));
    }
  }
}
