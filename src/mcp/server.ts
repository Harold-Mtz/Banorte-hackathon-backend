import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { FinancialProfileRepository } from "../repositories/financial-profile.repository";
import { FinancialProductRepository } from "../repositories/financial-product.repository";
import { MortgageSimulationRepository } from "../repositories/mortgage-simulation.repository";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository";

import { FinancialService } from "../services/financial.service";
import { FinancialProductService } from "../services/financial-product.service";
import { MortgageService } from "../services/mortgage.service";
import { SavingsGoalService } from "../services/savings-goal.service";
import { AmortizationService } from "../services/amortization.service";
import { RefinancingService } from "../services/refinancing.service";

import {
  createGetFinancialProfileTool,
  getFinancialProfileInputSchema,
} from "./tools/get-financial-profile.tool";

import {
  createGetMortgageProductsTool,
  getMortgageProductsInputSchema,
} from "./tools/get-mortgage-products.tool";

import {
  createSimulateMortgageTool,
  simulateMortgageInputSchema,
} from "./tools/simulate-mortgage.tool";

import {
  createSavingsGoalTool,
  createSavingsGoalInputSchema,
} from "./tools/create-savings-goal-tool";

import {
  createGenerateAmortizationScheduleTool,
  generateAmortizationScheduleInputSchema,
} from "./tools/generate-amortization-schedule.tool";

import {
  createAnalyzeRefinancingTool,
  analyzeRefinancingInputSchema,
} from "./tools/analyze-refinancing.tool";

const asToolResult = (
  result: unknown,
) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify(result),
    },
  ],
});

export const createMcpServer = () => {
  const server =
    new McpServer({
      name: "banorte-adaptive-life",
      version: "1.0.0",
    });

  /*
   * Repositories
   */
  const financialProfileRepository =
    new FinancialProfileRepository();

  const financialProductRepository =
    new FinancialProductRepository();

  const mortgageSimulationRepository =
    new MortgageSimulationRepository();

  const savingsGoalRepository =
    new SavingsGoalRepository();

  /*
   * Services
   */
  const financialService =
    new FinancialService(
      financialProfileRepository,
    );

  const financialProductService =
    new FinancialProductService(
      financialProductRepository,
    );

  const mortgageService =
    new MortgageService(
      mortgageSimulationRepository,
      financialProductRepository,
      financialService,
    );

  const savingsGoalService =
    new SavingsGoalService(
      savingsGoalRepository,
    );

  const amortizationService =
    new AmortizationService();

  const refinancingService =
    new RefinancingService();

  /*
   * Tools
   */
  const getFinancialProfile =
    createGetFinancialProfileTool(
      financialService,
    );

  const getMortgageProducts =
    createGetMortgageProductsTool(
      financialProductService,
    );

  const simulateMortgage =
    createSimulateMortgageTool(
      mortgageService,
    );

  const createSavingsGoal =
    createSavingsGoalTool(
      savingsGoalService,
    );

  const generateAmortizationSchedule =
    createGenerateAmortizationScheduleTool(
      amortizationService,
    );

  const analyzeRefinancing =
    createAnalyzeRefinancingTool(
      refinancingService,
    );

  /*
   * MCP registrations
   */

  server.tool(
    "getFinancialProfile",

    "Gets the financial profile of a user.",

    getFinancialProfileInputSchema.shape,

    async (input) =>
      asToolResult(
        await getFinancialProfile(input),
      ),
  );

  server.tool(
    "getMortgageProducts",

    "Gets the active mortgage products available to the user.",

    getMortgageProductsInputSchema.shape,

    async () =>
      asToolResult(
        await getMortgageProducts(),
      ),
  );

  server.tool(
    "simulateMortgage",

    "Simulates a mortgage using a real financial product.",

    simulateMortgageInputSchema.shape,

    async (input) =>
      asToolResult(
        await simulateMortgage(input),
      ),
  );

  server.tool(
    "createSavingsGoal",

    "Creates and persists a savings goal for a user.",

    createSavingsGoalInputSchema.shape,

    async (input) =>
      asToolResult(
        await createSavingsGoal(input),
      ),
  );

  server.tool(
    "generateAmortizationSchedule",

    "Generates an amortization schedule for a loan.",

    generateAmortizationScheduleInputSchema.shape,

    async (input) =>
      asToolResult(
        await generateAmortizationSchedule(
          input,
        ),
      ),
  );

  server.tool(
    "analyzeRefinancing",

    "Analyzes whether refinancing an existing credit could reduce the monthly payment or total financial cost.",

    analyzeRefinancingInputSchema.shape,

    async (input) =>
      asToolResult(
        await analyzeRefinancing(input),
      ),
  );

  return server;
};