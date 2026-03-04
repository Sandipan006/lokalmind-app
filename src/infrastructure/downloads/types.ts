export interface DownloadProgress {
  readonly modelId: string;
  readonly bytesWritten: number;
  readonly totalBytes: number;
  readonly progressFraction: number;
  readonly speedBytesPerSecond: number;
  readonly etaSeconds: number;
}

export type DownloadStatus =
  | 'idle'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed';

export interface DownloadState {
  readonly modelId: string;
  readonly status: DownloadStatus;
  readonly progress: DownloadProgress | null;
  readonly resumeUri: string | null;
  readonly error: string | null;
}

export interface DownloadConfig {
  readonly modelId: string;
  readonly url: string;
  readonly destinationPath: string;
  readonly expectedBytes: number;
}
