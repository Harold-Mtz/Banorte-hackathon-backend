import { AgentRequestDTO } from '../dtos/agent-request.dto';
import { AgentResponse } from '../responses/agent-response';

export interface IAgentService {
  processMessage(data: AgentRequestDTO): Promise<AgentResponse>;
}