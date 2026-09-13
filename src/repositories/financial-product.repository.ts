import { pool } from "../config/database";
import { FinancialProduct, FinancialProductType } from "../models/financial-product.model";
import { FinancialProductRow } from "../types/database/financial-product-row.type";

// Esta función convierte una fila "cruda" de Postgres (snake_case, strings)en un objeto "modelo" limpio (camelCase, numbers) que el resto de tu app usa.
function mapFinancialProduct(
  row: FinancialProductRow,
): FinancialProduct {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    interestRate:
      row.interest_rate === null
        ? null
        : Number(row.interest_rate),
    cat:
      row.cat === null
        ? null
        : Number(row.cat),
    minimumAmount:
      row.minimum_amount === null
        ? null
        : Number(row.minimum_amount),
    maximumAmount:
      row.maximum_amount === null
        ? null
        : Number(row.maximum_amount),
    minimumTermMonths:
      row.minimum_term_months,
    maximumTermMonths:
      row.maximum_term_months,
    isActive: row.is_active,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class FinancialProductRepository {
  async findAll(): Promise<FinancialProduct[]> {
    const result = await pool.query<FinancialProductRow>(
      `SELECT * FROM financial_products ORDER BY created_at DESC`,
    );
    // .map aplica mapFinancialProduct a cada fila del resultado
    return result.rows.map(mapFinancialProduct);
  }

  async findByType(
  type: FinancialProductType,
): Promise<FinancialProduct[]> {
  const result = await pool.query<FinancialProductRow>(
    `
    SELECT *
    FROM financial_products
    WHERE type = $1
      AND is_active = TRUE
    ORDER BY created_at DESC
    `,
    [type],
  );

  return result.rows.map(mapFinancialProduct);
}

  async findById(id: string): Promise<FinancialProduct | null> {
    const result = await pool.query<FinancialProductRow>(
      `SELECT * FROM financial_products WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return null;
    return mapFinancialProduct(result.rows[0]);
  }
}
