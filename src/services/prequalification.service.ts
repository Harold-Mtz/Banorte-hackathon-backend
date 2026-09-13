import {
  IPrequalificationService,
  PrequalificationInput,
  PrequalificationResult,
  CreditRiskLevel,
} from "../interfaces/prequalification-service.interface";

import { IFinancialService } from "../interfaces/financial-service.interface";

import { IAmortizationService } from "../interfaces/amortization-service.interface";

export class PrequalificationService
  implements IPrequalificationService
{
  constructor(
    private readonly financialService: IFinancialService,
    private readonly amortizationService: IAmortizationService
  ) {}

  async prequalify(
    data: PrequalificationInput
  ): Promise<PrequalificationResult> {
    const {
      userId,
      requestedAmount,
      annualInterestRate,
      termMonths,
    } = data;

    /*
     * 1. Obtenemos situación financiera real
     */
    const financialProfile =
      await this.financialService.getProfile(userId);

    if (!financialProfile) {
      throw new Error(
        "Financial profile not found"
      );
    }

    if (requestedAmount <= 0) {
      throw new Error(
        "Requested amount must be greater than zero"
      );
    }

    /*
     * 2. Calculamos mensualidad del crédito solicitado
     */
    const simulation =
      await this.amortizationService.generateSchedule({
        principal: requestedAmount,
        annualInterestRate,
        termMonths,
      });

    const estimatedMonthlyPayment =
      simulation.monthlyPayment;

    /*
     * 3. Calculamos capacidad disponible.
     *
     * Regla sintética para hackathon:
     *
     * - máximo 35% del ingreso mensual
     * - y máximo 50% del ingreso disponible
     */
    const disposableIncome =
      financialProfile.monthlyIncome -
      financialProfile.monthlyExpenses;

    const incomeLimit =
      financialProfile.monthlyIncome * 0.35;

    const disposableIncomeLimit =
      Math.max(
        0,
        disposableIncome * 0.5
      );

    const maximumRecommendedMonthlyPayment =
      Math.min(
        incomeLimit,
        disposableIncomeLimit
      );

    /*
     * 4. Payment-to-income
     */
    const paymentToIncomeRatio =
      financialProfile.monthlyIncome > 0
        ? (
            estimatedMonthlyPayment /
            financialProfile.monthlyIncome
          ) * 100
        : 100;

    /*
     * 5. Score sintético
     */
    const creditScore =
      financialProfile.creditScore ?? 0;

    const hasAcceptableCreditScore =
      creditScore >= 650;

    const hasPaymentCapacity =
      estimatedMonthlyPayment <=
      maximumRecommendedMonthlyPayment;

    /*
     * 6. Precalificación
     */
    const qualified =
      hasAcceptableCreditScore &&
      hasPaymentCapacity;

    /*
     * 7. Monto máximo aproximado
     */
    const maximumEstimatedAmount =
      this.calculateMaximumPrincipal(
        maximumRecommendedMonthlyPayment,
        annualInterestRate,
        termMonths
      );

    /*
     * 8. Riesgo
     */
    const riskLevel =
      this.calculateRiskLevel(
        creditScore,
        paymentToIncomeRatio
      );

    /*
     * 9. Razones explicables
     */
    const reasons: string[] = [];

    if (hasAcceptableCreditScore) {
      reasons.push(
        "El score crediticio cumple con el mínimo estimado."
      );
    } else {
      reasons.push(
        "El score crediticio está por debajo del mínimo estimado."
      );
    }

    if (hasPaymentCapacity) {
      reasons.push(
        "La mensualidad estimada está dentro de tu capacidad de pago."
      );
    } else {
      reasons.push(
        "La mensualidad estimada supera la capacidad de pago recomendada."
      );
    }

    return {
      qualified,

      requestedAmount:
        this.roundMoney(requestedAmount),

      maximumEstimatedAmount:
        this.roundMoney(
          maximumEstimatedAmount
        ),

      annualInterestRate,

      termMonths,

      estimatedMonthlyPayment:
        this.roundMoney(
          estimatedMonthlyPayment
        ),

      maximumRecommendedMonthlyPayment:
        this.roundMoney(
          maximumRecommendedMonthlyPayment
        ),

      paymentToIncomeRatio:
        this.roundPercentage(
          paymentToIncomeRatio
        ),

      riskLevel,

      reasons,

      disclaimer:
        "Precalificación estimada con reglas sintéticas para fines demostrativos. No representa una aprobación bancaria real.",
    };
  }

  private calculateMaximumPrincipal(
    maximumMonthlyPayment: number,
    annualInterestRate: number,
    termMonths: number
  ): number {
    if (
      maximumMonthlyPayment <= 0 ||
      termMonths <= 0
    ) {
      return 0;
    }

    const monthlyRate =
      annualInterestRate / 100 / 12;

    if (monthlyRate === 0) {
      return (
        maximumMonthlyPayment *
        termMonths
      );
    }

    /*
     * Inversa de la fórmula de anualidad:
     *
     * P =
     * Payment * (1 - (1+r)^-n)
     * -------------------------
     *             r
     */
    return (
      maximumMonthlyPayment *
      (
        1 -
        Math.pow(
          1 + monthlyRate,
          -termMonths
        )
      )
    ) / monthlyRate;
  }

  private calculateRiskLevel(
    creditScore: number,
    paymentToIncomeRatio: number
  ): CreditRiskLevel {
    if (
      creditScore >= 750 &&
      paymentToIncomeRatio <= 25
    ) {
      return "LOW";
    }

    if (
      creditScore >= 680 &&
      paymentToIncomeRatio <= 35
    ) {
      return "MEDIUM";
    }

    return "HIGH";
  }

  private roundMoney(
    value: number
  ): number {
    return (
      Math.round(
        (value + Number.EPSILON) * 100
      ) / 100
    );
  }

  private roundPercentage(
    value: number
  ): number {
    return (
      Math.round(
        (value + Number.EPSILON) * 100
      ) / 100
    );
  }
}