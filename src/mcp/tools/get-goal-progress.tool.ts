import { z } from "zod";

import { ISavingsGoalService } from "../../interfaces/savings-goal.interface";

export const getGoalProgressInputSchema = z.object({
  goalId: z.string().uuid(),
});

export type GetGoalProgressInput = z.infer<typeof getGoalProgressInputSchema>;

export const createGetGoalProgressTool = (
  savingsGoalService: ISavingsGoalService,
) => {
  return async (input: GetGoalProgressInput) => {
    const progress = await savingsGoalService.getProgress(input.goalId);

    return {
      goalId: progress.goalId,
      name: progress.name,

      targetAmount: progress.targetAmount,

      currentAmount: progress.currentAmount,

      remainingAmount: progress.remainingAmount,

      progressPercentage: progress.progressPercentage,

      monthlyContribution: progress.monthlyContribution,

      requiredMonthlyContribution: progress.requiredMonthlyContribution,

      targetDate: progress.targetDate,

      monthsRemaining: progress.monthsRemaining,

      status: progress.status,
    };
  };
};
