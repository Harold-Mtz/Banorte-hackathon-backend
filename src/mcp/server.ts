import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Repositories
import { FinancialProfileRepository } from "../repositories/financial-profile.repository";
import { GoalReminderRepository } from "../repositories/goal-reminder.repository";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository";

// Services
import { FinancialService } from "../services/financial.service";
import { AmortizationService } from "../services/amortization.service";
import { RefinancingService } from "../services/refinancing.service";
import { PrequalificationService } from "../services/prequalification.service";
import { GoalReminderService } from "../services/goal-reminder.service";

// Tools
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

import {
  createPrequalifyCreditTool,
  prequalifyCreditInputSchema,
} from "./tools/prequalify-credit.tool";

export const createMcpServer = () => {
  /*
   * =========================
   * MCP SERVER
   * =========================
   */

  const server = new McpServer({
    name: "banorte-adaptive-life",
    version: "1.0.0",
  });

  /*
   * =========================
   * REPOSITORIES
   * =========================
   */

  const financialProfileRepository =
    new FinancialProfileRepository();

  const savingsGoalRepository =
    new SavingsGoalRepository();

  const goalReminderRepository =
    new GoalReminderRepository();

  /*
   * =========================
   * SERVICES
   * =========================
   */

  const financialService =
    new FinancialService(
      financialProfileRepository
    );

  const amortizationService =
    new AmortizationService();

  const refinancingService =
    new RefinancingService();

  const prequalificationService =
    new PrequalificationService(
      financialService,
      amortizationService
    );

  const goalReminderService =
    new GoalReminderService(
      goalReminderRepository
    );

  /*
   * =========================
   * TOOL HANDLERS
   * =========================
   */

  const getFinancialProfile =
    createGetFinancialProfileTool(
      financialService
    );

  const generateAmortizationSchedule =
    createGenerateAmortizationScheduleTool(
      amortizationService
    );

  const analyzeRefinancing =
    createAnalyzeRefinancingTool(
      refinancingService
    );

  const prequalifyCredit =
    createPrequalifyCreditTool(
      prequalificationService
    );

  const configureGoalReminder =
    configureGoalReminderTool(
      goalReminderService
    );

  /*
   * =========================
   * TOOL: getFinancialProfile
   * =========================
   */

  server.tool(
    "getFinancialProfile",

    "Obtains the financial profile of a user including income, expenses, savings and current debt.",

    getFinancialProfileInputSchema.shape,

    async ({ userId }) => {
      const result =
        await getFinancialProfile({
          userId,
        });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  /*
   * =========================
   * TOOL: generateAmortizationSchedule
   * =========================
   */

  server.tool(
    "generateAmortizationSchedule",

    "Generates an amortization schedule for a credit including monthly payment, principal, interest and remaining balance.",

    generateAmortizationScheduleInputSchema.shape,

    async ({
      principal,
      annualInterestRate,
      termMonths,
    }) => {
      const result =
        await generateAmortizationSchedule({
          principal,
          annualInterestRate,
          termMonths,
        });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  /*
   * =========================
   * TOOL: analyzeRefinancing
   * =========================
   */

  server.tool(
    "analyzeRefinancing",

    "Analyzes whether refinancing an existing credit could be financially beneficial.",

    analyzeRefinancingInputSchema.shape,

    async ({
      currentBalance,
      currentAnnualRate,
      remainingTermMonths,
      newAnnualRate,
      newTermMonths,
      refinancingFees,
    }) => {
      const result =
        await analyzeRefinancing({
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
    }
  );

  /*
   * =========================
   * TOOL: configureGoalReminder
   * =========================
   */

  server.tool(
    "configureGoalReminder",

    "Configures reminders associated with a savings goal.",

    configureGoalReminderInputSchema.shape,

    async (input) => {
      const result =
        await configureGoalReminder(input);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  /*
   * =========================
   * TOOL: prequalifyCredit
   * =========================
   */

  server.tool(
    "prequalifyCredit",

    "Estimates whether a user could qualify for a requested credit amount based on financial profile, estimated monthly payment and synthetic credit rules.",

    prequalifyCreditInputSchema.shape,

    async ({
      userId,
      requestedAmount,
      annualInterestRate,
      termMonths,
    }) => {
      const result =
        await prequalifyCredit({
          userId,
          requestedAmount,
          annualInterestRate,
          termMonths,
        });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );

  return server;
};