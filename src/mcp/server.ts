import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { FinancialProfileRepository } from "../repositories/financial-profile.repository";
import { FinancialService } from "../services/financial.service";
import { AmortizationService } from "../services/amortization.service";
import { RefinancingService } from "../services/refinancing.service";

import {
  createAnalyzeRefinancingTool,
  analyzeRefinancingInputSchema,
} from "./tools/analyze-refinancing.tool";
import {
  createGetFinancialProfileTool,
  getFinancialProfileInputSchema,
} from "./tools/get-financial-profile.tool";

import {
  createGenerateAmortizationScheduleTool,
  generateAmortizationScheduleInputSchema,
} from "./tools/generate-amortization-schedule.tool";
const refinancingService = new RefinancingService();

const analyzeRefinancing = createAnalyzeRefinancingTool(refinancingService);

export const createMcpServer = () => {
  const server = new McpServer({
    name: "banorte-adaptive-life",
    version: "1.0.0",
  });

  const repository = new FinancialProfileRepository();

  const financialService = new FinancialService(repository);
  const amortizationService = new AmortizationService();

  const getFinancialProfile = createGetFinancialProfileTool(financialService);
  const generateAmortizationSchedule =
    createGenerateAmortizationScheduleTool(amortizationService);

  server.tool(
    "analyzeRefinancing",

    "Analyzes whether refinancing an existing credit could reduce the monthly payment or total financial cost.",

    analyzeRefinancingInputSchema.shape,

    async ({
      currentBalance,
      currentAnnualRate,
      remainingTermMonths,
      newAnnualRate,
      newTermMonths,
      refinancingFees,
    }) => {
      const result = await analyzeRefinancing({
        currentBalance,
        currentAnnualRate,
        remainingTermMonths,
        newAnnualRate,
        newTermMonths,
        refinancingFees,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    },
  );

  return server;
};
