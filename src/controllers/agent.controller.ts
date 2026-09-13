import { Request, Response } from 'express';
import { IAgentService } from '../interfaces/agent-service.interface';
import {
  successResponse,
  errorResponse
} from '../utils/response.util';

import { AgentRequestDTO } from '../dtos/agent-request.dto';
import { AgentInteractionDTO } from '../dtos/agent-interaction.dto';

export class AgentController {

  constructor(
    private readonly service: IAgentService
  ) {}

  processMessage = async (
    req: Request<{}, {}, AgentRequestDTO>,
    res: Response
  ) => {
    try {
      const userId = req.authUserId ?? req.body.userId;
      const { message } = req.body;

      if (!userId || !message) {
        return res.status(400).json(
          errorResponse(
            'INVALID_AGENT_REQUEST',
            'userId and message are required'
          )
        );
      }

      const response = await this.service.processMessage({ ...req.body, userId });

      return res.status(200).json(
        successResponse(response)
      );

    } catch (error) {
      console.error(error);

      return res.status(500).json(
        errorResponse(
          'AGENT_PROCESS_ERROR',
          'Unable to process agent request. Check the agent dependencies.'
        )
      );
    }
  };

  processInteraction = async (
    req: Request<{}, {}, AgentInteractionDTO & { userId: string }>,
    res: Response
  ) => {
    try {
      const userId = req.authUserId ?? req.body.userId;
      const { sessionId, componentId, action } = req.body;
      if (!userId || !sessionId || !componentId || !action) {
        return res.status(400).json(errorResponse('INVALID_AGENT_INTERACTION', 'userId, sessionId, componentId and action are required'));
      }
      const response = await this.service.processInteraction({ ...req.body, userId });
      return res.status(200).json(successResponse(response));
    } catch (error) {
      console.error(error);
      return res.status(500).json(errorResponse('AGENT_INTERACTION_ERROR', 'Unable to process agent interaction'));
    }
  };
}