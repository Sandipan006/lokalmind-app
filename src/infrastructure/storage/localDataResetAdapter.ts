import type { ILLMEngine, ILocalDataReset, IWhisperEngine } from '@/src/core/ports';
import type { IDownloadService } from '@/src/infrastructure/downloads/downloadService';
import type { IAsyncStorageDriver } from '@/src/infrastructure/storage/asyncStorageDriver';
import { deleteDownloadedModelFiles } from '@/src/infrastructure/storage/deleteDownloadedModelFiles';
import type { ISQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';

export class LocalDataResetAdapter implements ILocalDataReset {
  constructor(
    private readonly llmEngine: ILLMEngine,
    private readonly whisperEngine: IWhisperEngine,
    private readonly asyncStorageDriver: IAsyncStorageDriver,
    private readonly sqliteDriver: ISQLiteDriver,
    private readonly downloadService: IDownloadService,
  ) {}

  async resetAllLocalData(): Promise<void> {
    if (this.llmEngine.isModelLoaded()) {
      await this.llmEngine.unloadModel();
    }
    if (this.whisperEngine.isModelLoaded()) {
      await this.whisperEngine.unload();
    }

    await this.downloadService.cancelAllDownloads();
    await this.asyncStorageDriver.clear();

    const tables = await this.sqliteDriver.query<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%';`,
    );

    await this.sqliteDriver.transaction(async (driver) => {
      for (const { name } of tables) {
        if (!/^[a-zA-Z0-9_]+$/.test(name)) continue;
        await driver.execute(`DELETE FROM "${name}";`);
      }
    });

    await deleteDownloadedModelFiles();
  }
}
