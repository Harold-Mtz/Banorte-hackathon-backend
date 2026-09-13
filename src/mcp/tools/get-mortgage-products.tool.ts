import { z } from 'zod';
import { IFinancialProductService } from '../../interfaces/financial-product-service.interface';

export const getMortgageProductsInputSchema = z.object({});

export type GetMortgageProductsInput =
  z.infer<typeof getMortgageProductsInputSchema>;

export const createGetMortgageProductsTool = (
  financialProductService: IFinancialProductService
) => {
  return async () => {
    const products =
      await financialProductService.getByType('MORTGAGE');

    return products.filter(product => product.isActive).map(product => ({
      id: product.id,
      name: product.name,
      type: product.type,
      description: product.description,
      interestRate: product.interestRate,
      cat: product.cat,
      minimumAmount: product.minimumAmount,
      maximumAmount: product.maximumAmount,
      minimumTermMonths: product.minimumTermMonths,
      maximumTermMonths: product.maximumTermMonths,
      metadata: product.metadata
    }));
  };
};