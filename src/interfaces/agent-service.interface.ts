import { AgentRequestDTO } from '../dtos/agent-request.dto';
import { AgentInteractionDTO } from '../dtos/agent-interaction.dto';
import { AgentResponse } from '../responses/agent-response';

export interface IAgentService {
  processMessage(data: AgentRequestDTO): Promise<AgentResponse>;
  processInteraction(data: AgentInteractionDTO & { userId: string }): Promise<AgentResponse>;
}