export type FinancialMovementType = 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE' | 'INCOME';

export interface FinancialMovement {
  id: string;
  userId: string;
  goalId: string | null;
  type: FinancialMovementType;
  amount: number;
  category: string | null;
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
}
