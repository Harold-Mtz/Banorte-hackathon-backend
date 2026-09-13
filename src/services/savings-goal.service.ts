import { ISavingsGoalService } from "../interfaces/savings-goal.interface";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository";
import { CreateSavingsGoalDTO } from "../dtos/create-savings-goal.dto";
import { SavingsGoal } from "../models/savings-goal.model";
import { goalPlanSchema } from '../domain/validation';
import { withUserTransaction } from '../config/database';
import { LifeEventRepository } from '../repositories/life-event.repository';

export class SavingsGoalService implements ISavingsGoalService {
  constructor(private readonly repository: SavingsGoalRepository) {}

  async create(data: CreateSavingsGoalDTO): Promise<SavingsGoal> {
    goalPlanSchema.parse(data);
    if (data.lifeEventId) {
      const event = await new LifeEventRepository().findById(data.lifeEventId);
      if (!event || event.userId !== data.userId) throw new Error('LIFE_EVENT_NOT_FOUND');
    }
    if (data.currentAmount && data.currentAmount !== 0) throw new Error('INITIAL_AMOUNT_REQUIRES_MOVEMENT');
    if (data.targetAmount <= 0) {
      throw new Error("Target amount must be greater than zero");
    }

    if (data.currentAmount !== undefined && data.currentAmount < 0) {
      throw new Error("Current amount cannot be negative");
    }

    return this.repository.create(data);
  }

  async getById(id: string): Promise<SavingsGoal | null> {
    return this.repository.findById(id);
  }

  async getOwned(userId: string, id: string): Promise<SavingsGoal> {
    const goal = await this.getById(id);
    if (!goal || goal.userId !== userId || goal.status === 'DELETED') throw new Error('SAVINGS_GOAL_NOT_FOUND');
    return goal;
  }

  async getByUser(userId: string): Promise<SavingsGoal[]> {
    return this.repository.findByUserId(userId);
  }

  async updateCurrentAmount(
    id: string,
    currentAmount: number,
  ): Promise<SavingsGoal | null> {
    if (currentAmount < 0) {
      throw new Error("Current amount cannot be negative");
    }

    return this.repository.updateCurrentAmount(id, currentAmount);
  }

  async calculateProgress(goalId: string): Promise<number> {
    const goal = await this.repository.findById(goalId);

    if (!goal) {
      throw new Error("Savings goal not found");
    }

    if (goal.targetAmount <= 0) {
      return 0;
    }

    const progress = (goal.currentAmount / goal.targetAmount) * 100;

    return Math.min(Math.round(progress * 100) / 100, 100);
  }

  async updateOwned(userId: string, id: string, data: { name?: string; targetAmount?: number; monthlyContribution?: number; targetDate?: string; status?: string; metadata?: Record<string, unknown> }) {
    return withUserTransaction(userId, async () => {
      const goal = await this.getById(id);
      if (!goal || goal.userId !== userId || goal.status === 'DELETED') throw new Error('SAVINGS_GOAL_NOT_FOUND');
      goalPlanSchema.partial().parse(data);
      if (data.status && !['ACTIVE', 'PAUSED', 'CANCELLED', 'ARCHIVED', 'DELETED'].includes(data.status)) throw new Error('INVALID_GOAL_STATUS');
      if (data.status === 'DELETED' && goal.currentAmount > 0) throw new Error('WITHDRAW_BEFORE_DELETE');
      return this.repository.updateOwned(userId, id, data);
    });
  }
}
