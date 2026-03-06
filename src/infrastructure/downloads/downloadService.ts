import {
  createDownloadResumable,
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  type DownloadProgressData,
} from 'expo-file-system/legacy';
import type { DownloadConfig, DownloadProgress, DownloadState } from './types';
import type { IAsyncStorageDriver } from '../storage/asyncStorageDriver';
import { env } from '@/src/config/env';

type DownloadResumable = ReturnType<typeof createDownloadResumable>;

interface DownloadContext {
  resumable: DownloadResumable;
  config: DownloadConfig;
  state: DownloadState;
  speedSamples: { timestamp: number; bytesWritten: number }[];
  lastSpeedLog: number;
  lastMetricsUpdate: number;
  lastComputedSpeed: number;
  lastComputedEta: number;
  hasPublishedMetrics: boolean;
}

const SPEED_WINDOW_SIZE = 8;
const RESUME_STATE_KEY_PREFIX = 'download_resume_';
const SPEED_LOG_INTERVAL_MS = 15_000;
const METRICS_UPDATE_INTERVAL_MS = 5_000;

export interface IDownloadService {
  startDownload(
    config: DownloadConfig,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<void>;
  pauseDownload(modelId: string): Promise<string | null>;
  resumeDownload(
    config: DownloadConfig,
    resumeUri: string,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<void>;
  cancelDownload(modelId: string): Promise<void>;
  getDownloadState(modelId: string): DownloadState | null;
  hydratePersistedStates(): Promise<void>;
}

export class DownloadService implements IDownloadService {
  private readonly activeDownloads = new Map<string, DownloadContext>();

  constructor(private readonly asyncStorageDriver: IAsyncStorageDriver) {}

  async hydratePersistedStates(): Promise<void> {
    const keys = await this.asyncStorageDriver.getAllKeys();
    const resumeKeys = keys.filter((k: string) => k.startsWith(RESUME_STATE_KEY_PREFIX));

    for (const key of resumeKeys) {
      const modelId = key.replace(RESUME_STATE_KEY_PREFIX, '');
      const stateJson = await this.asyncStorageDriver.getItem(key);
      if (stateJson) {
        try {
          const persistedState = JSON.parse(stateJson) as DownloadState;
          const mutableState = { ...persistedState };
          if (mutableState.status === 'downloading') {
            mutableState.status = 'paused';
          }
          const placeholderResumable = {} as DownloadResumable;
          this.activeDownloads.set(modelId, {
            resumable: placeholderResumable,
            config: { modelId, url: '', destinationPath: '', expectedBytes: 0 },
            state: mutableState,
            speedSamples: [],
            lastSpeedLog: 0,
            lastMetricsUpdate: 0,
            lastComputedSpeed: 0,
            lastComputedEta: 0,
            hasPublishedMetrics: false,
          });
        } catch (e) {
          console.warn(`Failed to parse persisted download state for ${modelId}`, e);
        }
      }
    }
  }

  private async persistState(modelId: string, state: DownloadState): Promise<void> {
    const key = `${RESUME_STATE_KEY_PREFIX}${modelId}`;
    await this.asyncStorageDriver.setItem(key, JSON.stringify(state));
  }

  private async clearPersistedState(modelId: string): Promise<void> {
    const key = `${RESUME_STATE_KEY_PREFIX}${modelId}`;
    await this.asyncStorageDriver.removeItem(key);
  }

  private calculateSpeed(samples: { timestamp: number; bytesWritten: number }[]): number {
    if (samples.length < 2) return 0;

    const oldest = samples[0];
    const newest = samples[samples.length - 1];
    if (!oldest || !newest) return 0;

    const timeDiffSeconds = (newest.timestamp - oldest.timestamp) / 1000;
    const bytesDiff = newest.bytesWritten - oldest.bytesWritten;

    return timeDiffSeconds > 0 ? bytesDiff / timeDiffSeconds : 0;
  }

  private createProgressCallback(
    modelId: string,
    config: DownloadConfig,
    onProgress: (progress: DownloadProgress) => void
  ): (downloadProgressData: DownloadProgressData) => void {
    return (downloadProgressData: DownloadProgressData): void => {
      const context = this.activeDownloads.get(modelId);
      if (!context) return;

      const now = Date.now();

      context.speedSamples.push({
        timestamp: now,
        bytesWritten: downloadProgressData.totalBytesWritten,
      });

      if (context.speedSamples.length > SPEED_WINDOW_SIZE) {
        context.speedSamples.shift();
      }

      // totalBytesExpected can be -1 or 0 if the server omits Content-Length; fall back to config.
      const rawExpected = (downloadProgressData as unknown as { totalBytesExpectedToWrite?: number }).totalBytesExpectedToWrite ?? -1;
      const totalBytes = rawExpected > 0 ? rawExpected : config.expectedBytes;

      const bytesWritten = downloadProgressData.totalBytesWritten;
      const progressFraction = totalBytes > 0 ? Math.min(bytesWritten / totalBytes, 1) : 0;
      const bytesRemaining = totalBytes - bytesWritten;
      const shouldRefreshMetrics =
        (!context.hasPublishedMetrics && context.speedSamples.length >= 2 && bytesWritten > 0) ||
        now - context.lastMetricsUpdate >= METRICS_UPDATE_INTERVAL_MS ||
        bytesWritten >= totalBytes;

      if (shouldRefreshMetrics) {
        const speed = this.calculateSpeed(context.speedSamples);
        context.lastMetricsUpdate = now;
        context.lastComputedSpeed = speed;
        context.lastComputedEta = speed > 0 ? bytesRemaining / speed : 0;
        context.hasPublishedMetrics = true;
      }

      const progress: DownloadProgress = {
        modelId,
        bytesWritten,
        totalBytes,
        progressFraction,
        speedBytesPerSecond: context.lastComputedSpeed,
        etaSeconds: context.lastComputedEta,
      };

      context.state = {
        modelId,
        status: 'downloading',
        progress,
        resumeUri: null,
        error: null,
      };

      onProgress(progress);

      // Log speed every 15s to avoid flooding the console during long downloads.
      if (now - context.lastSpeedLog >= SPEED_LOG_INTERVAL_MS) {
        context.lastSpeedLog = now;
        const speedMBps = (progress.speedBytesPerSecond / (1024 * 1024)).toFixed(2);
        const writtenMB = (progress.bytesWritten / (1024 * 1024)).toFixed(1);
        const totalMB = (progress.totalBytes / (1024 * 1024)).toFixed(1);
        const pct = (progress.progressFraction * 100).toFixed(1);
        const etaMin = progress.etaSeconds > 0 ? (progress.etaSeconds / 60).toFixed(1) : '?';
        console.log(
          `[Download] ${modelId} | ${pct}% (${writtenMB}/${totalMB} MB) | ${speedMBps} MB/s | ETA ${etaMin} min`
        );
      }
    };
  }

  private buildRequestHeaders(): Record<string, string> {
    const { username, password } = env.hetzner;
    if (username && password) {
      return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
    }
    return {};
  }

  async startDownload(
    config: DownloadConfig,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<void> {
    const dirPath = config.destinationPath.substring(0, config.destinationPath.lastIndexOf('/'));
    const dirInfo = await getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(dirPath, { intermediates: true });
    }

    const callback = this.createProgressCallback(config.modelId, config, onProgress);

    const resumable = createDownloadResumable(
      config.url,
      config.destinationPath,
      { headers: this.buildRequestHeaders() },
      callback as Parameters<typeof createDownloadResumable>[3]
    );

    const context: DownloadContext = {
      resumable,
      config,
      state: {
        modelId: config.modelId,
        status: 'downloading',
        progress: null,
        resumeUri: null,
        error: null,
      },
      speedSamples: [],
      lastSpeedLog: 0,
        lastMetricsUpdate: 0,
        lastComputedSpeed: 0,
        lastComputedEta: 0,
      hasPublishedMetrics: false,
    };

    this.activeDownloads.set(config.modelId, context);
    await this.persistState(config.modelId, context.state);

    try {
      const result = await resumable.downloadAsync();
      if (result) {
        context.state = {
          modelId: config.modelId,
          status: 'completed',
          progress: {
            modelId: config.modelId,
            bytesWritten: config.expectedBytes,
            totalBytes: config.expectedBytes,
            progressFraction: 1,
            speedBytesPerSecond: 0,
            etaSeconds: 0,
          },
          resumeUri: null,
          error: null,
        };
        await this.clearPersistedState(config.modelId);
        this.activeDownloads.delete(config.modelId);
      }
    } catch (e) {
      console.error('[DownloadService] downloadAsync failed:', e);
      context.state = {
        modelId: config.modelId,
        status: 'failed',
        progress: context.state.progress,
        resumeUri: null,
        error: e instanceof Error ? e.message : 'Download failed',
      };
      await this.persistState(config.modelId, context.state);
      throw e;
    }
  }

  async pauseDownload(modelId: string): Promise<string | null> {
    const context = this.activeDownloads.get(modelId);
    if (!context) {
      return null;
    }

    try {
      const pauseResult = await context.resumable.pauseAsync();
      const resumeUri = pauseResult.resumeData ?? null;

      context.state = {
        modelId,
        status: 'paused',
        progress: context.state.progress,
        resumeUri,
        error: null,
      };

      await this.persistState(modelId, context.state);
      return resumeUri;
    } catch (e) {
      throw new Error(`Failed to pause download: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  async resumeDownload(
    config: DownloadConfig,
    resumeUri: string,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<void> {
    const callback = this.createProgressCallback(config.modelId, config, onProgress);

    const resumable = createDownloadResumable(
      config.url,
      config.destinationPath,
      { headers: this.buildRequestHeaders() },
      callback as Parameters<typeof createDownloadResumable>[3],
      resumeUri
    );

    const context: DownloadContext = {
      resumable,
      config,
      state: {
        modelId: config.modelId,
        status: 'downloading',
        progress: null,
        resumeUri,
        error: null,
      },
      speedSamples: [],
      lastSpeedLog: 0,
        lastMetricsUpdate: 0,
        lastComputedSpeed: 0,
        lastComputedEta: 0,
      hasPublishedMetrics: false,
    };

    this.activeDownloads.set(config.modelId, context);
    await this.persistState(config.modelId, context.state);

    try {
      const result = await resumable.resumeAsync();
      if (result) {
        context.state = {
          modelId: config.modelId,
          status: 'completed',
          progress: {
            modelId: config.modelId,
            bytesWritten: config.expectedBytes,
            totalBytes: config.expectedBytes,
            progressFraction: 1,
            speedBytesPerSecond: 0,
            etaSeconds: 0,
          },
          resumeUri: null,
          error: null,
        };
        await this.clearPersistedState(config.modelId);
        this.activeDownloads.delete(config.modelId);
      }
    } catch (e) {
      context.state = {
        modelId: config.modelId,
        status: 'failed',
        progress: context.state.progress,
        resumeUri: null,
        error: e instanceof Error ? e.message : 'Resume failed',
      };
      await this.persistState(config.modelId, context.state);
      throw e;
    }
  }

  async cancelDownload(modelId: string): Promise<void> {
    const context = this.activeDownloads.get(modelId);
    if (!context) {
      return;
    }

    try {
      await context.resumable.cancelAsync();
      await this.clearPersistedState(modelId);
      this.activeDownloads.delete(modelId);

      const fileInfo = await getInfoAsync(context.config.destinationPath);
      if (fileInfo.exists) {
        await deleteAsync(context.config.destinationPath, { idempotent: true });
      }
    } catch (e) {
      throw new Error(`Failed to cancel download: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  getDownloadState(modelId: string): DownloadState | null {
    const context = this.activeDownloads.get(modelId);
    return context?.state ?? null;
  }
}
