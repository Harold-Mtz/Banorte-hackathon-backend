import { IMortgageService } from "../interfaces/mortgage-service.interface";
import { MortgageSimulationRepository } from "../repositories/mortgage-simulation.repository";
import { FinancialProductRepository } from "../repositories/financial-product.repository";
import { CreateMortgageSimulationDTO } from "../dtos/create-mortgage-simulation.dto";
import { MortgageSimulation } from "../models/mortgage-simulation.model";
import { LifeEventRepository } from '../repositories/life-event.repository';

function calculateMortgage(
  loanAmount: number,
  annualInterestRate: number,
  termMonths: number,
) {
  if (annualInterestRate === 0) {
    const monthlyPayment = loanAmount / termMonths;
    return { monthlyPayment, totalPayment: loanAmount, totalInterest: 0 };
  }

  // Catalog rates use percentage points: 10.5 means 10.5% annually.
  const r = annualInterestRate / 100 / 12;
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
    if (data.lifeEventId) {
      const event = await new LifeEventRepository().findById(data.lifeEventId);
      if (!event || event.userId !== data.userId) throw new Error('LIFE_EVENT_NOT_FOUND');
    }
    const loanAmount = data.propertyValue - data.downPayment;

    if (!Number.isFinite(data.propertyValue) || !Number.isFinite(data.downPayment) || data.propertyValue <= 0 || data.downPayment < 0 || data.downPayment >= data.propertyValue || !Number.isInteger(data.termMonths) || data.termMonths <= 0) throw new Error('INVALID_MORTGAGE_INPUT');
    if (!data.financialProductId) throw new Error('PRODUCT_REQUIRED');
    let interestRate: number;
    {
      const product = await this.productRepository.findById(
        data.financialProductId,
      );
      if (!product || !product.isActive || !['MORTGAGE', 'MORTAGE'].includes(product.type) || product.interestRate === null) {
        throw new Error("Financial product not found");
      }
      if ((product.minimumAmount !== null && loanAmount < product.minimumAmount) || (product.maximumAmount !== null && loanAmount > product.maximumAmount) || (product.minimumTermMonths !== null && data.termMonths < product.minimumTermMonths) || (product.maximumTermMonths !== null && data.termMonths > product.maximumTermMonths)) throw new Error('PRODUCT_LIMITS');
      interestRate = product.interestRate;
      const minimumDownPaymentPercent = product.metadata.downPaymentPercentage;
      if (typeof minimumDownPaymentPercent === 'number' && data.downPayment < data.propertyValue * minimumDownPaymentPercent / 100) throw new Error('PRODUCT_LIMITS');
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
