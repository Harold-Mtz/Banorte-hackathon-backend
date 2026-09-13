import { z } from "zod";

import { IAmortizationService } from "../../interfaces/amortization-service.interface";

export const generateAmortizationScheduleInputSchema = z.object({
  principal: z.number().positive(),

  annualInterestRate: z.number().nonnegative(),

  termMonths: z.number().int().positive(),
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
