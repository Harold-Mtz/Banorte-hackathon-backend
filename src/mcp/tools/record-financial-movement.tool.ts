import { z } from 'zod';
import { FinancialMovementService } from '../../services/financial-movement.service';

export const recordFinancialMovementInputSchema = z.object({ userId: z.string().uuid(), goalId: z.string().uuid().optional(), type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'EXPENSE', 'INCOME']), amount: z.number().positive(), category: z.string().max(80).optional(), note: z.string().max(240).optional(), occurredAt: z.string().optional(), confirm: z.boolean().optional() });
export const createRecordFinancialMovementTool = (service: FinancialMovementService) => async (input: z.infer<typeof recordFinancialMovementInputSchema>) => service.create(input);
