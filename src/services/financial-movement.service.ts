import { CreateFinancialMovementDTO } from '../dtos/create-financial-movement.dto';
import { FinancialMovementRepository } from '../repositories/financial-movement.repository';
import { FinancialMovement } from '../models/financial-movement.model';
import { FinancialService } from './financial.service';
import { SavingsGoalService } from './savings-goal.service';

export class FinancialMovementService {
  constructor(private readonly repository: FinancialMovementRepository, private readonly financialService: FinancialService, private readonly savingsGoalService: SavingsGoalService) {}

  async create(data: CreateFinancialMovementDTO): Promise<{ movement: FinancialMovement; impact: Record<string, unknown> }> {
    if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error('AMOUNT_MUST_BE_POSITIVE');
    if (!['DEPOSIT', 'WITHDRAWAL', 'EXPENSE', 'INCOME'].includes(data.type)) throw new Error('INVALID_MOVEMENT_TYPE');
    const profile = await this.financialService.getProfile(data.userId);
    if (!profile) throw new Error('FINANCIAL_PROFILE_NOT_FOUND');
    const dashboard = await this.getDashboard(data.userId);
    const currentAvailable = Number(dashboard.availableMonthlyCash);
    const isOutflow = data.type === 'WITHDRAWAL' || data.type === 'EXPENSE';
    const projectedAvailable = currentAvailable + (isOutflow ? -data.amount : data.amount);
    const warning = isOutflow && projectedAvailable < 0 ? 'Este movimiento dejaría tu flujo mensual en negativo.' : isOutflow && data.amount > Number(dashboard.monthlyExpenses) * 0.25 ? 'Este movimiento es mayor al 25% de tus gastos mensuales y puede retrasar tus metas.' : null;
    if (warning && !data.confirm) return { movement: null as unknown as FinancialMovement, impact: { currentAvailable, projectedAvailable, warning, goalId: data.goalId ?? null } };
    const movement = await this.repository.create(data);
    if (data.goalId && data.type === 'DEPOSIT') {
      const goals = await this.savingsGoalService.getByUser(data.userId);
      const goal = goals.find((item) => item.id === data.goalId);
      if (!goal) throw new Error('SAVINGS_GOAL_NOT_FOUND');
      await this.savingsGoalService.updateCurrentAmount(goal.id, goal.currentAmount + data.amount);
    }
    return { movement, impact: { currentAvailable, projectedAvailable, warning, goalId: data.goalId ?? null } };
  }

  async getByUser(userId: string, limit = 20) { return this.repository.findByUserId(userId, limit); }

  async getDashboard(userId: string): Promise<Record<string, unknown>> {
    const profile = await this.financialService.getProfile(userId);
    if (!profile) throw new Error('FINANCIAL_PROFILE_NOT_FOUND');
    const totals = await this.repository.getTotals(userId);
    const goals = await this.savingsGoalService.getByUser(userId);
    const movements = await this.repository.findByUserId(userId, 8);
    const monthlyExpenses = profile.monthlyExpenses + totals.expenses;
    const monthlyIncome = profile.monthlyIncome + totals.income;
    const availableMonthlyCash = monthlyIncome - monthlyExpenses - profile.currentDebt;
    return { monthlyIncome, monthlyExpenses, monthlyDebtPayments: profile.currentDebt, currentSavings: profile.currentSavings + totals.deposits - totals.withdrawals, availableMonthlyCash, creditScore: profile.creditScore, totals, goals, movements };
  }
}
