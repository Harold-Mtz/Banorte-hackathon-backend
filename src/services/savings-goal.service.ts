import { ISavingsGoalService } from "../interfaces/savings-goal.interface";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository";
import { CreateSavingsGoalDTO } from "../dtos/create-savings-goal.dto";
import { SavingsGoal } from "../models/savings-goal.model";
import {
  GoalProgress,
  GoalProgressStatus,
} from "../interfaces/goal-progress.interface";

export class SavingsGoalService implements ISavingsGoalService {
  constructor(private readonly repository: SavingsGoalRepository) {}

  async create(data: CreateSavingsGoalDTO): Promise<SavingsGoal> {
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

  async getProgress(goalId: string): Promise<GoalProgress> {
    const goal = await this.repository.findById(goalId);

    if (!goal) {
      throw new Error("Savings goal not found");
    }

    const targetAmount = Number(goal.targetAmount);

    const currentAmount = Number(goal.currentAmount);

    const remainingAmount = Math.max(targetAmount - currentAmount, 0);

    const progressPercentage =
      targetAmount > 0
        ? Math.min((currentAmount / targetAmount) * 100, 100)
        : 0;

    if (currentAmount >= targetAmount) {
      return {
        userId: goal.userId,
        goalId: goal.id,
        name: goal.name,
        targetAmount,
        currentAmount,
        remainingAmount: 0,
        progressPercentage: 100,
        monthlyContribution: goal.monthlyContribution,
        requiredMonthlyContribution: 0,
        targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
        monthsRemaining: 0,
        status: "COMPLETED",
      };
    }

    if (!goal.targetDate) {
      return {
        userId: goal.userId,
        goalId: goal.id,
        name: goal.name,
        targetAmount,
        currentAmount,
        remainingAmount,
        progressPercentage: Number(progressPercentage.toFixed(2)),
        monthlyContribution: goal.monthlyContribution,
        requiredMonthlyContribution: null,
        targetDate: null,
        monthsRemaining: null,
        status: "NO_PLAN",
      };
    }

    const now = new Date();
    const targetDate = new Date(goal.targetDate);

    const millisecondsPerMonth = 1000 * 60 * 60 * 24 * 30.44;

    const monthsRemaining = Math.max(
      Math.ceil((targetDate.getTime() - now.getTime()) / millisecondsPerMonth),
      1,
    );

    const requiredMonthlyContribution = remainingAmount / monthsRemaining;

    let status: "AHEAD" | "ON_TRACK" | "BEHIND" | "NO_PLAN";

    if (goal.monthlyContribution === null) {
      status = "NO_PLAN";
    } else {
      const planned = Number(goal.monthlyContribution);

      if (planned > requiredMonthlyContribution * 1.1) {
        status = "AHEAD";
      } else if (planned >= requiredMonthlyContribution * 0.9) {
        status = "ON_TRACK";
      } else {
        status = "BEHIND";
      }
    }

    return {
      userId: goal.userId,
      goalId: goal.id,
      name: goal.name,
      targetAmount,
      currentAmount,
      remainingAmount,
      progressPercentage: Number(progressPercentage.toFixed(2)),
      monthlyContribution: goal.monthlyContribution,
      requiredMonthlyContribution: Number(
        requiredMonthlyContribution.toFixed(2),
      ),
      targetDate: targetDate.toISOString(),
      monthsRemaining,
      status,
    };
  }
}
