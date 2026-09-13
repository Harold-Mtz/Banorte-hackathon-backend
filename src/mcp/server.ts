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
import { createGetMortgageProductsTool, getMortgageProductsInputSchema } from "./tools/get-mortgage-products.tool";
import { createSimulateMortgageTool, simulateMortgageInputSchema } from "./tools/simulate-mortgage.tool";
import { createSavingsGoalTool, createSavingsGoalInputSchema } from "./tools/create-savings-goal-tool";
import { FinancialProductRepository } from "../repositories/financial-product.repository";
import { FinancialProductService } from "../services/financial-product.service";
import { MortgageSimulationRepository } from "../repositories/mortgage-simulation.repository";
import { MortgageService } from "../services/mortgage.service";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository";
import { SavingsGoalService } from "../services/savings-goal.service";
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
  const financialProductService = new FinancialProductService(new FinancialProductRepository());
  const mortgageService = new MortgageService(new MortgageSimulationRepository(), new FinancialProductRepository(), financialService);
  const savingsGoalService = new SavingsGoalService(new SavingsGoalRepository());

  const getFinancialProfile = createGetFinancialProfileTool(financialService);
  const generateAmortizationSchedule =
    createGenerateAmortizationScheduleTool(amortizationService);
  const getMortgageProducts = createGetMortgageProductsTool(financialProductService);
  const simulateMortgage = createSimulateMortgageTool(mortgageService);
  const createSavingsGoal = createSavingsGoalTool(savingsGoalService);

  server.tool("getFinancialProfile", "Gets the authenticated user's financial profile.", getFinancialProfileInputSchema.shape, async (input) => ({ content: [{ type: "text", text: JSON.stringify(await getFinancialProfile(input)) }] }));
  server.tool("getMortgageProducts", "Gets available mortgage products.", getMortgageProductsInputSchema.shape, async () => ({ content: [{ type: "text", text: JSON.stringify(await getMortgageProducts()) }] }));
  server.tool("simulateMortgage", "Creates a mortgage simulation from user and selected values.", simulateMortgageInputSchema.shape, async (input) => ({ content: [{ type: "text", text: JSON.stringify(await simulateMortgage(input)) }] }));
  server.tool("generateAmortizationSchedule", "Generates an amortization schedule.", generateAmortizationScheduleInputSchema.shape, async (input) => ({ content: [{ type: "text", text: JSON.stringify(await generateAmortizationSchedule(input)) }] }));
  server.tool("createSavingsGoal", "Creates a confirmed savings goal.", createSavingsGoalInputSchema.shape, async (input) => ({ content: [{ type: "text", text: JSON.stringify(await createSavingsGoal(input)) }] }));

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
