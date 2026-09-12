import { Router } from 'express';
import { AgentService } from '../services/agent.service';
import { AgentController } from '../controllers/agent.controller';
import { FinancialService } from '../services/financial.service';
import { FinancialProfileRepository } from '../repositories/financial-profile.repository';
const router = Router();

const financialRepository = new FinancialProfileRepository();
const financialService = new FinancialService(financialRepository);
const agentService = new AgentService(financialService);

const controller =
  new AgentController(agentService);
router.post(
  '/message',
  controller.processMessage
);

export default router;