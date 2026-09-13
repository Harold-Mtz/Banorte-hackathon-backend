import { CreateFinancialMovementDTO } from '../dtos/create-financial-movement.dto';
import { FinancialMovement } from '../models/financial-movement.model';

export interface IFinancialMovementService {
  create(data: CreateFinancialMovementDTO): Promise<{ movement: FinancialMovement; impact: Record<string, unknown> }>;
  getByUser(userId: string, limit?: number): Promise<FinancialMovement[]>;
  getDashboard(userId: string): Promise<Record<string, unknown>>;
}
