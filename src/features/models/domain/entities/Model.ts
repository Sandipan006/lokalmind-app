export interface Model {
  readonly id: string;
  readonly displayName: string;
  readonly filename: string;
  readonly sizeBytes: number;
  readonly description: string;
  readonly ramRequirement: string;
  readonly isPaid: boolean;
  readonly isDownloaded: boolean;
  readonly downloadProgress?: number;
}
