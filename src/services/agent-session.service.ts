import { IAgentSessionService } from '../interfaces/agent-session-service.interface';

import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import { UIStateRepository } from '../repositories/ui-state.repository';

import { AgentSession } from '../models/agent-session.model';
import { AgentMessage } from '../models/agent-message.model';
import { UIState } from '../models/ui-state.model';

export class AgentSessionService
  implements IAgentSessionService {

  constructor(
    private readonly sessionRepository:
      AgentSessionRepository,

    private readonly messageRepository:
      AgentMessageRepository,

    private readonly uiStateRepository:
      UIStateRepository
  ) {}

  async createSession(
    userId: string,
    lifeEventId?: string,
    currentIntent?: string,
    context: Record<string, unknown> = {}
  ): Promise<AgentSession> {

    return this.sessionRepository.create(
      userId,
      lifeEventId,
      currentIntent,
      context
    );
  }

  async getSession(
    sessionId: string
  ): Promise<AgentSession | null> {

    return this.sessionRepository.findById(
      sessionId
    );
  }

  async addMessage(
    sessionId: string,
    role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL',
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<AgentMessage> {

    const session =
      await this.sessionRepository.findById(
        sessionId
      );

    if (!session) {
      throw new Error('AGENT_SESSION_NOT_FOUND');
    }

    return this.messageRepository.create(
      sessionId,
      role,
      content,
      metadata
    );
  }

  async getMessages(
    sessionId: string
  ): Promise<AgentMessage[]> {

    return this.messageRepository.findBySessionId(
      sessionId
    );
  }

  async saveUIState(
    sessionId: string,
    schema: Record<string, unknown>
  ): Promise<UIState> {

    const latest =
      await this.uiStateRepository.findLatestBySessionId(
        sessionId
      );

    const nextVersion =
      latest ? latest.version + 1 : 1;

    return this.uiStateRepository.create(
      sessionId,
      nextVersion,
      schema
    );
  }

  async getLatestUIState(
    sessionId: string
  ): Promise<UIState | null> {

    return this.uiStateRepository
      .findLatestBySessionId(sessionId);
  }
}