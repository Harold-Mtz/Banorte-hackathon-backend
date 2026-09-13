import { z } from 'zod';
import { idSchema } from '../../domain/validation';
import { DecisionInsightsService } from '../../services/decision-insights.service';

export const getDecisionInsightsInputSchema = z.object({
  userId: idSchema,
  personalize: z.boolean().optional().default(true),
  request: z.string().trim().max(1000).optional(),
});

export const decisionInsightsOutputSchema = z.object({
  source: z.enum(['ai', 'rules']),
  transport: z.enum(['mcp', 'domain']).optional(),
  headline: z.string().min(1).max(200),
  summary: z.string().min(1).max(600),
  signals: z.array(z.object({
    id: z.string().min(1), label: z.string().min(1), value: z.number().finite(),
    format: z.enum(['money', 'percent', 'number']), tone: z.enum(['positive', 'warning', 'neutral']), detail: z.string(),
  })).min(1).max(8),
  nextSteps: z.array(z.object({
    label: z.string().min(1), reason: z.string(), action: z.enum(['SELECT_GOAL', 'REQUEST_CREDIT_OPTIONS']).optional(), goalId: idSchema.optional(),
  })).min(1).max(4),
  evidence: z.array(z.string()).min(1), generatedAt: z.iso.datetime(), snapshotId: z.string().regex(/^[0-9a-f]{64}$/),
});

export const createGetDecisionInsightsTool = (service: Pick<DecisionInsightsService, 'getInsights'>) =>
  async (input: z.input<typeof getDecisionInsightsInputSchema>) => {
    const data = getDecisionInsightsInputSchema.parse(input);
    return decisionInsightsOutputSchema.parse(await service.getInsights(data.userId, data.personalize, data.request));
  };
