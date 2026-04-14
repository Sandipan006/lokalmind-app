export interface IEmbeddingService {
  initialize(): Promise<void>;
  embed(text: string): Promise<number[]>;
  isReady(): boolean;
  setLlmBusy(busy: boolean): void;
  release(): Promise<void>;
}
