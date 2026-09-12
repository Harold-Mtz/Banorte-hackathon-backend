import { Request, Response } from 'express';
import { IUIStateService } from '../interfaces/ui-state-service.interface';
import {
  successResponse,
  errorResponse
} from '../utils/response.util';

export class UIStateController {
  constructor(
    private readonly uiStateService: IUIStateService
  ) {}

  create = async (
    req: Request<{ sessionId: string }>,
    res: Response
  ) => {
    try {
      const { sessionId } = req.params;
      const { schema } = req.body;

    if (!schema) {
        return res.status(400).json(
            errorResponse(
                'INVALID_UI_SCHEMA',
                'schema is required'
            )
        );
    }
    
      const uiState =
        await this.uiStateService.create(
          sessionId,
          schema
        );

      return res.status(201).json(
        successResponse(
          uiState,
          'UI state created successfully'
        )
      );
    } catch (error) {
      return res.status(500).json(
        errorResponse(
          'UI_STATE_CREATE_ERROR',
          'Could not create UI state'
        )
      );
    }
  };

  getLatest = async (
    req: Request<{ sessionId: string }>,
    res: Response
  ) => {
    try {
      const { sessionId } = req.params;

      const uiState =
        await this.uiStateService.getLatest(
          sessionId
        );

      if (!uiState) {
        return res.status(404).json(
          errorResponse(
            'UI_STATE_NOT_FOUND',
            'UI state not found'
          )
        );
      }

      return res.status(200).json(
        successResponse(uiState)
      );
    } catch (error) {
      return res.status(500).json(
        errorResponse(
          'UI_STATE_GET_ERROR',
          'Could not get UI state'
        )
      );
    }
  };
}