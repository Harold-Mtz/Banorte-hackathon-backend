import { IInteractionService } from '../interfaces/interaction-service.interface';

import { InteractionRepository } from '../repositories/interaction.repository';
import { AgentSessionRepository } from '../repositories/agent-session.repository';

import { Interaction } from '../models/interaction.model';

export class InteractionService
  implements IInteractionService {

  constructor(
    private readonly interactionRepository:
      InteractionRepository,

    private readonly sessionRepository:
      AgentSessionRepository
  ) {}

  async createInteraction(
    sessionId: string,
    componentId: string,
    action: string,
    payload: Record<string, unknown> = {}
  ): Promise<Interaction> {

    const session =
      await this.sessionRepository.findById(
        sessionId
      );

    if (!session) {
      throw new Error('AGENT_SESSION_NOT_FOUND');
    }

    return this.interactionRepository.create(
      sessionId,
      componentId,
      action,
      payload
    );
  }

  async getSessionInteractions(
    sessionId: string
  ): Promise<Interaction[]> {

    return this.interactionRepository
      .findBySessionId(sessionId);
  }
}