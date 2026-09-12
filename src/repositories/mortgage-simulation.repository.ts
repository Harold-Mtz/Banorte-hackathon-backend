import { pool } from "../config/database";
import { MortgageSimulation } from "../models/mortgage-simulation.model";
import { MortgageSimulationRow } from "../types/database/mortgage-simulation-row.type";

function mapMortgageSimulation(row: MortgageSimulationRow): MortgageSimulation {
  return {
    id: row.id,
    userId: row.user_id,
    lifeEventId: row.life_event_id,
    financialProductId: row.financial_product_id,
    propertyValue: Number(row.property_value),
    downPayment: Number(row.down_payment),
    loanAmount: Number(row.loan_amount),
    termMonths: row.term_months,
    annualInterestRate: Number(row.annual_interest_rate),
    monthlyPayment: Number(row.monthly_payment),
    totalPayment: Number(row.total_payment),
    totalInterest: Number(row.total_interest),
    createdAt: row.created_at,
  };
}

interface MortgageSimulationInsert {
  userId: string;
  lifeEventId?: string | null;
  financialProductId?: string | null;
  propertyValue: number;
  downPayment: number;
  loanAmount: number;
  termMonths: number;
  annualInterestRate: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
}

export class MortgageSimulationRepository {
  async create(data: MortgageSimulationInsert): Promise<MortgageSimulation> {
    const result = await pool.query<MortgageSimulationRow>(
      `INSERT INTO mortgage_simulations
        (user_id, life_event_id, financial_product_id, property_value,
         down_payment, loan_amount, term_months, annual_interest_rate,
         monthly_payment, total_payment, total_interest)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.userId,
        data.lifeEventId ?? null,
        data.financialProductId ?? null,
        data.propertyValue,
        data.downPayment,
        data.loanAmount,
        data.termMonths,
        data.annualInterestRate,
        data.monthlyPayment,
        data.totalPayment,
        data.totalInterest,
      ],
    );

    return mapMortgageSimulation(result.rows[0]);
  }

  async findByUserId(userId: string): Promise<MortgageSimulation[]> {
    const result = await pool.query<MortgageSimulationRow>(
      `SELECT * FROM mortgage_simulations WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map(mapMortgageSimulation);
  }
}
