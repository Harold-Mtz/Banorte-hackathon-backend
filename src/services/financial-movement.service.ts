import { CreateFinancialMovementDTO } from '../dtos/create-financial-movement.dto';
import { FinancialMovementRepository } from '../repositories/financial-movement.repository';
import { FinancialService } from './financial.service';
import { SavingsGoalService } from './savings-goal.service';
import { movementSchema } from '../domain/validation';
import { withUserTransaction } from '../config/database';

const round = (value: number) => Math.round(value * 100) / 100;
export class FinancialMovementService {
  constructor(private readonly repository: FinancialMovementRepository, private readonly financialService: FinancialService, private readonly savingsGoalService: SavingsGoalService) {}

  async create(input: CreateFinancialMovementDTO) {
    const data = movementSchema.parse(input);
    return withUserTransaction(data.userId, async () => {
      const dashboard = await this.getDashboard(data.userId);
      const goal = data.goalId ? dashboard.goals.find(item => item.id === data.goalId) : undefined;
      if (data.goalId && !goal) throw new Error('SAVINGS_GOAL_NOT_FOUND');
      if (goal && !['ACTIVE', 'COMPLETED'].includes(goal.status)) throw new Error('GOAL_NOT_ACTIVE');
      if (data.goalId && !['DEPOSIT', 'WITHDRAWAL'].includes(data.type)) throw new Error('INVALID_GOAL_MOVEMENT');
      if (data.type === 'WITHDRAWAL' && (data.amount > dashboard.currentSavings || (goal && data.amount > goal.currentAmount))) throw new Error('INSUFFICIENT_SAVINGS');
      const currentAvailable = dashboard.availableMonthlyCash;
      const period = (value: Date) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'America/Mexico_City' }).format(value);
      const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
      if (occurredAt.getTime() > Date.now() + 60000) throw new Error('FUTURE_MOVEMENT');
      const inCurrentPeriod = period(occurredAt) === period(new Date());
      const outflow = data.type === 'EXPENSE' || data.type === 'WITHDRAWAL';
      const projectedAvailable = round(currentAvailable + (inCurrentPeriod ? outflow ? -data.amount : data.type === 'INCOME' ? data.amount : 0 : 0));
      const expenseRatio = dashboard.monthlyExpenses > 0 ? data.amount / dashboard.monthlyExpenses : null;
      const activeGoals = dashboard.goals.filter(item => item.status === 'ACTIVE' || item.id === data.goalId);
      const planned = activeGoals.reduce((sum, item) => sum + (item.monthlyContribution ?? 0), 0);
      // This month's additional shortfall, rather than treating a one-off expense as recurring.
      const incrementalShortfall = outflow ? Math.max(0, planned - Math.max(0, projectedAvailable)) - Math.max(0, planned - Math.max(0, currentAvailable)) : 0;
      const goalImpacts = activeGoals.map(item => {
        const contribution = item.monthlyContribution ?? 0;
        const balanceReduction = data.type === 'WITHDRAWAL' && item.id === data.goalId ? data.amount : 0;
        const missed = planned > 0 ? incrementalShortfall * contribution / planned : 0;
        const affected = Math.max(balanceReduction, missed);
        const delayMonths = contribution > 0 ? Math.ceil(affected / contribution) : null;
        return { goalId: item.id, name: item.name, delayMonths, affectedAmount: round(affected), targetDate: item.targetDate, estimated: true };
      }).filter(item => item.affectedAmount > 0);
      const warnings = [
        outflow && projectedAvailable < 0 ? 'El disponible estimado quedaría en negativo.' : '',
        outflow && expenseRatio !== null && expenseRatio > 0.25 ? 'El movimiento supera el 25% del gasto mensual.' : '',
        goalImpacts.length ? 'Podría retrasar tus metas; revisa la estimación de cada plan.' : ''
      ].filter(Boolean);
      const impact = { goalName: goal?.name ?? null, currentAvailable, projectedAvailable, projectedSavings: round(dashboard.currentSavings + (data.type === 'DEPOSIT' ? data.amount : data.type === 'WITHDRAWAL' ? -data.amount : 0)), expenseRatio, warning: warnings.join(' ') || null, goalImpacts, estimated: true };
      if (!data.confirm) return { movement: null, impact, requiresConfirmation: true };
      const movement = await this.repository.create(data);
      return { movement, impact, requiresConfirmation: false };
    });
  }

  async getByUser(userId: string, limit = 20) { return this.repository.findByUserId(userId, limit); }

  async getDashboard(userId: string) {
    const profile = await this.financialService.getProfile(userId);
    if (!profile) throw new Error('FINANCIAL_PROFILE_NOT_FOUND');
    const totals = await this.repository.getTotals(userId);
    const goals = await this.savingsGoalService.getByUser(userId);
    const movements = await this.repository.findByUserId(userId, 12);
    const monthlyExpenses = round(profile.monthlyExpenses + totals.expenses);
    const monthlyIncome = round(profile.monthlyIncome + totals.income);
    const availableMonthlyCash = round(monthlyIncome - monthlyExpenses - profile.currentDebt - totals.monthlyWithdrawals);
    return { monthlyIncome, monthlyExpenses, monthlyDebtPayments: profile.currentDebt, currentSavings: round(profile.currentSavings + totals.deposits - totals.withdrawals), availableMonthlyCash, creditScore: profile.creditScore, period: new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' }).format(new Date()), totals, goals: goals.map(goal => {
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const planned = goals.filter(item => item.status === 'ACTIVE').reduce((sum, item) => sum + (item.monthlyContribution ?? 0), 0);
      const fundedThisMonth = (goal.monthlyContribution ?? 0) * (planned > 0 ? Math.min(1, Math.max(0, availableMonthlyCash) / planned) : 1);
      const monthsRemaining = remaining === 0 ? 0 : goal.monthlyContribution ? 1 + Math.ceil(Math.max(0, remaining - fundedThisMonth) / goal.monthlyContribution) : null;
      const estimatedDate = monthsRemaining === null ? null : new Date(new Date().setUTCMonth(new Date().getUTCMonth() + monthsRemaining)).toISOString().slice(0, 10);
      return { ...goal, progress: round(Math.min(100, goal.currentAmount / goal.targetAmount * 100)), monthsRemaining, estimatedDate, delayed: !!(estimatedDate && goal.targetDate && new Date(estimatedDate) > new Date(goal.targetDate)), estimated: true };
    }), movements };
  }
}
