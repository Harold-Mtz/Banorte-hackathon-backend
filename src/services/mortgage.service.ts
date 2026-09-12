import { IMortgageService } from "../interfaces/mortgage-service.interface";
import { MortgageSimulationRepository } from "../repositories/mortgage-simulation.repository";
import { FinancialProductRepository } from "../repositories/financial-product.repository";
import { CreateMortgageSimulationDTO } from "../dtos/create-mortgage-simulation.dto";
import { MortgageSimulation } from "../models/mortgage-simulation.model";

function calculateMortgage(
  loanAmount: number,
  annualInterestRate: number,
  termMonths: number,
) {
  if (annualInterestRate === 0) {
    const monthlyPayment = loanAmount / termMonths;
    return { monthlyPayment, totalPayment: loanAmount, totalInterest: 0 };
  }

  const r = annualInterestRate / 12;
  const factor = Math.pow(1 + r, termMonths);

  const monthlyPayment = (loanAmount * (r * factor)) / (factor - 1);
  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = totalPayment - loanAmount;

  return { monthlyPayment, totalPayment, totalInterest };
}

export class MortgageService implements IMortgageService {
  constructor(
    private readonly repository: MortgageSimulationRepository,
    private readonly productRepository: FinancialProductRepository,

    private readonly financialService: {
      getAvailableIncome(userId: string): Promise<number>;
    },
  ) {}

  async simulate(
    data: CreateMortgageSimulationDTO,
  ): Promise<MortgageSimulation> {
    const loanAmount = data.propertyValue - data.downPayment;

    let interestRate = 0.1;
    if (data.financialProductId) {
      const product = await this.productRepository.findById(
        data.financialProductId,
      );
      if (!product) {
        throw new Error("Financial product not found");
      }
      interestRate = product.interestRate ?? interestRate;
    }

    const { monthlyPayment, totalPayment, totalInterest } = calculateMortgage(
      loanAmount,
      interestRate,
      data.termMonths,
    );

    return this.repository.create({
      userId: data.userId,
      lifeEventId: data.lifeEventId ?? null,
      financialProductId: data.financialProductId ?? null,
      propertyValue: data.propertyValue,
      downPayment: data.downPayment,
      loanAmount,
      termMonths: data.termMonths,
      annualInterestRate: interestRate,
      monthlyPayment,
      totalPayment,
      totalInterest,
    });
  }

  async calculateCapacity(userId: string): Promise<number> {
    const availableIncome =
      await this.financialService.getAvailableIncome(userId);
    return availableIncome * 0.3;
  }

  async getUserSimulations(userId: string): Promise<MortgageSimulation[]> {
    return this.repository.findByUserId(userId);
  }
}
