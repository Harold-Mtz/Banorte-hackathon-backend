import { SavingsGoal } from '../models/savings-goal.model';
import { CreateSavingsGoalDTO } from '../dtos/create-savings-goal.dto';

export interface ISavingsGoalService {

  create(
    data: CreateSavingsGoalDTO
  ): Promise<SavingsGoal>;

  getById(
    id: string
  ): Promise<SavingsGoal | null>;

  getByUser(
    userId: string
  ): Promise<SavingsGoal[]>;

  updateCurrentAmount(
    id: string,
    currentAmount: number
  ): Promise<SavingsGoal | null>;

  calculateProgress(
    goalId: string
  ): Promise<number>;
}