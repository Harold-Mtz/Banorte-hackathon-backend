import { Router } from 'express';
import { LifeEventRepository } from '../repositories/life-event.repository';
import { LifeEventService } from '../services/life-event.service';
import { LifeEventController } from '../controllers/life-event.controller';

const router = Router();

const repository = new LifeEventRepository();
const service = new LifeEventService(repository);
const controller = new LifeEventController(service);

router.post('/', controller.create);

router.get('/:id', controller.getById);

router.get(
  '/user/:userId',
  controller.getByUser
);

export default router;