import { Router } from 'express';

import { UIStateRepository } from '../repositories/ui-state.repository';
import { UIStateService } from '../services/ui-state.service';
import { UIStateController } from '../controllers/ui-state.controller';

const router = Router();

const repository =
  new UIStateRepository();

const service =
  new UIStateService(repository);

const controller =
  new UIStateController(service);

router.post(
  '/agent/sessions/:sessionId/ui-states',
  controller.create
);

router.get(
  '/agent/sessions/:sessionId/ui-states/latest',
  controller.getLatest
);

export default router;