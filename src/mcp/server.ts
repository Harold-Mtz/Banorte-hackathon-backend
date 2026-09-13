import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { FinancialProfileRepository } from "../repositories/financial-profile.repository";
import { GoalReminderRepository } from "../repositories/goal-reminder.repository";

import { SavingsGoalRepository } from "../repositories/savings-goal.repository";
import { SavingsGoalService } from "../services/savings-goal.service";

import {
  createGetGoalProgressTool,
  getGoalProgressInputSchema,
} from "./tools/get-goal-progress.tool";
import { FinancialService } from "../services/financial.service";
import { AmortizationService } from "../services/amortization.service";
import { RefinancingService } from "../services/refinancing.service";
import { GoalReminderService } from "../services/goal-reminder.service";

/*
 * Tools
 */
import {
  createGetFinancialProfileTool,
  getFinancialProfileInputSchema,
} from "./tools/get-financial-profile.tool";

import {
  createGenerateAmortizationScheduleTool,
  generateAmortizationScheduleInputSchema,
} from "./tools/generate-amortization-schedule.tool";

import {
  createAnalyzeRefinancingTool,
  analyzeRefinancingInputSchema,
} from "./tools/analyze-refinancing.tool";

import {
  configureGoalReminderTool,
  configureGoalReminderInputSchema,
} from "./tools/configure-goal-reminder.tool";

export const createMcpServer = () => {
  const server = new McpServer({
    name: "banorte-adaptive-life",
    version: "1.0.0",
  });

  /*
   * =========================
   * Repositories
   * =========================
   */

  const financialProfileRepository = new FinancialProfileRepository();

  const goalReminderRepository = new GoalReminderRepository();
  const savingsGoalRepository = new SavingsGoalRepository();
  /*
   * =========================
   * Services
   * =========================
   */

  const financialService = new FinancialService(financialProfileRepository);

  const amortizationService = new AmortizationService();

  const refinancingService = new RefinancingService();

  const goalReminderService = new GoalReminderService(goalReminderRepository);

  const savingsGoalService = new SavingsGoalService(savingsGoalRepository);

  /*
   * =========================
   * Tools
   * =========================
   */

  const getFinancialProfile = createGetFinancialProfileTool(financialService);

  const generateAmortizationSchedule =
    createGenerateAmortizationScheduleTool(amortizationService);

  const analyzeRefinancing = createAnalyzeRefinancingTool(refinancingService);

  const configureGoalReminder = configureGoalReminderTool(goalReminderService);
  const getGoalProgress = createGetGoalProgressTool(savingsGoalService);
  /*
   * =========================
   * MCP Tool Registration
   * =========================
   */

  server.tool(
    "getFinancialProfile",

    "Obtains the financial profile of a user including income, expenses, savings and current debt.",

    getFinancialProfileInputSchema.shape,

    async (input) => {
      const result = await getFinancialProfile(input);

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

  server.tool(
    "generateAmortizationSchedule",

    "Generates an amortization schedule for a loan using the provided amount, rate and term.",

    generateAmortizationScheduleInputSchema.shape,

    async (input) => {
      const result = await generateAmortizationSchedule(input);

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

  server.tool(
    "analyzeRefinancing",

    "Analyzes whether refinancing an existing credit could reduce the monthly payment or total financial cost.",

    analyzeRefinancingInputSchema.shape,

    async (input) => {
      const result = await analyzeRefinancing(input);

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
  server.tool(
    "getGoalProgress",

    "Gets the current progress of a savings goal and determines whether the user is ahead, on track, behind, completed, or has no savings plan.",

    getGoalProgressInputSchema.shape,

    async (input) => {
      const result = await getGoalProgress(input);

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

  server.tool(
    "configureGoalReminder",

    "Configures when a user wants to receive reminders about a savings goal.",

    configureGoalReminderInputSchema.shape,

    async (input) => {
      const result = await configureGoalReminder(input);

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
