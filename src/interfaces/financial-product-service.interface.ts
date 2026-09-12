import { FinancialProduct } from "../models/financial-product.model";

export interface IFinancialProductService {
  getAll(): Promise<FinancialProduct[]>;
  getByType(type: string): Promise<FinancialProduct[]>;
}
