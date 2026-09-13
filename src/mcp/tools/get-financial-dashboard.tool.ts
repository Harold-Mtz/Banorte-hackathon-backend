import { idSchema } from '../../domain/validation';
import { z } from 'zod';
import { FinancialMovementService } from '../../services/financial-movement.service';

export const getFinancialDashboardInputSchema = z.object({ userId: idSchema });
export const createGetFinancialDashboardTool = (service: FinancialMovementService) => async (input: z.infer<typeof getFinancialDashboardInputSchema>) => service.getDashboard(getFinancialDashboardInputSchema.parse(input).userId);
