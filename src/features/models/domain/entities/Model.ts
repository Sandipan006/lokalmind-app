export interface Model {
  readonly id: string;
  readonly displayName: string;
  readonly filename: string;
  readonly sizeBytes: number;
  readonly description: string;
  readonly ramRequirement: string;
  readonly minRamBytes: number;
  readonly isPaid: boolean;
  readonly isDownloaded: boolean;
  readonly downloadProgress?: number;
  /** False when device usable RAM is below minRamBytes. Prevents download + warns user. */
  readonly isCompatibleWithDevice: boolean;
}
