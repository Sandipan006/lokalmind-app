// expo-sqlite is imported here — the ONLY file allowed to do so.
// All SQLite access goes through this driver. Nothing outside infrastructure/storage/ imports expo-sqlite.
// TODO Phase 1: implement using expo-sqlite
// import * as SQLite from 'expo-sqlite';

export interface ISQLiteDriver {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction(fn: (driver: ISQLiteDriver) => Promise<void>): Promise<void>;
}

export class SQLiteDriver implements ISQLiteDriver {
  private static readonly DB_NAME = 'lokalmind.db';

  async initialize(): Promise<void> {
    // TODO Phase 1: open DB, run PRAGMA WAL + foreign_keys, run migrations
    throw new Error('SQLiteDriver.initialize not yet implemented — Phase 1');
  }

  async execute(_sql: string, _params?: unknown[]): Promise<void> {
    // TODO Phase 1: db.runAsync(sql, params)
    throw new Error('SQLiteDriver.execute not yet implemented — Phase 1');
  }

  async query<T>(_sql: string, _params?: unknown[]): Promise<T[]> {
    // TODO Phase 1: db.getAllAsync(sql, params)
    throw new Error('SQLiteDriver.query not yet implemented — Phase 1');
  }

  async transaction(_fn: (driver: ISQLiteDriver) => Promise<void>): Promise<void> {
    // TODO Phase 1: db.withTransactionAsync(fn)
    throw new Error('SQLiteDriver.transaction not yet implemented — Phase 1');
  }
}
