import { type AppError } from './AppError';

export type Result<T, E = AppError> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export const ok = <T>(data: T): Result<T, never> => ({ success: true, data });
export const err = <E>(error: E): Result<never, E> => ({ success: false, error });
