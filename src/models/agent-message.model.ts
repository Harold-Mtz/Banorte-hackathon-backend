export type AgentMessageRole =
| 'USER'
| 'ASSISTANT'
| 'SYSTEM'
| 'TOOL';

export interface AgentMessage {
  id: string;
  sessionId: string;
  role: AgentMessageRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}