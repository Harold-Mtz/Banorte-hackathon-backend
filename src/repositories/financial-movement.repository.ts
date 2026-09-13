import { pool } from '../config/database';
import { CreateFinancialMovementDTO } from '../dtos/create-financial-movement.dto';
import { FinancialMovement } from '../models/financial-movement.model';

export class FinancialMovementRepository {
  async create(data: CreateFinancialMovementDTO): Promise<FinancialMovement> {
    if (data.goalId) {
      const goal = await pool.query('SELECT id, current_amount, status FROM savings_goals WHERE id = $1 AND user_id = $2 FOR UPDATE', [data.goalId, data.userId]);
      if (!goal.rows[0]) throw new Error('SAVINGS_GOAL_NOT_FOUND');
      if (!['ACTIVE', 'COMPLETED'].includes(goal.rows[0].status)) throw new Error('GOAL_NOT_ACTIVE');
      if (data.type === 'WITHDRAWAL' && Number(goal.rows[0].current_amount) < data.amount) throw new Error('INSUFFICIENT_GOAL_SAVINGS');
    }
    const result = await pool.query(`
      INSERT INTO financial_movements (user_id, goal_id, type, amount, category, note, occurred_at)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()))
      RETURNING *`, [data.userId, data.goalId ?? null, data.type, data.amount, data.category ?? null, data.note ?? null, data.occurredAt ?? null]);
    if (data.goalId && ['DEPOSIT', 'WITHDRAWAL'].includes(data.type)) {
      const delta = data.type === 'DEPOSIT' ? data.amount : -data.amount;
      await pool.query(`UPDATE savings_goals SET current_amount = current_amount + $1,
        status = CASE WHEN current_amount + $1 >= target_amount THEN 'COMPLETED' ELSE 'ACTIVE' END,
        updated_at = NOW() WHERE id = $2 AND user_id = $3`, [delta, data.goalId, data.userId]);
    }
    return this.mapRow(result.rows[0]);
  }

  async findByUserId(userId: string, limit = 20): Promise<FinancialMovement[]> {
    const result = await pool.query(`SELECT * FROM financial_movements WHERE user_id = $1 ORDER BY occurred_at DESC, created_at DESC LIMIT $2`, [userId, limit]);
    return result.rows.map((row) => this.mapRow(row));
  }

  async getTotals(userId: string) {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0) AS deposits,
        COALESCE(SUM(amount) FILTER (WHERE type = 'WITHDRAWAL'), 0) AS withdrawals,
        COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND date_trunc('month', occurred_at AT TIME ZONE 'America/Mexico_City') = date_trunc('month', NOW() AT TIME ZONE 'America/Mexico_City')), 0) AS expenses,
        COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND date_trunc('month', occurred_at AT TIME ZONE 'America/Mexico_City') = date_trunc('month', NOW() AT TIME ZONE 'America/Mexico_City')), 0) AS income,
        COALESCE(SUM(amount) FILTER (WHERE type = 'WITHDRAWAL' AND date_trunc('month', occurred_at AT TIME ZONE 'America/Mexico_City') = date_trunc('month', NOW() AT TIME ZONE 'America/Mexico_City')), 0) AS monthly_withdrawals
      FROM financial_movements WHERE user_id = $1`, [userId]);
    const row = result.rows[0];
    return { deposits: Number(row.deposits), withdrawals: Number(row.withdrawals), expenses: Number(row.expenses), income: Number(row.income), monthlyWithdrawals: Number(row.monthly_withdrawals) };
  }

  private mapRow(row: any): FinancialMovement {
    return { id: row.id, userId: row.user_id, goalId: row.goal_id, type: row.type, amount: Number(row.amount), category: row.category, note: row.note, occurredAt: row.occurred_at, createdAt: row.created_at };
  }
}
