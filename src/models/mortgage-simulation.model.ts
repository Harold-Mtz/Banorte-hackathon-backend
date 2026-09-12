export interface MortgageSimulation {
  id: string;
  userId: string;
  lifeEventId: string | null;
  financialProductId: string | null;
  propertyValue: number;
  downPayment: number;
  loanAmount: number;
  termMonths: number;
  annualInterestRate: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  createdAt: Date;
}