import { Request, Response } from 'express';
import { IUserService } from '../interfaces/user-service.interface';
import {
  successResponse,
  errorResponse
} from '../utils/response.util';

interface UserParams {
  id: string;
}

export class UserController {
  constructor(
    private readonly userService: IUserService
  ) {}

  getById = async (
    req: Request<UserParams>,
    res: Response
  ): Promise<Response> => {
    try {
      const { id } = req.params;

      const user = await this.userService.getById(id);

      if (!user) {
        return res.status(404).json(
          errorResponse(
            'USER_NOT_FOUND',
            'User not found'
          )
        );
      }

      return res.status(200).json(
        successResponse(user)
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
}