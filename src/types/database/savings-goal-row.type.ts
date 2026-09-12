export type SavingsGoalStatus =
| 'ACTIVE'
| 'COMPLETED'
| 'CANCELLED';

export interface SavingsGoal {
  id: string;
  user_id: string;
  life_event_d: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number | null;
  target_date: Date | null;
  status: SavingsGoalStatus;
  created_at: Date;
  updated_at: Date;
}