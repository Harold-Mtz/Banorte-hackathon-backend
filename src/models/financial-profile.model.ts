export interface FinancialProfile {
    id: string;
    userId: string;
    monthlyIncome: number;
    monthlyExpenses: number;
    currentSavings: number;
    currentDebt: number;
    creditScore: number | null;
    createdAt: Date;
    updatedAt: Date;
}