import { env } from '@/src/config/env';
import type { Result } from '@/src/core/types';
import { createError, err, ok } from '@/src/core/types';
import { getTotalRamBytes } from '@/src/infrastructure/device/deviceCapability';
import type { IDownloadService } from '@/src/infrastructure/downloads/downloadService';
import { MODEL_CONFIGS } from '@/src/infrastructure/downloads/modelConfig';
import type { ISQLiteDriver } from '@/src/infrastructure/storage/sqliteDriver';
import { File, Paths } from 'expo-file-system';
import type { DownloadProgressInfo } from '../../domain/entities/DownloadStatus';
import type { Model } from '../../domain/entities/Model';
import type { IModelRepository } from '../../domain/repositories/IModelRepository';

export class ModelRepositoryImpl implements IModelRepository {
  private initialized = false;

  constructor(
    private readonly downloadService: IDownloadService,
    private readonly sqliteDriver: ISQLiteDriver
  ) {}

  private getCdnBaseUrl(): string | null {
    const baseUrl = (env.hetzner.baseUrl || env.hetzner.webdavUrl || '').trim().replace(/\/+$/, '');
    return baseUrl.length > 0 ? baseUrl : null;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    await this.sqliteDriver.execute(`
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        is_downloaded INTEGER NOT NULL DEFAULT 0,
        downloaded_at INTEGER,
        file_path TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
    `);

    this.initialized = true;
  }

