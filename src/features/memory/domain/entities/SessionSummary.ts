export interface SessionSummary {
  id: string;
  sessionId: string;
  bucketIndex: number;
  summary: string;
  turnStart: number;
  turnEnd: number;
  createdAt: number;
}
