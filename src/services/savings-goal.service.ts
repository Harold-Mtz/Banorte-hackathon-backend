import { ISavingsGoalService } from '../interfaces/savings-goal.interface';
import { SavingsGoalRepository } from '../repositories/savings-goal.repository';
import { CreateSavingsGoalDTO } from '../dtos/create-savings-goal.dto';
import { SavingsGoal } from '../models/savings-goal.model';

export class SavingsGoalService implements ISavingsGoalService {

  constructor(
    private readonly repository: SavingsGoalRepository
  ) {}

  async create(
    data: CreateSavingsGoalDTO
  ): Promise<SavingsGoal> {

    if (data.targetAmount <= 0) {
      throw new Error('Target amount must be greater than zero');
    }

    if (
      data.currentAmount !== undefined &&
      data.currentAmount < 0
    ) {
      throw new Error('Current amount cannot be negative');
    }

    return this.repository.create(data);
  }

  async getById(
    id: string
  ): Promise<SavingsGoal | null> {
    return this.repository.findById(id);
  }

  async getByUser(
    userId: string
  ): Promise<SavingsGoal[]> {
    return this.repository.findByUserId(userId);
  }

  async updateCurrentAmount(
    id: string,
    currentAmount: number
  ): Promise<SavingsGoal | null> {

    if (currentAmount < 0) {
      throw new Error('Current amount cannot be negative');
    }

    return this.repository.updateCurrentAmount(
      id,
      currentAmount
    );
  }

  async calculateProgress(
    goalId: string
  ): Promise<number> {

    const goal = await this.repository.findById(goalId);

    if (!goal) {
      throw new Error('Savings goal not found');
    }

    if (goal.targetAmount <= 0) {
      return 0;
    }

    const progress =
      (goal.currentAmount / goal.targetAmount) * 100;

    return Math.min(
      Math.round(progress * 100) / 100,
      100
    );
  }
}