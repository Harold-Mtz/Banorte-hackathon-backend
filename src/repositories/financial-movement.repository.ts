import { pool } from '../config/database';
import { CreateFinancialMovementDTO } from '../dtos/create-financial-movement.dto';
import { FinancialMovement } from '../models/financial-movement.model';

export class FinancialMovementRepository {
  async create(data: CreateFinancialMovementDTO): Promise<FinancialMovement> {
    const result = await pool.query(`
      INSERT INTO financial_movements (user_id, goal_id, type, amount, category, note, occurred_at)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()))
      RETURNING *`, [data.userId, data.goalId ?? null, data.type, data.amount, data.category ?? null, data.note ?? null, data.occurredAt ?? null]);
    return this.mapRow(result.rows[0]);
  }

  async findByUserId(userId: string, limit = 20): Promise<FinancialMovement[]> {
    const result = await pool.query(`SELECT * FROM financial_movements WHERE user_id = $1 ORDER BY occurred_at DESC, created_at DESC LIMIT $2`, [userId, limit]);
    return result.rows.map((row) => this.mapRow(row));
  }

  async getTotals(userId: string): Promise<{ deposits: number; withdrawals: number; expenses: number; income: number }> {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0) AS deposits,
        COALESCE(SUM(amount) FILTER (WHERE type = 'WITHDRAWAL'), 0) AS withdrawals,
        COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS expenses,
        COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0) AS income
      FROM financial_movements WHERE user_id = $1`, [userId]);
    const row = result.rows[0];
    return { deposits: Number(row.deposits), withdrawals: Number(row.withdrawals), expenses: Number(row.expenses), income: Number(row.income) };
  }

  private mapRow(row: any): FinancialMovement {
    return { id: row.id, userId: row.user_id, goalId: row.goal_id, type: row.type, amount: Number(row.amount), category: row.category, note: row.note, occurredAt: row.occurred_at, createdAt: row.created_at };
  }
}
