export type AgentSessionStatus =
| 'ACTIVE'
| 'COMPLETED'
| 'CANCELLED';

export interface AgentSession {
  id: string;
  userId: string;
  lifeEventId: string | null;
  status: AgentSessionStatus;
  currentIntent: string | null;
  context: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}