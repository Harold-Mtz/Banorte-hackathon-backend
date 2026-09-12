import { Interaction } from '../models/interaction.model';

export interface IInteractionService {

  createInteraction(
    sessionId: string,
    componentId: string,
    action: string,
    payload?: Record<string, unknown>
  ): Promise<Interaction>;

  getSessionInteractions(
    sessionId: string
  ): Promise<Interaction[]>;
}