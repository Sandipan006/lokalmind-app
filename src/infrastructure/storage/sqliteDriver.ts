import * as SQLite from 'expo-sqlite';

type SQLiteBindValue = string | number | boolean | null | Uint8Array;

export interface ISQLiteDriver {
  execute(sql: string, params?: SQLiteBindValue[]): Promise<void>;
  query<T>(sql: string, params?: SQLiteBindValue[]): Promise<T[]>;
  transaction(fn: (driver: ISQLiteDriver) => Promise<void>): Promise<void>;
}

export class SQLiteDriver implements ISQLiteDriver {
  private static readonly DB_NAME = 'lokalmind.db';
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(SQLiteDriver.DB_NAME);
    
    await this.db.execAsync('PRAGMA journal_mode = WAL;');
    await this.db.execAsync('PRAGMA foreign_keys = ON;');
  }

  async execute(sql: string, params?: SQLiteBindValue[]): Promise<void> {
    if (!this.db) throw new Error('SQLiteDriver not initialized');
    await this.db.runAsync(sql, ...(params ?? []));
  }

  async query<T>(sql: string, params?: SQLiteBindValue[]): Promise<T[]> {
    if (!this.db) throw new Error('SQLiteDriver not initialized');
    return await this.db.getAllAsync<T>(sql, ...(params ?? []));
  }

  async transaction(fn: (driver: ISQLiteDriver) => Promise<void>): Promise<void> {
    if (!this.db) throw new Error('SQLiteDriver not initialized');
    await this.db.withTransactionAsync(async () => {
      await fn(this);
    });
  }
}
