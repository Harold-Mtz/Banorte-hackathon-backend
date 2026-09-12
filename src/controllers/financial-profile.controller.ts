import { Request, Response } from 'express';
import { IFinancialService } from '../interfaces/financial-service.interface';
import {
  successResponse,
  errorResponse
} from '../utils/response.util';

import { UpdateFinancialProfileDTO } from '../dtos/update-financial-profile.dto';

interface FinancialProfileParams {
  userId: string;
}

export class FinancialProfileController {
  constructor(
    private readonly service: IFinancialService
  ) {}

  getByUserId = async (
    req: Request<FinancialProfileParams>,
    res: Response
  ): Promise<Response> => {
    try {
      const { userId } = req.params;

      const profile =
        await this.service.getProfile(userId);

      if (!profile) {
        return res.status(404).json(
          errorResponse(
            'FINANCIAL_PROFILE_NOT_FOUND',
            'Financial profile not found'
          )
        );
      }

      return res.status(200).json(
        successResponse(profile)
      );
    } catch (error) {
      return res.status(500).json(
        errorResponse(
          'INTERNAL_SERVER_ERROR',
          'An unexpected error occurred'
        )
      );
    }
  };

  updateByUserId = async (
    req: Request<
      FinancialProfileParams,
      {},
      UpdateFinancialProfileDTO
    >,
    res: Response
  ): Promise<Response> => {
    try {
      const { userId } = req.params;
      const data = req.body;

      const updatedProfile =
        await this.service.updateProfile(
          userId,
          data
        );

      return res.status(200).json(
        successResponse(
          updatedProfile,
          'Financial profile updated successfully'
        )
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'FINANCIAL_PROFILE_NOT_FOUND'
      ) {
        return res.status(404).json(
          errorResponse(
            'FINANCIAL_PROFILE_NOT_FOUND',
            'Financial profile not found'
          )
        );
      }

      return res.status(500).json(
        errorResponse(
          'INTERNAL_SERVER_ERROR',
          'An unexpected error occurred'
        )
      );
    }
  };

  getSummary = async (
    req: Request<FinancialProfileParams>,
    res: Response
  ): Promise<Response> => {
    try {
      const { userId } = req.params;

      const summary =
        await this.service.getFinancialSummary(userId);

      return res.status(200).json(
        successResponse(summary)
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'FINANCIAL_PROFILE_NOT_FOUND'
      ) {
        return res.status(404).json(
          errorResponse(
            'FINANCIAL_PROFILE_NOT_FOUND',
            'Financial profile not found'
          )
        );
      }

      return res.status(500).json(
        errorResponse(
          'INTERNAL_SERVER_ERROR',
          'An unexpected error occurred'
        )
      );
    }
  };
}