export interface WhisperTranscribeOptions {
  audioPath: string;
  language?: string;
}

export interface WhisperResult {
  text: string;
  language: string;
  durationMs: number;
}

export interface IWhisperEngine {
  initialize(modelPath: string): Promise<void>;
  transcribe(options: WhisperTranscribeOptions): Promise<WhisperResult>;
  isModelLoaded(): boolean;
  unload(): Promise<void>;
}