  async getAllModels(): Promise<Result<Model[]>> {
    try {
      await this.ensureInitialized();

      const [downloadedModels, totalRam] = await Promise.all([
        this.sqliteDriver.query<{
          id: string;
          is_downloaded: number;
          file_path: string | null;
        }>('SELECT id, is_downloaded, file_path FROM models'),
        getTotalRamBytes(),
      ]);

      const downloadedMap = new Map(
        downloadedModels.map((m) => [m.id, { isDownloaded: m.is_downloaded === 1, filePath: m.file_path }])
      );

      const models: Model[] = MODEL_CONFIGS.map((config) => {
        const downloaded = downloadedMap.get(config.id);
        return {
          id: config.id,
          displayName: config.displayName,
          filename: config.filename,
          sizeBytes: config.sizeBytes,
          description: config.description,
          ramRequirement: config.ramRequirement,
          minRamBytes: config.minRamBytes,
          isPaid: config.isPaid,
          isDownloaded: downloaded?.isDownloaded ?? false,
          // minRamBytes is a total-device-RAM threshold, not usable RAM — compare against total.
          isCompatibleWithDevice: totalRam >= config.minRamBytes,
        };
      });

      const toGB = (b: number) => (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      console.log(`[ModelRepository] total RAM: ${toGB(totalRam)}`);
      models.forEach((m) => {
        console.log(
          `[ModelRepository] ${m.id} | minRam: ${toGB(m.minRamBytes)} | size: ${toGB(m.sizeBytes)} | compatible: ${m.isCompatibleWithDevice} | downloaded: ${m.isDownloaded}`,
        );
      });

      return ok(models);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to fetch models', e));
    }
  }

  async getModelById(id: string): Promise<Result<Model | null>> {
    try {
      await this.ensureInitialized();

      const config = MODEL_CONFIGS.find((m) => m.id === id);
      if (!config) {
        return ok(null);
      }

      const rows = await this.sqliteDriver.query<{
        id: string;
        is_downloaded: number;
        file_path: string | null;
      }>('SELECT id, is_downloaded, file_path FROM models WHERE id = ?', [id]);

      const isDownloaded = rows.length > 0 && rows[0]?.is_downloaded === 1;
      const totalRam = await getTotalRamBytes();

      const model: Model = {
        id: config.id,
        displayName: config.displayName,
        filename: config.filename,
        sizeBytes: config.sizeBytes,
        description: config.description,
        ramRequirement: config.ramRequirement,
        minRamBytes: config.minRamBytes,
        isPaid: config.isPaid,
        isDownloaded,
        isCompatibleWithDevice: totalRam >= config.minRamBytes,
      };

      return ok(model);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to fetch model', e));
    }
  }

  private async markDownloaded(modelId: string, filename: string, destinationPath: string): Promise<Result<void>> {
    const file = new File(Paths.document, 'models', filename);
    if (!file.exists) {
      return err(createError('DOWNLOAD_FAILED', 'File not found on disk after download'));
    }
    await this.sqliteDriver.execute(
      `INSERT INTO models (id, filename, is_downloaded, file_path, downloaded_at, updated_at)
       VALUES (?, ?, 1, ?, strftime('%s', 'now'), strftime('%s', 'now'))
       ON CONFLICT(id) DO UPDATE SET
         is_downloaded = 1,
         file_path = excluded.file_path,
         downloaded_at = excluded.downloaded_at,
         updated_at = excluded.updated_at;`,
      [modelId, filename, destinationPath]
    );
    return ok(undefined);
  }

  async startDownload(
    modelId: string,
    onProgress: (progress: DownloadProgressInfo) => void
  ): Promise<Result<void>> {
    try {
      await this.ensureInitialized();

      const config = MODEL_CONFIGS.find((m) => m.id === modelId);
      if (!config) {
        return err(createError('NOT_FOUND', `Model ${modelId} not found`));
      }

      const cdnBaseUrl = this.getCdnBaseUrl();
      if (!cdnBaseUrl) {
        return err(createError('DOWNLOAD_FAILED', 'Missing CDN base URL for model downloads'));
      }
      const url = `${cdnBaseUrl}/models/${config.id}/${config.filename}`;
      const destinationPath = new File(Paths.document, 'models', config.filename).uri;
      await this.downloadService.startDownload(
        {
          modelId,
          url,
          destinationPath,
          expectedBytes: config.sizeBytes,
        },
        (downloadProgress) => {
          onProgress({
            modelId,
            bytesWritten: downloadProgress.bytesWritten,
            totalBytes: downloadProgress.totalBytes,
            progressFraction: downloadProgress.progressFraction,
            speedBytesPerSecond: downloadProgress.speedBytesPerSecond,
            etaSeconds: downloadProgress.etaSeconds,
            status: 'downloading',
          });
        }
      );

      // Cancel/pause paths do not leave a completed file on disk.
      const downloadedFile = new File(Paths.document, 'models', config.filename);
      if (!downloadedFile.exists) {
        return ok(undefined);
      }

      return await this.markDownloaded(modelId, config.filename, destinationPath);
    } catch (e) {
      console.error('[ModelRepository] startDownload failed:', e);
      return err(createError('DOWNLOAD_FAILED', 'Failed to start download', e));
    }
  }

  async pauseDownload(modelId: string): Promise<Result<void>> {
    try {
      await this.downloadService.pauseDownload(modelId);
      return ok(undefined);
    } catch (e) {
      return err(createError('DOWNLOAD_PAUSED', 'Failed to pause download', e));
    }
  }

  async resumeDownload(
    modelId: string,
    onProgress: (progress: DownloadProgressInfo) => void
  ): Promise<Result<void>> {
    try {
      const config = MODEL_CONFIGS.find((m) => m.id === modelId);
      if (!config) {
        return err(createError('NOT_FOUND', `Model ${modelId} not found`));
      }

      const state = this.downloadService.getDownloadState(modelId);

      // No resumeUri means app was killed mid-download - restart from scratch.
      if (!state?.resumeUri) {
        return this.startDownload(modelId, onProgress);
      }

      const cdnBaseUrl = this.getCdnBaseUrl();
      if (!cdnBaseUrl) {
        return err(createError('DOWNLOAD_FAILED', 'Missing CDN base URL for model downloads'));
      }
      const url = `${cdnBaseUrl}/models/${config.id}/${config.filename}`;
      const destinationPath = new File(Paths.document, 'models', config.filename).uri;

      await this.downloadService.resumeDownload(
        {
          modelId,
          url,
          destinationPath,
          expectedBytes: config.sizeBytes,
        },
        state.resumeUri,
        (downloadProgress) => {
          onProgress({
            modelId,
            bytesWritten: downloadProgress.bytesWritten,
            totalBytes: downloadProgress.totalBytes,
            progressFraction: downloadProgress.progressFraction,
            speedBytesPerSecond: downloadProgress.speedBytesPerSecond,
            etaSeconds: downloadProgress.etaSeconds,
            status: 'downloading',
          });
        }
      );

      const resumedFile = new File(Paths.document, 'models', config.filename);
      if (!resumedFile.exists) {
        return ok(undefined);
      }

      return await this.markDownloaded(modelId, config.filename, destinationPath);
    } catch (e) {
      return err(createError('DOWNLOAD_FAILED', 'Failed to resume download', e));
    }
  }

  async cancelDownload(modelId: string): Promise<Result<void>> {
    try {
      await this.downloadService.cancelDownload(modelId);
      return ok(undefined);
    } catch (e) {
      return err(createError('DOWNLOAD_FAILED', 'Failed to cancel download', e));
    }
  }

  async deleteDownloadedModel(modelId: string): Promise<Result<void>> {
    try {
      await this.ensureInitialized();

      const config = MODEL_CONFIGS.find((m) => m.id === modelId);
      if (!config) {
        return err(createError('NOT_FOUND', `Model ${modelId} not found`));
      }

      const rows = await this.sqliteDriver.query<{ is_downloaded: number }>(
        'SELECT is_downloaded FROM models WHERE id = ?',
        [modelId],
      );
      if (rows.length === 0 || rows[0]?.is_downloaded !== 1) {
        return err(createError('NOT_FOUND', 'Model is not downloaded'));
      }

      try {
        await this.downloadService.cancelDownload(modelId);
      } catch {
        // No active download - ignore.
      }

      const file = new File(Paths.document, 'models', config.filename);
      if (file.exists) {
        await file.delete();
      }

      await this.sqliteDriver.execute('DELETE FROM models WHERE id = ?', [modelId]);

      return ok(undefined);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to delete downloaded model', e));
    }
  }

  async hasDownloadedModel(): Promise<Result<boolean>> {
    try {
      await this.ensureInitialized();
      const rows = await this.sqliteDriver.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM models WHERE is_downloaded = 1'
      );
      return ok((rows[0]?.count ?? 0) > 0);
    } catch (e) {
      return err(createError('STORAGE_ERROR', 'Failed to check downloaded models', e));
    }
  }

  async getDownloadStatus(modelId: string): Promise<Result<DownloadProgressInfo | null>> {
    try {
      const state = this.downloadService.getDownloadState(modelId);
      if (!state || !state.progress) {
        return ok(null);
      }

      const info: DownloadProgressInfo = {
        modelId: state.modelId,
        bytesWritten: state.progress.bytesWritten,
        totalBytes: state.progress.totalBytes,
        progressFraction: state.progress.progressFraction,
        speedBytesPerSecond: state.progress.speedBytesPerSecond,
        etaSeconds: state.progress.etaSeconds,
        status: state.status,
      };

      return ok(info);
    } catch (e) {
      return err(createError('UNKNOWN_ERROR', 'Failed to get download status', e));
    }
  }
}
