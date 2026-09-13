import { Router } from "express";

import { AgentService } from "../services/agent.service";
import { AdaptiveExperienceService } from "../services/adaptive-experience.service";
import { successResponse, errorResponse } from "../utils/response.util";

import { FinancialService } from "../services/financial.service";
import { LifeEventService } from "../services/life-event.service";

import { FinancialProfileRepository } from "../repositories/financial-profile.repository";
import { LifeEventRepository } from "../repositories/life-event.repository";

import { GeminiClient } from "../ai/gemini-client";

const router = Router();

const financialRepository = new FinancialProfileRepository();

const financialService = new FinancialService(financialRepository);

const lifeEventRepository = new LifeEventRepository();

const lifeEventService = new LifeEventService(lifeEventRepository);

const geminiClient = new GeminiClient();

const agentService = new AgentService(
  financialService,
  lifeEventService,
  geminiClient,
);

const experience = new AdaptiveExperienceService(agentService);
router.post("/message", async (req, res) => {
  try {
    res.json(successResponse(await experience.message(req.body)));
  } catch {
    res
      .status(400)
      .json(
        errorResponse(
          "AGENT_PROCESS_ERROR",
          "No pudimos preparar tu experiencia. Revisa tu perfil e intenta de nuevo.",
        ),
      );
  }
});
router.post("/interact", async (req, res) => {
  try {
    res.json(
      successResponse(await experience.interact(req.body, res.locals.userId)),
    );
  } catch {
    res
      .status(400)
      .json(
        errorResponse(
          "INTERACTION_ERROR",
          "No pudimos actualizar la experiencia. Revisa los montos y los límites del producto; si ya confirmaste, recarga la experiencia.",
        ),
      );
  }
});
export default router;
