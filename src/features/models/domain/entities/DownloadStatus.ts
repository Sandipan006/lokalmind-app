export type DownloadStatusType =
  | 'idle'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed';

export interface DownloadProgressInfo {
  readonly modelId: string;
  readonly bytesWritten: number;
  readonly totalBytes: number;
  readonly progressFraction: number;
  readonly speedBytesPerSecond: number;
  readonly etaSeconds: number;
  readonly status: DownloadStatusType;
}
