import { z } from 'zod';
import { ISavingsGoalService } from '../../interfaces/savings-goal-service.interface';

export const createSavingsGoalInputSchema = z.object({
  userId: z.string().uuid(),

  lifeEventId: z.string().uuid().optional(),

  name: z.string().min(1),

  targetAmount: z.number().positive(),

  currentAmount: z.number().nonnegative().optional(),

  monthlyContribution:
    z.number().positive().optional(),

  targetDate: z.string().optional()
});

export type CreateSavingsGoalInput =
  z.infer<typeof createSavingsGoalInputSchema>;

export const createSavingsGoalTool = (
  savingsGoalService: ISavingsGoalService
) => {
  return async (
    input: CreateSavingsGoalInput
  ) => {

    const goal =
      await savingsGoalService.create({
        userId: input.userId,
        lifeEventId: input.lifeEventId,
        name: input.name,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount,
        monthlyContribution:
          input.monthlyContribution,
        targetDate: input.targetDate
      });

    return {
      id: goal.id,
      userId: goal.userId,
      lifeEventId: goal.lifeEventId,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      monthlyContribution:
        goal.monthlyContribution,
      targetDate: goal.targetDate,
      status: goal.status
    };
  };
};