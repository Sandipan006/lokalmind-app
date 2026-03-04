// expo-file-system is imported here for download operations.
// TODO Phase 1: implement resumable downloads using expo-file-system
// import * as FileSystem from 'expo-file-system';

import type { DownloadConfig, DownloadProgress, DownloadState } from './types';

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
}

export class DownloadService implements IDownloadService {
  private readonly activeDownloads = new Map<string, unknown>();

  async startDownload(
    _config: DownloadConfig,
    _onProgress: (progress: DownloadProgress) => void
  ): Promise<void> {
    // TODO Phase 1:
    // 1. Create FileSystem.createDownloadResumable(url, destination, {}, progressCallback)
    // 2. Store in activeDownloads map
    // 3. Call downloadResumable.downloadAsync()
    // 4. Throttle progress callbacks to 250ms intervals
    throw new Error('DownloadService.startDownload not yet implemented — Phase 1');
  }

  async pauseDownload(_modelId: string): Promise<string | null> {
    // TODO Phase 1: call downloadResumable.pauseAsync(), return resumeUri
    throw new Error('DownloadService.pauseDownload not yet implemented — Phase 1');
  }

  async resumeDownload(
    _config: DownloadConfig,
    _resumeUri: string,
    _onProgress: (progress: DownloadProgress) => void
  ): Promise<void> {
    // TODO Phase 1: recreate FileSystem.createDownloadResumable with resumeUri
    throw new Error('DownloadService.resumeDownload not yet implemented — Phase 1');
  }

  async cancelDownload(_modelId: string): Promise<void> {
    // TODO Phase 1: call downloadResumable.cancelAsync(), delete partial file
    throw new Error('DownloadService.cancelDownload not yet implemented — Phase 1');
  }

  getDownloadState(_modelId: string): DownloadState | null {
    return null;
  }
}
