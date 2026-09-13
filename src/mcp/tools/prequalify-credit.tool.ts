import { z } from "zod";

import { IPrequalificationService } from "../../interfaces/prequalification-service.interface";

export const prequalifyCreditInputSchema =
  z.object({
    userId: z.string().regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      "Invalid user ID format"
    ),

    requestedAmount: z.number().positive(),

    annualInterestRate:
      z.number().nonnegative(),

    termMonths:
      z.number().int().positive(),
  });

export type PrequalifyCreditInput =
  z.infer<
    typeof prequalifyCreditInputSchema
  >;

export const createPrequalifyCreditTool =
  (
    prequalificationService:
      IPrequalificationService
  ) => {
    return async (
      input: PrequalifyCreditInput
    ) => {
      return prequalificationService.prequalify(
        input
      );
    };
  };