export type SavingsGoalStatus =
| 'ACTIVE'
| 'COMPLETED'
| 'CANCELLED';

export interface SavingsGoal {
  id: string;
  userId: string;
  lifeEventId: string | null;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number | null;
  targetDate: Date | null;
  status: SavingsGoalStatus;
  createdAt: Date;
  updatedAt: Date;
}