import type { Result } from '@/src/core/types';
import { createError, err, ok } from '@/src/core/types';
import type { ISQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';
import type { SessionMemory } from '../../domain/entities/SessionMemory';
import type { SessionSummary } from '../../domain/entities/SessionSummary';
import type { IMemoryRepository } from '../../domain/repositories/IMemoryRepository';

export class MemoryRepositoryImpl implements IMemoryRepository {
  constructor(private readonly sqliteDriver: ISQLiteDriver) {}

  async saveSessionSummary(data: SessionSummary): Promise<Result<void>> {
    try {
      await this.sqliteDriver.execute(
        `INSERT OR REPLACE INTO session_summaries
           (id, session_id, bucket_index, summary, turn_start, turn_end, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.id, data.sessionId, data.bucketIndex, data.summary, data.turnStart, data.turnEnd, data.createdAt],
      );
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to save session summary', e));
    }
  }

  async getSessionSummaries(sessionId: string): Promise<Result<SessionSummary[]>> {
    try {
      const rows = await this.sqliteDriver.query<{
        id: string;
        session_id: string;
        bucket_index: number;
        summary: string;
        turn_start: number;
        turn_end: number;
        created_at: number;
      }>(`SELECT * FROM session_summaries WHERE session_id = ? ORDER BY bucket_index ASC`, [sessionId]);

      return ok(
        rows.map((r) => ({
          id: r.id,
          sessionId: r.session_id,
          bucketIndex: r.bucket_index,
          summary: r.summary,
          turnStart: r.turn_start,
          turnEnd: r.turn_end,
          createdAt: r.created_at,
        })),
      );
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to get session summaries', e));
    }
  }

  async saveSessionMemory(data: SessionMemory): Promise<Result<void>> {
    try {
      await this.sqliteDriver.execute(
        `INSERT OR REPLACE INTO session_memories
           (id, session_id, session_title, summary, embedding, score, is_pinned, is_user_edited, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.sessionId,
          data.sessionTitle,
          data.summary,
          data.embedding,
          data.score,
          data.isPinned ? 1 : 0,
          data.isUserEdited ? 1 : 0,
          data.createdAt,
          data.updatedAt,
        ],
      );
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to save session memory', e));
    }
  }

  async updateSessionMemory(
    id: string,
    fields: Partial<Pick<SessionMemory, 'summary' | 'embedding' | 'score' | 'isPinned' | 'isUserEdited'>>,
  ): Promise<Result<void>> {
    try {
      const setClauses: string[] = ['updated_at = ?'];
      const values: (string | number | null)[] = [Date.now()];

      if (fields.summary !== undefined) { setClauses.push('summary = ?'); values.push(fields.summary); }
      if (fields.embedding !== undefined) { setClauses.push('embedding = ?'); values.push(fields.embedding); }
      if (fields.score !== undefined) { setClauses.push('score = ?'); values.push(fields.score); }
      if (fields.isPinned !== undefined) { setClauses.push('is_pinned = ?'); values.push(fields.isPinned ? 1 : 0); }
      if (fields.isUserEdited !== undefined) { setClauses.push('is_user_edited = ?'); values.push(fields.isUserEdited ? 1 : 0); }

      values.push(id);
      await this.sqliteDriver.execute(
        `UPDATE session_memories SET ${setClauses.join(', ')} WHERE id = ?`,
        values,
      );
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to update session memory', e));
    }
  }

  async deleteSessionMemory(id: string): Promise<Result<void>> {
    try {
      await this.sqliteDriver.execute(`DELETE FROM session_memories WHERE id = ?`, [id]);
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to delete session memory', e));
    }
  }

  async getAllSessionMemories(): Promise<Result<SessionMemory[]>> {
    try {
      const rows = await this.sqliteDriver.query<{
        id: string;
        session_id: string;
        session_title: string;
        summary: string;
        embedding: string | null;
        score: number;
        is_pinned: number;
        is_user_edited: number;
        created_at: number;
        updated_at: number;
      }>(`SELECT * FROM session_memories ORDER BY is_pinned DESC, created_at DESC`);

      return ok(rows.map((r) => this.mapRow(r)));
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to get session memories', e));
    }
  }

  async getSessionMemoryBySessionId(sessionId: string): Promise<Result<SessionMemory | null>> {
    try {
      const rows = await this.sqliteDriver.query<{
        id: string;
        session_id: string;
        session_title: string;
        summary: string;
        embedding: string | null;
        score: number;
        is_pinned: number;
        is_user_edited: number;
        created_at: number;
        updated_at: number;
      }>(`SELECT * FROM session_memories WHERE session_id = ? LIMIT 1`, [sessionId]);

      return ok(rows.length > 0 ? this.mapRow(rows[0]!) : null);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to get session memory by session id', e));
    }
  }

  async deleteLowestScoredMemory(): Promise<Result<void>> {
    try {
      await this.sqliteDriver.execute(
        `DELETE FROM session_memories
         WHERE id = (
           SELECT id FROM session_memories
           WHERE is_pinned = 0 AND is_user_edited = 0
           ORDER BY score ASC
           LIMIT 1
         )`,
      );
      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to delete lowest scored memory', e));
    }
  }

  async countNonPinnedMemories(): Promise<Result<number>> {
    try {
      const rows = await this.sqliteDriver.query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM session_memories WHERE is_pinned = 0 AND is_user_edited = 0`,
      );
      return ok(rows[0]?.cnt ?? 0);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to count non-pinned memories', e));
    }
  }

  private mapRow(r: {
    id: string;
    session_id: string;
    session_title: string;
    summary: string;
    embedding: string | null;
    score: number;
    is_pinned: number;
    is_user_edited: number;
    created_at: number;
    updated_at: number;
  }): SessionMemory {
    return {
      id: r.id,
      sessionId: r.session_id,
      sessionTitle: r.session_title,
      summary: r.summary,
      embedding: r.embedding,
      score: r.score,
      isPinned: r.is_pinned === 1,
      isUserEdited: r.is_user_edited === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
