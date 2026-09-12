import { Router } from 'express';

import { SavingsGoalRepository } from '../repositories/savings-goal.repository';
import { SavingsGoalService } from '../services/savings-goal.service';
import { SavingsGoalController } from '../controllers/savings-goal.controller';

const router = Router();

const repository =
  new SavingsGoalRepository();

const service =
  new SavingsGoalService(repository);

const controller =
  new SavingsGoalController(service);

router.post(
  '/',
  controller.create
);

router.get(
  '/:id',
  controller.getById
);

router.get(
  '/user/:userId',
  controller.getByUser
);

router.get(
  '/:id/progress',
  controller.getProgress
);

router.patch(
  '/:id/amount',
  controller.updateCurrentAmount
);

export default router;