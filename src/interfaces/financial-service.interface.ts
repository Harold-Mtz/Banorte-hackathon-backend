import { FinancialProfile } from '../models/financial-profile.model';
import { UpdateFinancialProfileDTO } from '../dtos/update-financial-profile.dto';
import { FinancialSummary } from '../types/database/financial-summary.type';
export interface IFinancialService {
  getProfile(
    userId: string
  ): Promise<FinancialProfile | null>;

  updateProfile(
    userId: string,
    data: UpdateFinancialProfileDTO
  ): Promise<FinancialProfile>;

  getAvailableIncome(
    userId: string
  ): Promise<number>;

  getFinancialSummary(
  userId: string
): Promise<FinancialSummary>;
}