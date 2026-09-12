import { Request, Response } from 'express';

import { IInteractionService } from '../interfaces/interaction-service.interface';

import {
  successResponse,
  errorResponse
} from '../utils/response.util';

export class InteractionController {

  constructor(
    private readonly service: IInteractionService
  ) {}

  create = async (
    req: Request,
    res: Response
  ) => {

    try {

      const {
        sessionId,
        componentId,
        action,
        payload
      } = req.body;

      const interaction =
        await this.service.createInteraction(
          sessionId,
          componentId,
          action,
          payload
        );

      return res.status(201).json(
        successResponse(
          interaction,
          'Interaction saved successfully'
        )
      );

    } catch {

      return res.status(500).json(
        errorResponse(
          'CREATE_INTERACTION_ERROR',
          'Could not save interaction'
        )
      );
    }
  };

  getBySession = async (
    req: Request<{ sessionId: string }>,
    res: Response
  ) => {

    try {

      const interactions =
        await this.service
          .getSessionInteractions(
            req.params.sessionId
          );

      return res.status(200).json(
        successResponse(interactions)
      );

    } catch {

      return res.status(500).json(
        errorResponse(
          'GET_INTERACTIONS_ERROR',
          'Could not retrieve interactions'
        )
      );
    }
  };
}