import { z } from 'zod';
import { FinancialProductService } from '../../services/financial-product.service';
export const getCreditProductsInputSchema = z.object({ type: z.enum(['MORTGAGE','AUTO_LOAN','PERSONAL_LOAN']).optional() });
export const createGetCreditProductsTool = (service: FinancialProductService) => async (input: z.infer<typeof getCreditProductsInputSchema> = {}) => {
  const { type } = getCreditProductsInputSchema.parse(input);
  const products = type ? await service.getByType(type) : await service.getAll();
  return products.filter(product => product.isActive && ['MORTGAGE','MORTAGE','AUTO_LOAN','PERSONAL_LOAN'].includes(product.type));
};
