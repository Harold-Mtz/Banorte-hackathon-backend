import { idSchema } from '../../domain/validation';
import { z } from "zod";

import { IFinancialService } from "../../interfaces/financial-service.interface";

export const getFinancialProfileInputSchema = z.object({
  userId: idSchema,
});

export type GetFinancialProfileInput = z.infer<
  typeof getFinancialProfileInputSchema
>;

export const createGetFinancialProfileTool = (
  financialService: IFinancialService,
) => {
  return async (input: GetFinancialProfileInput) => {
    input = getFinancialProfileInputSchema.parse(input);
    const profile = await financialService.getProfile(input.userId);

    if (!profile) {
      throw new Error("Financial profile not found");
    }

    return {
      userId: profile.userId,
      monthlyIncome: profile.monthlyIncome,
      monthlyExpenses: profile.monthlyExpenses,
      currentSavings: profile.currentSavings,
      currentDebt: profile.currentDebt,
      creditScore: profile.creditScore,
    };
  };
};
