import { Request, Response } from 'express';
import { ISavingsGoalService } from '../interfaces/savings-goal.interface';
import {
  successResponse,
  errorResponse
} from '../utils/response.util';

interface SavingsGoalIdParams {
  id: string;
}

interface SavingsGoalUserParams {
  userId: string;
}

export class SavingsGoalController {

  constructor(
    private readonly service: ISavingsGoalService
  ) {}

  create = async (
    req: Request,
    res: Response
  ) => {
    try {
      const goal =
        await this.service.create(req.body);

      return res
        .status(201)
        .json(
          successResponse(
            goal,
            'Savings goal created successfully'
          )
        );

    } catch (error) {

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create savings goal';

      return res
        .status(400)
        .json(
          errorResponse(
            'SAVINGS_GOAL_CREATE_ERROR',
            message
          )
        );
    }
  };

  getById = async (
    req: Request<SavingsGoalIdParams>,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      const goal =
        await this.service.getById(id);

      if (!goal) {
        return res
          .status(404)
          .json(
            errorResponse(
              'SAVINGS_GOAL_NOT_FOUND',
              'Savings goal not found'
            )
          );
      }

      return res
        .status(200)
        .json(successResponse(goal));

    } catch {
      return res
        .status(500)
        .json(
          errorResponse(
            'SAVINGS_GOAL_FETCH_ERROR',
            'Unable to fetch savings goal'
          )
        );
    }
  };

  getByUser = async (
    req: Request<SavingsGoalUserParams>,
    res: Response
  ) => {
    try {
      const { userId } = req.params;

      const goals =
        await this.service.getByUser(userId);

      return res
        .status(200)
        .json(successResponse(goals));

    } catch {
      return res
        .status(500)
        .json(
          errorResponse(
            'SAVINGS_GOALS_FETCH_ERROR',
            'Unable to fetch savings goals'
          )
        );
    }
  };

  getProgress = async (
    req: Request<SavingsGoalIdParams>,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      const progress =
        await this.service.calculateProgress(id);

      return res
        .status(200)
        .json(
          successResponse({
            goalId: id,
            progress
          })
        );

    } catch (error) {

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to calculate progress';

      return res
        .status(404)
        .json(
          errorResponse(
            'SAVINGS_GOAL_PROGRESS_ERROR',
            message
          )
        );
    }
  };

  updateCurrentAmount = async (
    req: Request<SavingsGoalIdParams>,
    res: Response
  ) => {
    try {
      const { id } = req.params;
      const { currentAmount } = req.body;

      if (typeof currentAmount !== 'number') {
        return res
          .status(400)
          .json(
            errorResponse(
              'INVALID_CURRENT_AMOUNT',
              'currentAmount must be a number'
            )
          );
      }

      const goal =
        await this.service.updateCurrentAmount(
          id,
          currentAmount
        );

      if (!goal) {
        return res
          .status(404)
          .json(
            errorResponse(
              'SAVINGS_GOAL_NOT_FOUND',
              'Savings goal not found'
            )
          );
      }

      return res
        .status(200)
        .json(
          successResponse(
            goal,
            'Savings goal updated successfully'
          )
        );

    } catch (error) {

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update savings goal';

      return res
        .status(400)
        .json(
          errorResponse(
            'SAVINGS_GOAL_UPDATE_ERROR',
            message
          )
        );
    }
  };
}