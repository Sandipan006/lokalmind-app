import type { IWhisperEngine, WhisperResult, WhisperTranscribeOptions } from '@/src/core/ports';
import type { AppError } from '@/src/core/types';

// whisper.rn is imported here - the ONLY file in the codebase allowed to do so.
// All STT calls go through IWhisperEngine. Nothing outside this file imports whisper.rn.
// TODO Phase 3: implement using whisper.rn
// import { initWhisper } from 'whisper.rn';

export class WhisperRnAdapter implements IWhisperEngine {
  private isInitialized = false;

  async initialize(_modelPath: string): Promise<void> {
    // TODO Phase 3: call initWhisper() with model path
    throw this.notImplemented('initialize');
  }

  async transcribe(_options: WhisperTranscribeOptions): Promise<WhisperResult> {
    if (!this.isInitialized) {
      throw this.notImplemented('transcribe - model not loaded');
    }
    // TODO Phase 3: call context.transcribe(), return text + detected language
    throw this.notImplemented('transcribe');
  }

  isModelLoaded(): boolean {
    return this.isInitialized;
  }

  async unload(): Promise<void> {
    // TODO Phase 3: call context.release()
    // IMPORTANT: If initialize() gets implemented, unload() must release the context
    // to avoid zombie Whisper contexts (follow llamaRnAdapter release patterns).
    this.isInitialized = false;
  }

  private notImplemented(method: string): AppError {
    return {
      code: 'TRANSCRIPTION_ERROR',
      message: `WhisperRnAdapter.${method} not yet implemented - Phase 3`,
    };
  }
}
