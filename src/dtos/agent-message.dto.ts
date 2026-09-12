import { AgentMessageRole } from '../models/agent-message.model';

export interface CreateAgentMessageDTO {
  sessionId: string;
  role: AgentMessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}