export interface CreateSavingsGoalDTO {
  userId: string;
  lifeEventId?: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  monthlyContribution?: number;
  targetDate?: string;
}