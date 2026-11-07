import type { ISQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';
import { ChatRepositoryImpl } from '../ChatRepositoryImpl';

type Call = { sql: string; params: unknown[] };

/** Records SQL; `rows` answers SELECTs by a substring of the statement. */
function fakeDriver(rows: Record<string, unknown[]> = {}) {
  const calls: Call[] = [];
  let transactions = 0;
  const driver: ISQLiteDriver = {
    execute: async (sql, params = []) => { calls.push({ sql, params }); },
    query: async <T,>(sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      const hit = Object.keys(rows).find((k) => sql.includes(k));
      return (hit ? rows[hit] : []) as T[];
    },
    transaction: async (fn) => { transactions++; await fn(driver); },
  };
  return { driver, calls, transactionCount: () => transactions };
}

const sessionRow = {
  id: 's1', model_id: 'm1', title: 'Hi', is_title_locked: 1, last_title_bucket: null, created_at: 1, updated_at: 2,
};

describe('ChatRepositoryImpl', () => {
  test('creates the schema once, not on every call', async () => {
    const { driver, calls } = fakeDriver();
    const repo = new ChatRepositoryImpl(driver);
    await repo.getSession('a');
    await repo.getSession('b');
    expect(calls.filter((c) => c.sql.includes('CREATE TABLE IF NOT EXISTS chat_sessions'))).toHaveLength(1);
  });

  test('createSession stores a new chat with an unlocked default title', async () => {
    const { driver, calls } = fakeDriver();
    const result = await new ChatRepositoryImpl(driver).createSession('m1');
    expect(result.success && result.data).toMatchObject({ modelId: 'm1', title: 'New Chat', isTitleLocked: false });
    expect(calls.some((c) => c.sql.includes('INSERT INTO chat_sessions'))).toBe(true);
  });

  test('getSession maps columns and defaults a null title bucket to 0', async () => {
    const { driver } = fakeDriver({ 'FROM chat_sessions WHERE id': [sessionRow] });
    const result = await new ChatRepositoryImpl(driver).getSession('s1');
    expect(result.success && result.data).toMatchObject({ id: 's1', modelId: 'm1', isTitleLocked: true, lastTitleBucket: 0 });
  });

  test('getSession returns null for an unknown id', async () => {
    const { driver } = fakeDriver();
    const result = await new ChatRepositoryImpl(driver).getSession('nope');
    expect(result).toEqual({ success: true, data: null });
  });

  test('saveMessage writes the message and bumps the session in one transaction', async () => {
    const { driver, calls, transactionCount } = fakeDriver();
    await new ChatRepositoryImpl(driver).saveMessage({
      id: 'm1', sessionId: 's1', role: 'user', content: 'hi', status: 'done', createdAt: 5,
    });
    expect(transactionCount()).toBe(1);
    expect(calls.some((c) => c.sql.includes('INSERT OR REPLACE INTO chat_messages'))).toBe(true);
    expect(calls.some((c) => c.sql.includes('UPDATE chat_sessions SET updated_at'))).toBe(true);
  });

  test('getMessages attaches alternates in order and keeps reply fields', async () => {
    const { driver } = fakeDriver({
      'FROM chat_messages WHERE session_id': [
        { id: 'a1', session_id: 's1', role: 'assistant', content: 'new', status: 'done', created_at: 2,
          reply_to_message_id: 'u1', reply_preview: 'q', reply_to_role: 'user' },
        { id: 'u1', session_id: 's1', role: 'user', content: 'q', status: 'done', created_at: 1,
          reply_to_message_id: null, reply_preview: null, reply_to_role: null },
      ],
      'FROM message_alternates': [
        { message_id: 'a1', content: 'old' },
        { message_id: 'a1', content: 'new' },
      ],
    });
    const result = await new ChatRepositoryImpl(driver).getMessages('s1');
    expect(result.success && result.data[0]).toMatchObject({
      id: 'a1', alternateContents: ['old', 'new'], replyToMessageId: 'u1', replyPreview: 'q', replyToRole: 'user',
    });
    expect(result.success && result.data[1]).not.toHaveProperty('replyToMessageId');
  });

  test('first regeneration archives the original as alternate 0, the new reply as 1', async () => {
    const { driver, calls } = fakeDriver({ 'MAX(seq)': [{ max_seq: null }] });
    await new ChatRepositoryImpl(driver).addMessageAlternate('a1', 'orig', 'fresh');
    const inserts = calls.filter((c) => c.sql.includes('INSERT INTO message_alternates'));
    expect(inserts.map((c) => c.params)).toEqual([['a1', 'orig'], ['a1', 'fresh']]);
    expect(calls.find((c) => c.sql.includes('UPDATE chat_messages SET content'))?.params).toEqual(['fresh', 'a1']);
  });

  test('later regenerations append with the next seq', async () => {
    const { driver, calls } = fakeDriver({ 'MAX(seq)': [{ max_seq: 1 }] });
    await new ChatRepositoryImpl(driver).addMessageAlternate('a1', 'ignored', 'third');
    const inserts = calls.filter((c) => c.sql.includes('INSERT INTO message_alternates'));
    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.params).toEqual(['a1', 'third', 2]);
  });

  test('a driver failure comes back as STORAGE_ERROR, not a throw', async () => {
    const { driver } = fakeDriver();
    driver.execute = async () => { throw new Error('disk full'); };
    const result = await new ChatRepositoryImpl(driver).saveMessage({
      id: 'm', sessionId: 's', role: 'user', content: '', status: 'done', createdAt: 1,
    }).catch((e) => e);
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('STORAGE_ERROR');
  });

  // Bug: "100%" or "a_b" used raw LIKE wildcards, so "%" matched every chat.
  test('search treats % and _ as plain characters', async () => {
    const { driver, calls } = fakeDriver();
    await new ChatRepositoryImpl(driver).searchSessions('100%_x');
    const search = calls.find((c) => c.sql.includes('SELECT DISTINCT s.*'))!;
    expect(search.params).toEqual(['%100\\%\\_x%', '%100\\%\\_x%']);
    expect(search.sql).toContain("ESCAPE '\\'");
  });
});
