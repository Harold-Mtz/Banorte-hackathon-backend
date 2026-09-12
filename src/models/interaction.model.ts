export interface Interaction {
  id: string;
  sessionId: string;
  componentId: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}