import { IMortgageService } from "../interfaces/mortgage-service.interface";
import { MortgageSimulationRepository } from "../repositories/mortgage-simulation.repository";
import { FinancialProductRepository } from "../repositories/financial-product.repository";
import { CreateMortgageSimulationDTO } from "../dtos/create-mortgage-simulation.dto";
import { MortgageSimulation } from "../models/mortgage-simulation.model";

const MAX_MORTGAGE_PAYMENT_RATIO = 0.3;

function calculateMortgage(
  loanAmount: number,
  annualInterestRate: number,
  termMonths: number,
) {
  if (annualInterestRate === 0) {
    const monthlyPayment =
      loanAmount / termMonths;

    return {
      monthlyPayment,
      totalPayment: loanAmount,
      totalInterest: 0,
    };
  }

  const monthlyRate =
    annualInterestRate / 100 / 12;

  const factor =
    Math.pow(
      1 + monthlyRate,
      termMonths,
    );

  const monthlyPayment =
    (
      loanAmount *
      (monthlyRate * factor)
    ) /
    (factor - 1);

  const totalPayment =
    monthlyPayment * termMonths;

  const totalInterest =
    totalPayment - loanAmount;

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
  };
}

export class MortgageService
  implements IMortgageService
{
  constructor(
    private readonly repository:
      MortgageSimulationRepository,

    private readonly productRepository:
      FinancialProductRepository,

    private readonly financialService: {
      getAvailableIncome(
        userId: string,
      ): Promise<number>;
    },
  ) {}

  async simulate(
    data: CreateMortgageSimulationDTO,
  ): Promise<MortgageSimulation> {
    if (![data.propertyValue, data.downPayment, data.termMonths].every(Number.isFinite) || !Number.isInteger(data.termMonths)) throw new Error('Los montos y el plazo deben ser números válidos.');
    if (data.propertyValue <= 0) {
      throw new Error(
        "Property value must be greater than zero",
      );
    }

    if (
      data.downPayment < 0 ||
      data.downPayment >= data.propertyValue
    ) {
      throw new Error(
        "Down payment must be greater than or equal to zero and lower than property value",
      );
    }

    if (data.termMonths <= 0) {
      throw new Error(
        "Term months must be greater than zero",
      );
    }

    const product =
      await this.productRepository.findById(
        data.financialProductId,
      );

    if (!product) {
      throw new Error(
        "Financial product not found",
      );
    }

    if (!product.isActive) {
      throw new Error(
        "Financial product is not active",
      );
    }

    if (product.type !== "MORTGAGE") {
      throw new Error(
        "Financial product is not a mortgage",
      );
    }

    if (product.interestRate === null) {
      throw new Error(
        "Financial product has no interest rate",
      );
    }

    const loanAmount =
      data.propertyValue -
      data.downPayment;

    if (
      product.minimumAmount !== null &&
      loanAmount < product.minimumAmount
    ) {
      throw new Error(
        "Loan amount is below the product minimum",
      );
    }

    if (
      product.maximumAmount !== null &&
      loanAmount > product.maximumAmount
    ) {
      throw new Error(
        "Loan amount exceeds the product maximum",
      );
    }

    if (
      product.minimumTermMonths !== null &&
      data.termMonths <
        product.minimumTermMonths
    ) {
      throw new Error(
        "Term is below the product minimum",
      );
    }

    if (
      product.maximumTermMonths !== null &&
      data.termMonths >
        product.maximumTermMonths
    ) {
      throw new Error(
        "Term exceeds the product maximum",
      );
    }

    const interestRate =
      product.interestRate;

    const {
      monthlyPayment,
      totalPayment,
      totalInterest,
    } = calculateMortgage(
      loanAmount,
      interestRate,
      data.termMonths,
    );

    return this.repository.create({
      userId: data.userId,

      lifeEventId:
        data.lifeEventId ?? null,

      financialProductId:
        data.financialProductId,

      propertyValue:
        data.propertyValue,

      downPayment:
        data.downPayment,

      loanAmount,

      termMonths:
        data.termMonths,

      annualInterestRate:
        interestRate,

      monthlyPayment,
      totalPayment,
      totalInterest,
    });
  }

  async calculateCapacity(
    userId: string,
  ): Promise<number> {
    const availableIncome =
      await this.financialService
        .getAvailableIncome(userId);

    return (
      availableIncome *
      MAX_MORTGAGE_PAYMENT_RATIO
    );
  }

  async getUserSimulations(
    userId: string,
  ): Promise<MortgageSimulation[]> {
    return this.repository.findByUserId(
      userId,
    );
  }
}