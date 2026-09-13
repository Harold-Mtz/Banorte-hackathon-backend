export type FinancialProductType =
| "MORTGAGE"
| "AUTO_LOAN"
| "PERSONAL_LOAN"
| "SAVINGS"
| "INVESTMENT";

export interface FinancialProduct {
  id: string;
  name: string;
  type: FinancialProductType;
  description: string | null;
  interestRate: number | null;
  cat: number | null;
  minimumAmount: number | null;
  maximumAmount: number | null;
  minimumTermMonths: number | null;
  maximumTermMonths: number | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}