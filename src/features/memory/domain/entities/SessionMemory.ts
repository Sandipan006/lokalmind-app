export interface SessionMemory {
  id: string;
  sessionId: string;
  sessionTitle: string;
  summary: string;
  embedding: string | null; // JSON-serialised float[384]
  score: number;
  isPinned: boolean;
  isUserEdited: boolean;
  createdAt: number;
  updatedAt: number;
}
