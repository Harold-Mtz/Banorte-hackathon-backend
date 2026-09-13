import {
  AnalyzeRefinancingInput,
  IRefinancingService,
  RefinancingResult,
} from "../interfaces/refinancing-service.interface";

export class RefinancingService implements IRefinancingService {
  async analyze(data: AnalyzeRefinancingInput): Promise<RefinancingResult> {
    const {
      currentBalance,
      currentAnnualRate,
      remainingTermMonths,
      newAnnualRate,
      newTermMonths,
      refinancingFees,
    } = data;

    if (currentBalance <= 0) {
      throw new Error("Current balance must be greater than zero");
    }

    if (currentAnnualRate < 0 || newAnnualRate < 0) {
      throw new Error("Interest rates cannot be negative");
    }

    if (remainingTermMonths <= 0 || newTermMonths <= 0) {
      throw new Error("Terms must be greater than zero");
    }

    if (refinancingFees < 0) {
      throw new Error("Refinancing fees cannot be negative");
    }

    const currentMonthlyPayment = this.calculateMonthlyPayment(
      currentBalance,
      currentAnnualRate,
      remainingTermMonths,
    );

    const newMonthlyPayment = this.calculateMonthlyPayment(
      currentBalance,
      newAnnualRate,
      newTermMonths,
    );

    const currentTotalRemainingPayment = this.roundMoney(
      currentMonthlyPayment * remainingTermMonths,
    );

    const newTotalPayment = this.roundMoney(newMonthlyPayment * newTermMonths);

    const monthlySavings = this.roundMoney(
      currentMonthlyPayment - newMonthlyPayment,
    );

    const grossSavings = this.roundMoney(
      currentTotalRemainingPayment - newTotalPayment,
    );

    const netSavings = this.roundMoney(grossSavings - refinancingFees);

    let breakEvenMonths: number | null = null;

    if (monthlySavings > 0 && refinancingFees > 0) {
      breakEvenMonths = Math.ceil(refinancingFees / monthlySavings);
    }

    if (monthlySavings > 0 && refinancingFees === 0) {
      breakEvenMonths = 0;
    }

    const recommended = netSavings > 0;

    return {
      recommended,

      currentMonthlyPayment,
      newMonthlyPayment,

      monthlySavings,

      currentTotalRemainingPayment,
      newTotalPayment,

      grossSavings,
      refinancingFees,
      netSavings,

      breakEvenMonths,
    };
  }

  private calculateMonthlyPayment(
    principal: number,
    annualInterestRate: number,
    termMonths: number,
  ): number {
    const monthlyRate = annualInterestRate / 100 / 12;

    if (monthlyRate === 0) {
      return this.roundMoney(principal / termMonths);
    }

    const factor = Math.pow(1 + monthlyRate, termMonths);

    const payment = principal * ((monthlyRate * factor) / (factor - 1));

    return this.roundMoney(payment);
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
