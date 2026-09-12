export type AgentSessionStatus =
| 'ACTIVE'
| 'COMPLETED'
| 'CANCELLED';

export interface AgentSession {
  id: string;
  user_id: string;
  life_event_id: string | null;
  status: AgentSessionStatus;
  current_intent: string | null;
  context: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}