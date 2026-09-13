import { z } from "zod";
import { Request, Response } from "express";

import { AuthService } from "../services/auth.service";
import { errorResponse, successResponse } from "../utils/response.util";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    const parsed = z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z
          .email()
          .max(180)
          .transform((value) => value.toLowerCase()),
        password: z
          .string()
          .min(8)
          .refine((value) => Buffer.byteLength(value) <= 72),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json(
          errorResponse(
            "INVALID_REGISTER_REQUEST",
            "Revisa los datos de tu cuenta. La contraseña debe tener al menos 8 caracteres y hasta 72 bytes.",
          ),
        );
    try {
      const { name, email, password } = parsed.data;
      return res
        .status(201)
        .json(
          successResponse(
            await this.authService.register(name, email, password),
          ),
        );
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "23505"
      )
        return res
          .status(409)
          .json(
            errorResponse("EMAIL_IN_USE", "Este correo ya tiene una cuenta."),
          );
      return res
        .status(500)
        .json(errorResponse("REGISTER_ERROR", "No pudimos crear tu cuenta."));
    }
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body as {
      email?: unknown;
      password?: unknown;
    };

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json(
          errorResponse(
            "INVALID_LOGIN_REQUEST",
            "Email and password are required",
          ),
        );
    }

    try {
      const result = await this.authService.login({
        email: email.trim().toLowerCase(),
        password,
      });

      return res.status(200).json(successResponse(result, "Login successful"));
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
        return res
          .status(401)
          .json(
            errorResponse("INVALID_CREDENTIALS", "Invalid email or password"),
          );
      }

      return res
        .status(500)
        .json(errorResponse("LOGIN_ERROR", "Could not complete login"));
    }
  };
}
