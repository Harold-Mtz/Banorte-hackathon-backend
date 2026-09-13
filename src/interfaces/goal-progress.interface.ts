export type GoalProgressStatus =
  | "COMPLETED"
  | "AHEAD"
  | "ON_TRACK"
  | "BEHIND"
  | "NO_PLAN";

export interface GoalProgress {
  userId: string;

  goalId: string;
  name: string;

  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;

  progressPercentage: number;

  monthlyContribution: number | null;
  requiredMonthlyContribution: number | null;

  targetDate: string | null;
  monthsRemaining: number | null;

  status: GoalProgressStatus;
}
