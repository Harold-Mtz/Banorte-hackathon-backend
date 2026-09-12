import { pool } from '../config/database';
import { FinancialProfile } from '../models/financial-profile.model';
import { UpdateFinancialProfileDTO } from '../dtos/update-financial-profile.dto';

export class FinancialProfileRepository {
  async findByUserId(
    userId: string
  ): Promise<FinancialProfile | null> {
    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        monthly_income,
        monthly_expenses,
        current_savings,
        current_debt,
        credit_score,
        created_at,
        updated_at
      FROM financial_profiles
      WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      monthlyIncome: Number(row.monthly_income),
      monthlyExpenses: Number(row.monthly_expenses),
      currentSavings: Number(row.current_savings),
      currentDebt: Number(row.current_debt),
      creditScore: row.credit_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async updateByUserId(
    userId: string,
    data: UpdateFinancialProfileDTO
  ): Promise<FinancialProfile | null> {
    const result = await pool.query(
      `
      UPDATE financial_profiles
      SET
        monthly_income = COALESCE($2, monthly_income),
        monthly_expenses = COALESCE($3, monthly_expenses),
        current_savings = COALESCE($4, current_savings),
        current_debt = COALESCE($5, current_debt),
        credit_score = COALESCE($6, credit_score),
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        id,
        user_id,
        monthly_income,
        monthly_expenses,
        current_savings,
        current_debt,
        credit_score,
        created_at,
        updated_at
      `,
      [
        userId,
        data.monthlyIncome ?? null,
        data.monthlyExpenses ?? null,
        data.currentSavings ?? null,
        data.currentDebt ?? null,
        data.creditScore ?? null
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      monthlyIncome: Number(row.monthly_income),
      monthlyExpenses: Number(row.monthly_expenses),
      currentSavings: Number(row.current_savings),
      currentDebt: Number(row.current_debt),
      creditScore: row.credit_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}