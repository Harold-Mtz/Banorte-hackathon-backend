export type SavingsGoalStatus =
| 'ACTIVE'
| 'COMPLETED'
| 'PAUSED'
| 'ARCHIVED'
| 'DELETED'
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
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
