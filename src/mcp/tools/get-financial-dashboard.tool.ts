import { z } from 'zod';
import { FinancialMovementService } from '../../services/financial-movement.service';

export const getFinancialDashboardInputSchema = z.object({ userId: z.string().uuid() });
export const createGetFinancialDashboardTool = (service: FinancialMovementService) => async (input: z.infer<typeof getFinancialDashboardInputSchema>) => service.getDashboard(input.userId);
