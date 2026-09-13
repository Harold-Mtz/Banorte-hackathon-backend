import { Router } from 'express';
import { AgentService } from '../services/agent.service';
import { AgentController } from '../controllers/agent.controller';
import { FinancialService } from '../services/financial.service';
import { FinancialProfileRepository } from '../repositories/financial-profile.repository';
import { GeminiClient } from '../ai/gemini-client';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { SavingsGoalRepository } from '../repositories/savings-goal.repository';
import { SavingsGoalService } from '../services/savings-goal.service';
import { FinancialProductRepository } from '../repositories/financial-product.repository';
import { FinancialProductService } from '../services/financial-product.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

const financialRepository = new FinancialProfileRepository();
const financialService = new FinancialService(financialRepository);
const geminiClient = new GeminiClient();
const sessionRepository = new AgentSessionRepository();
const savingsGoalService = new SavingsGoalService(new SavingsGoalRepository());
const financialProductService = new FinancialProductService(new FinancialProductRepository());
const agentService = new AgentService(financialService, geminiClient, sessionRepository, savingsGoalService, financialProductService);

const controller =
  new AgentController(agentService);
router.use(requireAuth);
router.post(
  '/message',
  controller.processMessage
);
router.post(
  '/interact',
  controller.processInteraction
);

export default router;