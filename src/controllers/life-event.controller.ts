import { Request, Response } from 'express';
import { ILifeEventService } from '../interfaces/life-event-service.interface';
import {
  successResponse,
  errorResponse
} from '../utils/response.util';

interface LifeEventParams {
    id: string;
}
interface UserParams {
    userId: string;
}

export class LifeEventController {
  constructor(
    private readonly service: ILifeEventService
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const lifeEvent = await this.service.create(req.body);

      return res
        .status(201)
        .json(
          successResponse(
            lifeEvent,
            'Life event created successfully'
          )
        );
    } catch (error) {
      return res
        .status(500)
        .json(
          errorResponse(
            'LIFE_EVENT_CREATE_ERROR',
            'Unable to create life event'
          )
        );
    }
  };

  getById = async (req: Request<LifeEventParams>, res: Response) => {
    try {
      const { id } = req.params;

      const lifeEvent = await this.service.getById(id);

      if (!lifeEvent) {
        return res
          .status(404)
          .json(
            errorResponse(
              'LIFE_EVENT_NOT_FOUND',
              'Life event not found'
            )
          );
      }

      return res
        .status(200)
        .json(successResponse(lifeEvent));
    } catch (error) {
      return res
        .status(500)
        .json(
          errorResponse(
            'LIFE_EVENT_FETCH_ERROR',
            'Unable to fetch life event'
          )
        );
    }
  };

  getByUser = async (req: Request<UserParams>, res: Response) => {
    try {
      const { userId } = req.params;

      const lifeEvents =
        await this.service.getByUser(userId);

      return res
        .status(200)
        .json(successResponse(lifeEvents));
    } catch (error) {
      return res
        .status(500)
        .json(
          errorResponse(
            'LIFE_EVENTS_FETCH_ERROR',
            'Unable to fetch life events'
          )
        );
    }
  };
}