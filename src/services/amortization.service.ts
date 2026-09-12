import {
  IAmortizationService,
  GenerateAmortizationInput,
  AmortizationResult,
  AmortizationPayment,
} from "../interfaces/amortization-service.interface";

export class AmortizationService implements IAmortizationService {
  async generateSchedule(
    data: GenerateAmortizationInput,
  ): Promise<AmortizationResult> {
    const { principal, annualInterestRate, termMonths } = data;

    if (principal <= 0) {
      throw new Error("Principal must be greater than zero");
    }

    if (annualInterestRate < 0) {
      throw new Error("Annual interest rate cannot be negative");
    }

    if (termMonths <= 0) {
      throw new Error("Term months must be greater than zero");
    }

    const monthlyRate = annualInterestRate / 100 / 12;

    let monthlyPayment: number;

    if (monthlyRate === 0) {
      monthlyPayment = principal / termMonths;
    } else {
      const factor = Math.pow(1 + monthlyRate, termMonths);

      monthlyPayment = principal * ((monthlyRate * factor) / (factor - 1));
    }

    monthlyPayment = this.roundMoney(monthlyPayment);

    let remainingBalance = principal;

    let totalInterest = 0;
    let totalPayment = 0;

    const schedule: AmortizationPayment[] = [];

    for (let paymentNumber = 1; paymentNumber <= termMonths; paymentNumber++) {
      //Interés del mes sobre saldo insoluto.
      let interest = remainingBalance * monthlyRate;

      interest = this.roundMoney(interest);

      let principalPayment = monthlyPayment - interest;

      let actualPayment = monthlyPayment;

      if (paymentNumber === termMonths || principalPayment > remainingBalance) {
        principalPayment = remainingBalance;

        actualPayment = principalPayment + interest;
      }

      principalPayment = this.roundMoney(principalPayment);

      actualPayment = this.roundMoney(actualPayment);

      remainingBalance = remainingBalance - principalPayment;

      if (remainingBalance < 0.01) {
        remainingBalance = 0;
      }

      remainingBalance = this.roundMoney(remainingBalance);

      totalInterest += interest;

      totalPayment += actualPayment;

      schedule.push({
        paymentNumber,
        payment: actualPayment,
        principal: principalPayment,
        interest,
        remainingBalance,
      });
    }

    totalInterest = this.roundMoney(totalInterest);

    totalPayment = this.roundMoney(totalPayment);

    return {
      principal: this.roundMoney(principal),

      annualInterestRate,

      termMonths,

      monthlyPayment,

      totalPayment,

      totalInterest,

      schedule,
    };
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
