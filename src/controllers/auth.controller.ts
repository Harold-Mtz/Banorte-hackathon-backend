import { Request, Response } from 'express';

import { AuthService } from '../services/auth.service';
import { errorResponse, successResponse } from '../utils/response.util';

export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) {}

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body as {
      email?: unknown;
      password?: unknown;
    };

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json(
        errorResponse(
          'INVALID_LOGIN_REQUEST',
          'Email and password are required'
        )
      );
    }

    try {
      const result = await this.authService.login({
        email: email.trim().toLowerCase(),
        password
      });

      return res.status(200).json(
        successResponse(result, 'Login successful')
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json(
          errorResponse(
            'INVALID_CREDENTIALS',
            'Invalid email or password'
          )
        );
      }

      return res.status(500).json(
        errorResponse(
          'LOGIN_ERROR',
          'Could not complete login'
        )
      );
    }
  };
}
