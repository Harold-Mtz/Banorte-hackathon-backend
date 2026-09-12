import { IFinancialProductService } from "../interfaces/financial-product-service.interface";
import { FinancialProductRepository } from "../repositories/financial-product.repository";
import { FinancialProduct } from "../models/financial-product.model";

export class FinancialProductService implements IFinancialProductService {
  constructor(private readonly repository: FinancialProductRepository) {}

  async getAll(): Promise<FinancialProduct[]> {
    return this.repository.findAll();
  }

  async getByType(type: string): Promise<FinancialProduct[]> {
    return this.repository.findByType(type);
  }
}
