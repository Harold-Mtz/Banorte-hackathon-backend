export type AgentMessageRole =
| 'USER'
| 'ASSISTANT'
| 'SYSTEM'
| 'TOOL';

export interface AgentMessage {
  id: string;
  session_id: string;
  role: AgentMessageRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}