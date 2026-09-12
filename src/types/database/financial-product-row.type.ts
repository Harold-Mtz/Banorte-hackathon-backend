export type FinancialProductType = 
| 'MORTAGE'
| 'AUTO_LOAN'
| 'PERSONAL_LOAN'
| 'SAVINGS'
| 'INVESTMENT';

export interface FinancialProduct {
    id: string;
    name: string;
    type: FinancialProductType;
    description: string | null;
    interest_rate: number | null;
    cat: number;
    minimum_amount: number | null;
    maximum_amount: number | null;
    minimum_term_months: number | null;
    maximum_term_months: number | null;
    is_active: boolean;
    metadata: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}