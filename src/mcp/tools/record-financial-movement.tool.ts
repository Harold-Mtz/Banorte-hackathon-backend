import { z } from 'zod';
import { FinancialMovementService } from '../../services/financial-movement.service';
import { movementSchema } from '../../domain/validation';
export const recordFinancialMovementInputSchema = movementSchema;
export const createRecordFinancialMovementTool = (service: FinancialMovementService) => async (input: z.infer<typeof movementSchema>) => service.create(movementSchema.parse(input));
