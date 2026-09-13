import { z } from 'zod';
import { IMortgageService } from '../../interfaces/mortgage-service.interface';

export const simulateMortgageInputSchema = z.object({
  userId: z.string().uuid(),
  lifeEventId: z.string().uuid().optional(),
  financialProductId: z.string().uuid(),

  propertyValue: z.number().positive(),
  downPayment: z.number().nonnegative(),
  termMonths: z.number().int().positive()
});

export type SimulateMortgageInput =
  z.infer<typeof simulateMortgageInputSchema>;

export const createSimulateMortgageTool = (
  mortgageService: IMortgageService
) => {
  return async (input: SimulateMortgageInput) => {
    const simulation =
      await mortgageService.simulate({
        userId: input.userId,
        lifeEventId: input.lifeEventId,
        financialProductId: input.financialProductId,
        propertyValue: input.propertyValue,
        downPayment: input.downPayment,
        termMonths: input.termMonths
      });

    return {
      id: simulation.id,
      propertyValue: simulation.propertyValue,
      downPayment: simulation.downPayment,
      loanAmount: simulation.loanAmount,
      termMonths: simulation.termMonths,
      annualInterestRate:
        simulation.annualInterestRate,
      monthlyPayment:
        simulation.monthlyPayment,
      totalPayment:
        simulation.totalPayment,
      totalInterest:
        simulation.totalInterest
    };
  };
};