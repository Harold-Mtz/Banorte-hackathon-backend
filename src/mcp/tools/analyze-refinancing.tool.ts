import { z } from "zod";

import { IRefinancingService } from "../../interfaces/refinancing-service.interface";

export const analyzeRefinancingInputSchema = z.object({
  currentBalance: z.number().positive(),

  currentAnnualRate: z.number().nonnegative(),

  remainingTermMonths: z.number().int().positive(),

  newAnnualRate: z.number().nonnegative(),

  newTermMonths: z.number().int().positive(),

  refinancingFees: z.number().nonnegative().default(0),
});

export type AnalyzeRefinancingInput = z.infer<
  typeof analyzeRefinancingInputSchema
>;

export const createAnalyzeRefinancingTool = (
  refinancingService: IRefinancingService,
) => {
  return async (input: AnalyzeRefinancingInput) => {
    input = analyzeRefinancingInputSchema.parse(input);
    const result = await refinancingService.analyze({
      currentBalance: input.currentBalance,

      currentAnnualRate: input.currentAnnualRate,

      remainingTermMonths: input.remainingTermMonths,

      newAnnualRate: input.newAnnualRate,

      newTermMonths: input.newTermMonths,

      refinancingFees: input.refinancingFees,
    });

    return {
      recommended: result.recommended,

      currentMonthlyPayment: result.currentMonthlyPayment,

      newMonthlyPayment: result.newMonthlyPayment,

      monthlySavings: result.monthlySavings,

      currentTotalRemainingPayment: result.currentTotalRemainingPayment,

      newTotalPayment: result.newTotalPayment,

      grossSavings: result.grossSavings,

      refinancingFees: result.refinancingFees,

      netSavings: result.netSavings,

      breakEvenMonths: result.breakEvenMonths,
    };
  };
};
