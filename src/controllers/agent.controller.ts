import { Request, Response } from 'express';
import { IAgentService } from '../interfaces/agent-service.interface';
import {
  successResponse,
  errorResponse
} from '../utils/response.util';

import { AgentRequestDTO } from '../dtos/agent-request.dto';

export class AgentController {

  constructor(
    private readonly service: IAgentService
  ) {}

  processMessage = async (
    req: Request<{}, {}, AgentRequestDTO>,
    res: Response
  ) => {
    try {
      const { userId, message } = req.body;

      if (!userId || !message) {
        return res.status(400).json(
          errorResponse(
            'INVALID_AGENT_REQUEST',
            'userId and message are required'
          )
        );
      }

      const response =
        await this.service.processMessage(req.body);

      return res.status(200).json(
        successResponse(response)
      );

    } catch (error) {
      console.error(error);

      return res.status(500).json(
        errorResponse(
          'AGENT_PROCESS_ERROR',
          'Unable to process agent request'
        )
      );
    }
  };
}