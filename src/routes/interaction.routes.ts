import { Router } from 'express';

import { InteractionRepository } from '../repositories/interaction.repository';
import { AgentSessionRepository } from '../repositories/agent-session.repository';

import { InteractionService } from '../services/interaction.service';

import { InteractionController } from '../controllers/interaction.controller';

const router = Router();

const interactionRepository =
  new InteractionRepository();

const sessionRepository =
  new AgentSessionRepository();

const service =
  new InteractionService(
    interactionRepository,
    sessionRepository
  );

const controller =
  new InteractionController(service);

router.post(
  '/',
  controller.create
);

router.get(
  '/session/:sessionId',
  controller.getBySession
);

export default router;