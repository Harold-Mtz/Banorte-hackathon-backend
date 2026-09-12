import { pool } from '../config/database';
import { SavingsGoal } from '../models/savings-goal.model';
import { CreateSavingsGoalDTO } from '../dtos/create-savings-goal.dto';

export class SavingsGoalRepository {

  async create(data: CreateSavingsGoalDTO): Promise<SavingsGoal> {
    const result = await pool.query(
      `
      INSERT INTO savings_goals (user_id, life_event_id, name, target_amount, current_amount, monthly_contribution, target_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.userId,
        data.lifeEventId ?? null,
        data.name,
        data.targetAmount,
        data.currentAmount ?? 0,
        data.monthlyContribution ?? null,
        data.targetDate ?? null
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<SavingsGoal | null> {
    const result = await pool.query(
      `SELECT * FROM savings_goals WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async findByUserId(userId: string): Promise<SavingsGoal[]> {
    const result = await pool.query(
      `SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  async updateCurrentAmount(
    id: string,
    currentAmount: number
  ): Promise<SavingsGoal | null> {
    const result = await pool.query(
      `UPDATE savings_goals SET current_amount = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [currentAmount, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: any): SavingsGoal {
    return {
      id: row.id,
      userId: row.user_id,
      lifeEventId: row.life_event_id,
      name: row.name,
      targetAmount: Number(row.target_amount),
      currentAmount: Number(row.current_amount),
      monthlyContribution:
        row.monthly_contribution !== null
          ? Number(row.monthly_contribution)
          : null,
      targetDate: row.target_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}