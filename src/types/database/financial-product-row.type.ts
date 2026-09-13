import { FinancialProductType } from "../../models/financial-product.model";

export interface FinancialProductRow {
  id: string;
  name: string;
  type: FinancialProductType;
  description: string | null;

  interest_rate: string | number | null;
  cat: string | number | null;

  minimum_amount: string | number | null;
  maximum_amount: string | number | null;

  minimum_term_months: number | null;
  maximum_term_months: number | null;

  is_active: boolean;

  metadata: Record<string, unknown>;

  created_at: Date;
  updated_at: Date;
}