import { idSchema } from '../../domain/validation';
import { z } from 'zod';
import { SavingsGoalService } from '../../services/savings-goal.service';
import { goalPlanSchema } from '../../domain/validation';
export const goalManagementInputSchema = z.object({
  userId: idSchema, goalId: idSchema,
  changes: goalPlanSchema.partial().extend({ status: z.enum(['ACTIVE','PAUSED','CANCELLED','ARCHIVED','DELETED']).optional(), metadata: z.record(z.string(), z.unknown()).optional() })
});
export const createGoalManagementTool = (service: SavingsGoalService) => async (input: z.infer<typeof goalManagementInputSchema>) => {
  const data = goalManagementInputSchema.parse(input);
  return service.updateOwned(data.userId, data.goalId, data.changes);
};
export const listGoalsInputSchema = z.object({ userId: idSchema });
export const createListSavingsGoalsTool = (service: SavingsGoalService) => async (input: z.infer<typeof listGoalsInputSchema>) => service.getByUser(listGoalsInputSchema.parse(input).userId);
