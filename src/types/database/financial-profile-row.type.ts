export interface FinancialProfile {
    id: string;
    user_id: string;
    monthly_income: number;
    monthly_expenses: number;
    current_savings: number;
    current_debt: number;
    credit_score: number | null;
    created_at: Date;
    updated_at: Date;
}