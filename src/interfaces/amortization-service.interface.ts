export interface IAmortizationService {
  generateSchedule(data: {
    principal: number;
    annualInterestRate: number;
    termMonths: number;
  }): Promise<{
    principal: number;
    annualInterestRate: number;
    termMonths: number;

    monthlyPayment: number;
    totalPayment: number;
    totalInterest: number;

    schedule: {
      paymentNumber: number;
      payment: number;
      principal: number;
      interest: number;
      remainingBalance: number;
    }[];
  }>;
}
export interface GenerateAmortizationInput {
  principal: number;
  annualInterestRate: number;
  termMonths: number;
}

export interface AmortizationPayment {
  paymentNumber: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface AmortizationResult {
  principal: number;
  annualInterestRate: number;
  termMonths: number;

  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;

  schedule: AmortizationPayment[];
}
