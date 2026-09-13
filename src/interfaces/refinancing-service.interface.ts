export interface AnalyzeRefinancingInput {
  currentBalance: number;
  currentAnnualRate: number;
  remainingTermMonths: number;

  newAnnualRate: number;
  newTermMonths: number;

  refinancingFees: number;
}

export interface RefinancingResult {
  recommended: boolean;

  currentMonthlyPayment: number;
  newMonthlyPayment: number;

  monthlySavings: number;

  currentTotalRemainingPayment: number;
  newTotalPayment: number;

  grossSavings: number;
  refinancingFees: number;
  netSavings: number;

  breakEvenMonths: number | null;
}

export interface IRefinancingService {
  analyze(data: AnalyzeRefinancingInput): Promise<RefinancingResult>;
}
