import { Request, Response } from 'express';

import { IAgentSessionService } from '../interfaces/agent-session-service.interface';

import {
  successResponse,
  errorResponse
} from '../utils/response.util';

export class AgentSessionController {

  constructor(
    private readonly service: IAgentSessionService
  ) {}

  create = async (
    req: Request,
    res: Response
  ) => {

    try {

      const {
        userId,
        lifeEventId,
        currentIntent,
        context
      } = req.body;

      const session =
        await this.service.createSession(
          userId,
          lifeEventId,
          currentIntent,
          context
        );

      return res.status(201).json(
        successResponse(
          session,
          'Agent session created successfully'
        )
      );

    } catch (error) {

      return res.status(500).json(
        errorResponse(
          'CREATE_AGENT_SESSION_ERROR',
          'Could not create agent session'
        )
      );
    }
  };

  getById = async (
    req: Request<{ sessionId: string }>,
    res: Response
  ) => {

    try {

      const session =
        await this.service.getSession(
          req.params.sessionId
        );

      if (!session) {

        return res.status(404).json(
          errorResponse(
            'AGENT_SESSION_NOT_FOUND',
            'Agent session not found'
          )
        );
      }

      return res.status(200).json(
        successResponse(session)
      );

    } catch {

      return res.status(500).json(
        errorResponse(
          'GET_AGENT_SESSION_ERROR',
          'Could not retrieve agent session'
        )
      );
    }
  };

  addMessage = async (
    req: Request<{ sessionId: string }>,
    res: Response
  ) => {

    try {

      const { role, content, metadata } =
        req.body;

      const message =
        await this.service.addMessage(
          req.params.sessionId,
          role,
          content,
          metadata
        );

      return res.status(201).json(
        successResponse(
          message,
          'Message saved successfully'
        )
      );

    } catch {

      return res.status(500).json(
        errorResponse(
          'CREATE_AGENT_MESSAGE_ERROR',
          'Could not save agent message'
        )
      );
    }
  };

  getMessages = async (
    req: Request<{ sessionId: string }>,
    res: Response
  ) => {

    try {

      const messages =
        await this.service.getMessages(
          req.params.sessionId
        );

      return res.status(200).json(
        successResponse(messages)
      );

    } catch {

      return res.status(500).json(
        errorResponse(
          'GET_AGENT_MESSAGES_ERROR',
          'Could not retrieve messages'
        )
      );
    }
  };

  getLatestUIState = async (
    req: Request<{ sessionId: string }>,
    res: Response
  ) => {

    const uiState =
      await this.service.getLatestUIState(
        req.params.sessionId
      );

    return res.status(200).json(
      successResponse(uiState)
    );
  };
}