import { IFinancialService } from '../interfaces/financial-service.interface';
import { FinancialProfileRepository } from '../repositories/financial-profile.repository';
import { FinancialProfile } from '../models/financial-profile.model';
import { UpdateFinancialProfileDTO } from '../dtos/update-financial-profile.dto';
import { FinancialSummary } from '../types/database/financial-summary.type';

export class FinancialService implements IFinancialService {
  constructor(
    private readonly repository: FinancialProfileRepository
  ) {}

  async getProfile(
    userId: string
  ): Promise<FinancialProfile | null> {
    return this.repository.findByUserId(userId);
  }

  async updateProfile(
    userId: string,
    data: UpdateFinancialProfileDTO
  ): Promise<FinancialProfile> {
    const updated = await this.repository.updateByUserId(
      userId,
      data
    );

    if (!updated) {
      throw new Error('FINANCIAL_PROFILE_NOT_FOUND');
    }

    return updated;
  }

  async getAvailableIncome(
    userId: string
  ): Promise<number> {
    const profile = await this.repository.findByUserId(userId);

    if (!profile) {
      throw new Error('FINANCIAL_PROFILE_NOT_FOUND');
    }

    return (
      profile.monthlyIncome -
      profile.monthlyExpenses -
      profile.currentDebt
    );
  }

  async getFinancialSummary(
  userId: string
): Promise<FinancialSummary> {
  const profile = await this.repository.findByUserId(userId);

  if (!profile) {
    throw new Error('FINANCIAL_PROFILE_NOT_FOUND');
  }

  const availableIncome =
    profile.monthlyIncome -
    profile.monthlyExpenses -
    profile.currentDebt;

  return {
    monthlyIncome: profile.monthlyIncome,
    monthlyExpenses: profile.monthlyExpenses,
    currentSavings: profile.currentSavings,
    currentDebt: profile.currentDebt,
    creditScore: profile.creditScore,
    availableIncome
  };
}
}