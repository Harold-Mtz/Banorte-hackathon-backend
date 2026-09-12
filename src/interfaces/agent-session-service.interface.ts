import { AgentSession } from '../models/agent-session.model';
import { AgentMessage } from '../models/agent-message.model';
import { UIState } from '../models/ui-state.model';

export interface IAgentSessionService {

  createSession(
    userId: string,
    lifeEventId?: string,
    currentIntent?: string,
    context?: Record<string, unknown>
  ): Promise<AgentSession>;

  getSession(
    sessionId: string
  ): Promise<AgentSession | null>;

  addMessage(
    sessionId: string,
    role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<AgentMessage>;

  getMessages(
    sessionId: string
  ): Promise<AgentMessage[]>;

  saveUIState(
    sessionId: string,
    schema: Record<string, unknown>
  ): Promise<UIState>;

  getLatestUIState(
    sessionId: string
  ): Promise<UIState | null>;
}