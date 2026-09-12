import { Router } from 'express';

import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import { UIStateRepository } from '../repositories/ui-state.repository';

import { AgentSessionService } from '../services/agent-session.service';

import { AgentSessionController } from '../controllers/agent-session.controller';

const router = Router();

const sessionRepository =
  new AgentSessionRepository();

const messageRepository =
  new AgentMessageRepository();

const uiStateRepository =
  new UIStateRepository();

const service =
  new AgentSessionService(
    sessionRepository,
    messageRepository,
    uiStateRepository
  );

const controller =
  new AgentSessionController(service);

router.post(
  '/',
  controller.create
);

router.get(
  '/:sessionId',
  controller.getById
);

router.post(
  '/:sessionId/messages',
  controller.addMessage
);

router.get(
  '/:sessionId/messages',
  controller.getMessages
);

router.get(
  '/:sessionId/ui-state',
  controller.getLatestUIState
);

export default router;