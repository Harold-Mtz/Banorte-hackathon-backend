export interface UIState {
  id: string;
  sessionId: string;
  version: number;
  schema: Record<string, unknown>;
  createdAt: Date;
}