import { idSchema } from '../domain/validation';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FinancialProfileRepository } from '../repositories/financial-profile.repository';
import { FinancialService } from '../services/financial.service';
import { FinancialProductRepository } from '../repositories/financial-product.repository';
import { FinancialProductService } from '../services/financial-product.service';
import { MortgageSimulationRepository } from '../repositories/mortgage-simulation.repository';
import { MortgageService } from '../services/mortgage.service';
import { SavingsGoalRepository } from '../repositories/savings-goal.repository';
import { SavingsGoalService } from '../services/savings-goal.service';
import { FinancialMovementRepository } from '../repositories/financial-movement.repository';
import { FinancialMovementService } from '../services/financial-movement.service';
import { AmortizationService } from '../services/amortization.service';
import { RefinancingService } from '../services/refinancing.service';
import { createGetFinancialProfileTool, getFinancialProfileInputSchema } from './tools/get-financial-profile.tool';
import { createGetFinancialDashboardTool, getFinancialDashboardInputSchema } from './tools/get-financial-dashboard.tool';
import { createGetMortgageProductsTool, getMortgageProductsInputSchema } from './tools/get-mortgage-products.tool';
import { createGetCreditProductsTool, getCreditProductsInputSchema } from './tools/get-credit-products.tool';
import { createSimulateMortgageTool, simulateMortgageInputSchema } from './tools/simulate-mortgage.tool';
import { createGenerateAmortizationScheduleTool, generateAmortizationScheduleInputSchema } from './tools/generate-amortization-schedule.tool';
import { createSavingsGoalTool, createSavingsGoalInputSchema } from './tools/create-savings-goal-tool';
import { createRecordFinancialMovementTool, recordFinancialMovementInputSchema } from './tools/record-financial-movement.tool';
import { createAnalyzeRefinancingTool, analyzeRefinancingInputSchema } from './tools/analyze-refinancing.tool';
import { createGoalManagementTool, goalManagementInputSchema, createListSavingsGoalsTool, listGoalsInputSchema } from './tools/goal-management.tool';
import { GeminiClient } from '../ai/gemini-client';
import type { LLMClient } from '../ai/llm-client.interface';
import { DecisionInsightsService } from '../services/decision-insights.service';
import { createGetDecisionInsightsTool, getDecisionInsightsInputSchema } from './tools/get-decision-insights.tool';

export const createMcpServer = (authenticatedUserId?: string, options?: { llm?: LLMClient }) => {
  const server = new McpServer({ name: 'banorte-boreas', version: '1.0.0' });
  const financial = new FinancialService(new FinancialProfileRepository());
  const products = new FinancialProductService(new FinancialProductRepository());
  const goals = new SavingsGoalService(new SavingsGoalRepository());
  const movements = new FinancialMovementService(new FinancialMovementRepository(), financial, goals);
  const mortgage = new MortgageService(new MortgageSimulationRepository(), new FinancialProductRepository(), financial);
  function register<S extends z.ZodRawShape>(name: string, description: string, schema: z.ZodObject<S>, handler: (input: any) => Promise<unknown>) {
    server.tool(name, description, schema.shape as any, async (input: any) => {
      try {
        if (!authenticatedUserId) throw new Error('AUTHENTICATION_REQUIRED');
        const parsed = schema.parse({ ...input, userId: authenticatedUserId });
        return { content: [{ type: 'text' as const, text: JSON.stringify(await handler(parsed)) }] };
      } catch (error) {
        return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: error instanceof z.ZodError ? 'INVALID_INPUT' : error instanceof Error ? error.message : 'DOMAIN_ERROR' }) }] };
      }
    });
  }
  register('getFinancialProfile', 'Financial profile for the JWT subject.', getFinancialProfileInputSchema, createGetFinancialProfileTool(financial));
  register('getFinancialDashboard', 'Financial dashboard and goal progress.', getFinancialDashboardInputSchema, createGetFinancialDashboardTool(movements));
  const llm = options ? options.llm : process.env.GEMINI_API_KEY ? new GeminiClient() : undefined;
  register('getDecisionInsights', 'Personalized decision radar from owned financial data. AI only orders a validated catalog; explicit rules fallback.', getDecisionInsightsInputSchema, createGetDecisionInsightsTool(new DecisionInsightsService(movements, llm)));
  register('getMortgageProducts', 'Active mortgage products from the catalog.', getMortgageProductsInputSchema, createGetMortgageProductsTool(products));
  register('getCreditProducts', 'Active mortgage, auto and personal credit products.', getCreditProductsInputSchema, createGetCreditProductsTool(products));
  register('simulateMortgage', 'Estimate using the selected catalog product.', simulateMortgageInputSchema, createSimulateMortgageTool(mortgage));
  register('generateAmortizationSchedule', 'Estimated amortization schedule.', generateAmortizationScheduleInputSchema, createGenerateAmortizationScheduleTool(new AmortizationService()));
  register('createSavingsGoal', 'Create a goal after explicit confirmation.', createSavingsGoalInputSchema.extend({ confirm: z.literal(true) }), createSavingsGoalTool(goals));
  register('recordFinancialMovement', 'Preview a movement; confirm only after explicit user approval.', recordFinancialMovementInputSchema, createRecordFinancialMovementTool(movements));
  register('analyzeRefinancing', 'Estimate refinancing costs and savings.', analyzeRefinancingInputSchema, createAnalyzeRefinancingTool(new RefinancingService()));
  register('listSavingsGoals', 'List owned goals, excluding deleted goals.', listGoalsInputSchema, createListSavingsGoalsTool(goals));
  register('getSavingsGoal', 'Get an owned savings goal.', z.object({ userId: idSchema, goalId: idSchema }), input => goals.getOwned(input.userId, input.goalId));
  register('updateSavingsGoal', 'Update an owned goal after confirmation.', goalManagementInputSchema.extend({ confirm: z.literal(true) }), createGoalManagementTool(goals));
  for (const [name, status] of Object.entries({ pauseSavingsGoal: 'PAUSED', resumeSavingsGoal: 'ACTIVE', cancelSavingsGoal: 'CANCELLED', archiveSavingsGoal: 'ARCHIVED', deleteSavingsGoal: 'DELETED' })) {
    register(name, 'Confirmed lifecycle change; retains the goal audit trail.', z.object({ userId: idSchema, goalId: idSchema, confirm: z.literal(true) }), input => createGoalManagementTool(goals)({ userId: input.userId, goalId: input.goalId, changes: { status: status as 'ACTIVE' } }));
  }
  register('previewGoalImpact', 'Preview only; never persist.', recordFinancialMovementInputSchema, input => createRecordFinancialMovementTool(movements)({ ...input, confirm: false }));
  register('listFinancialMovements', 'Recent owned financial movements.', listGoalsInputSchema, input => movements.getByUser(input.userId));
  return server;
};
