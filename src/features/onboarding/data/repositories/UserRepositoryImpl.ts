import type { ISQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';

export class UserRepositoryImpl implements IUserRepository {
  private initialized = false;

  constructor(private readonly sqliteDriver: ISQLiteDriver) {}

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    await this.sqliteDriver.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        display_name TEXT NOT NULL,
        avatar_index INTEGER NOT NULL DEFAULT 1,
        onboarding_complete INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
    `);

    const columns = await this.sqliteDriver.query<{ name: string }>('PRAGMA table_info(users)');
    const names = new Set(columns.map((c) => c.name));
    if (!names.has('avatar_index')) {
      await this.sqliteDriver.execute('ALTER TABLE users ADD COLUMN avatar_index INTEGER NOT NULL DEFAULT 1');
    }

    this.initialized = true;
  }

  async saveDisplayName(name: string): Promise<void> {
    await this.ensureInitialized();
    
    await this.sqliteDriver.execute(
      `INSERT INTO users (id, display_name, updated_at)
       VALUES (1, ?, strftime('%s', 'now'))
       ON CONFLICT(id) DO UPDATE SET 
         display_name = excluded.display_name,
         updated_at = excluded.updated_at;`,
      [name]
    );
  }

  async getDisplayName(): Promise<string | null> {
    await this.ensureInitialized();
    
    const rows = await this.sqliteDriver.query<{ display_name: string }>(
      'SELECT display_name FROM users WHERE id = 1'
    );
    
    return rows.length > 0 ? rows[0]?.display_name ?? null : null;
  }

  async saveAvatarIndex(index: number): Promise<void> {
    await this.ensureInitialized();

    await this.sqliteDriver.execute(
      `INSERT INTO users (id, display_name, avatar_index, updated_at)
       VALUES (1, '', ?, strftime('%s', 'now'))
       ON CONFLICT(id) DO UPDATE SET
         avatar_index = excluded.avatar_index,
         updated_at = excluded.updated_at;`,
      [index]
    );
  }

  async getAvatarIndex(): Promise<number | null> {
    await this.ensureInitialized();

    const rows = await this.sqliteDriver.query<{ avatar_index: number }>(
      'SELECT avatar_index FROM users WHERE id = 1'
    );

    return rows.length > 0 ? rows[0]?.avatar_index ?? null : null;
  }

  async markOnboardingComplete(): Promise<void> {
    await this.ensureInitialized();
    
    await this.sqliteDriver.execute(
      `INSERT INTO users (id, display_name, onboarding_complete, updated_at)
       VALUES (1, '', 1, strftime('%s', 'now'))
       ON CONFLICT(id) DO UPDATE SET 
         onboarding_complete = 1,
         updated_at = excluded.updated_at;`
    );
  }

  async isOnboardingComplete(): Promise<boolean> {
    await this.ensureInitialized();
    
    const allUsers = await this.sqliteDriver.query<{ id: number; display_name: string; onboarding_complete: number }>(
      'SELECT * FROM users'
    );
    console.log('[UserRepository] All users in DB:', JSON.stringify(allUsers, null, 2));
    
    const rows = await this.sqliteDriver.query<{ onboarding_complete: number }>(
      'SELECT onboarding_complete FROM users WHERE id = 1'
    );
    
    const isComplete = rows.length > 0 && rows[0]?.onboarding_complete === 1;
    console.log('[UserRepository] isOnboardingComplete:', isComplete);
    return isComplete;
  }
}
