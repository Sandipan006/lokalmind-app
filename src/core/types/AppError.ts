export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'STORAGE_ERROR'
  | 'MODEL_NOT_LOADED'
  | 'MODEL_LOAD_FAILED'
  | 'GENERATION_ERROR'
  | 'GENERATION_CANCELLED'
  | 'DOWNLOAD_FAILED'
  | 'DOWNLOAD_PAUSED'
  | 'TRANSCRIPTION_ERROR'
  | 'MEMORY_EXTRACTION_ERROR'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR';

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

export const createError = (
  code: AppErrorCode,
  message: string,
  cause?: unknown
): AppError => ({ code, message, cause });
