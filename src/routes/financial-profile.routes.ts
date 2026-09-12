import { Router } from 'express';
import { FinancialProfileRepository } from '../repositories/financial-profile.repository';
import { FinancialService } from '../services/financial.service';
import { FinancialProfileController } from '../controllers/financial-profile.controller';

const router = Router();

const repository = new FinancialProfileRepository();
const service = new FinancialService(repository);
const controller = new FinancialProfileController(service);

router.get(
  '/:userId/financial-profile',
  controller.getByUserId
);

router.patch(
  '/:userId/financial-profile',
  controller.updateByUserId
);

router.get(
  '/:userId/financial-summary',
  controller.getSummary
);

export default router;