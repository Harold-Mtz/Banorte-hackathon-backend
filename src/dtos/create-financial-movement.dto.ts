import { FinancialMovementType } from '../models/financial-movement.model';

export interface CreateFinancialMovementDTO {
  userId: string;
  goalId?: string;
  type: FinancialMovementType;
  amount: number;
  category?: string;
  note?: string;
  occurredAt?: string;
  confirm?: boolean;
}
