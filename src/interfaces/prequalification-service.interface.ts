export interface PrequalificationInput {
  userId: string;
  requestedAmount: number;
  annualInterestRate: number;
  termMonths: number;
}

export type CreditRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PrequalificationResult {
    qualified: boolean;
    requestedAmount: number;
    maximumEstimatedAmount: number;
    annualInterestRate: number;
    termMonths: number;
    estimatedMonthlyPayment: number;
    maximumRecommendedMonthlyPayment: number;
    paymentToIncomeRatio: number;
    riskLevel: CreditRiskLevel;
    reasons: string[];
    disclaimer: string;

}

    export interface IPrequalificationService {
        prequalify(data: PrequalificationInput): Promise<PrequalificationResult>;
    }