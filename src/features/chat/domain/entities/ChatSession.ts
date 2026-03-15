export interface ChatSession {
  readonly id: string;
  readonly modelId: string;
  readonly title: string;
  readonly isTitleLocked: boolean;
  readonly lastTitleBucket: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}
