import { z } from "zod";

import { IAmortizationService } from "../../interfaces/amortization-service.interface";

export const generateAmortizationScheduleInputSchema = z.object({
  principal: z.number().positive(),

  annualInterestRate: z.number().nonnegative(),

  // Bound the rendered schedule and the amount of work per authenticated request.
  termMonths: z.number().int().positive().max(600),
});

export type GenerateAmortizationScheduleInput = z.infer<
  typeof generateAmortizationScheduleInputSchema
>;

export const createGenerateAmortizationScheduleTool = (
  amortizationService: IAmortizationService,
) => {
  return async (input: GenerateAmortizationScheduleInput) => {
    input = generateAmortizationScheduleInputSchema.parse(input);
    const result = await amortizationService.generateSchedule({
      principal: input.principal,
      annualInterestRate: input.annualInterestRate,
      termMonths: input.termMonths,
    });

    return {
      principal: result.principal,

      annualInterestRate: result.annualInterestRate,

      termMonths: result.termMonths,

      monthlyPayment: result.monthlyPayment,

      totalPayment: result.totalPayment,

      totalInterest: result.totalInterest,

      schedule: result.schedule,
    };
  };
};
