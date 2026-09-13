import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { DecisionInsightsService, FinancialDashboard } from '../services/decision-insights.service';
import { createGetDecisionInsightsTool, decisionInsightsOutputSchema } from '../mcp/tools/get-decision-insights.tool';
import { createMcpServer } from '../mcp/server';
import { requestDecisionInsights } from '../mcp/decision-insights.client';
import { GeminiClient, requestWithTransientRetry } from '../ai/gemini-client';
import { pool } from '../config/database';
import type { LLMClient } from '../ai/llm-client.interface';
import { createGenerateAmortizationScheduleTool } from '../mcp/tools/generate-amortization-schedule.tool';
import { AmortizationService } from '../services/amortization.service';

async function main() {
  let checks = 0;
  const check = (value: unknown, name: string) => { assert.ok(value, name); checks++; console.log('PASS ' + name); };
  const userId = randomUUID();
  const goalId = randomUUID();
  const fakeDashboard = {
    monthlyIncome: 30000, monthlyExpenses: 22000, monthlyDebtPayments: 2000,
    currentSavings: 50000, availableMonthlyCash: 6000, creditScore: 700, period: 'septiembre de 2026',
    goals: [{ id: goalId, userId, name: 'Viaje', targetAmount: 100000, currentAmount: 10000, monthlyContribution: 8000, targetDate: new Date('2026-12-01'), status: 'ACTIVE', metadata: {}, createdAt: new Date(), updatedAt: new Date(), lifeEventId: null, progress: 10, monthsRemaining: 12, estimatedDate: '2027-09-13', delayed: true, estimated: true }],
    movements: [], totals: { deposits: 0, withdrawals: 0, expenses: 0, income: 0, monthlyWithdrawals: 0 },
  } as FinancialDashboard;
  const provider = { getDashboard: async () => fakeDashboard };
  const domain = new DecisionInsightsService(provider);
  const rules = domain.fromDashboard(fakeDashboard);
  check(rules.source === 'rules' && rules.transport === 'domain', 'Domain fallback reports its real source');
  check(rules.signals.find(signal => signal.id === 'protected-margin')?.value === -2000, 'Protected margin subtracts active goal commitments');
  check(rules.signals.find(signal => signal.id === 'goals-at-risk')?.value === 1, 'Risk count uses domain goal projection');
  check(!rules.nextSteps.some(step => step.action === 'REQUEST_CREDIT_OPTIONS'), 'Negative margin prioritizes plans before credit exploration');
  check(rules.nextSteps.find(step => step.action === 'SELECT_GOAL')?.goalId === goalId, 'Actions point to owned domain goals');
  const composition = { signalOrder: rules.signals.map(signal => signal.id).reverse(), nextStepOrder: rules.nextSteps.map((_, index) => index).reverse() };
  const validModel: LLMClient = { generate: async () => JSON.stringify(composition) };
  const ai = await new DecisionInsightsService(provider, validModel).personalize(rules, 'Prioriza mi ahorro');
  check(ai.source === 'ai' && ai.signals[0].id === 'current-savings', 'Validated model selection changes actual presentation order');
  check(ai.headline !== rules.headline, 'Selected composition changes its grounded narrative');
  check(ai.signals.every(signal => rules.signals.some(item => JSON.stringify(item) === JSON.stringify(signal))), 'Every AI signal comes unchanged from domain catalog');
  check(ai.nextSteps.every(step => rules.nextSteps.some(item => JSON.stringify(item) === JSON.stringify(step))), 'AI cannot invent action payloads');
  check(decisionInsightsOutputSchema.safeParse(ai).success, 'Radar output satisfies shared Zod contract');
  for (const output of ['not json', JSON.stringify({ ...composition, amount: 999999 }), JSON.stringify({ ...composition, signalOrder: ['made-up'] }), JSON.stringify({ ...composition, signalOrder: rules.signals.map(() => 'protected-margin') }), JSON.stringify({ ...composition, nextStepOrder: [99] })]) {
    const result = await new DecisionInsightsService(provider, { generate: async () => output }).personalize(rules);
    check(result.source === 'rules', 'Malformed, fabricated or incomplete model composition falls back to rules');
  }
  check((await new DecisionInsightsService(provider, { generate: async () => { throw new Error('provider unavailable'); } }).personalize(rules)).source === 'rules', 'Provider failure stays explicit');
  check((await new DecisionInsightsService(provider, { generate: () => new Promise(() => {}) }, 10).personalize(rules)).source === 'rules', 'Provider timeout returns deterministic rules');
  check((await domain.personalize(rules)).source === 'rules', 'Missing model never claims AI');
  let providerAttempts = 0;
  let providerSignal: AbortSignal | undefined;
  const recovered = await requestWithTransientRetry(async signal => {
    providerAttempts++;
    if (providerAttempts === 1) { providerSignal = signal; throw { status: 503 }; }
    assert.equal(signal, providerSignal);
    return 'recovered';
  });
  check(recovered === 'recovered' && providerAttempts === 2, 'Transient provider failure retries once with the original deadline signal');
  for (const status of [400, 401, 429]) {
    let attempts = 0;
    await assert.rejects(() => requestWithTransientRetry(async () => { attempts++; throw Object.assign(new Error('provider rejected'), { status }); }));
    check(attempts === 1, 'Provider authentication, quota or invalid request is not retried');
  }
  let unavailableAttempts = 0;
  await assert.rejects(() => requestWithTransientRetry(async () => { unavailableAttempts++; throw Object.assign(new Error('provider unavailable'), { status: 503 }); }));
  check(unavailableAttempts === 2, 'Persistent provider unavailability stops after one retry');
  const refreshed = domain.fromDashboard({ ...fakeDashboard, availableMonthlyCash: 4000 }, ai);
  check(refreshed.source === 'rules' && refreshed.snapshotId !== ai.snapshotId, 'Changed financial snapshot invalidates cached AI composition');
  check(refreshed.signals.find(signal => signal.id === 'protected-margin')?.value === -4000, 'Refresh recomputes amounts from current facts');
  const rehydrated = domain.fromDashboard(fakeDashboard, { ...ai, signals: ai.signals.map(signal => ({ ...signal, value: 999999 })) });
  check(rehydrated.signals.every(signal => signal.value !== 999999), 'Even matching snapshots rehydrate money from current domain data');
  check(domain.fromDashboard(fakeDashboard, { ...ai, signals: ai.signals.map(() => ai.signals[0]) }).source === 'rules', 'Duplicate cached selections cannot drop a financial warning');
  let invoked = false;
  const tool = createGetDecisionInsightsTool({ getInsights: async (id, personalize, request) => { invoked = true; assert.equal(id, userId); assert.equal(personalize, false); assert.equal(request, 'mi ahorro'); return rules; } });
  await assert.rejects(() => tool({ userId: 'invalid' }));
  check(!invoked, 'Tool rejects invalid identity before calling domain');
  await tool({ userId, personalize: false, request: 'mi ahorro' });
  check(invoked, 'Tool delegates validated parameters to service');
  const amortization = createGenerateAmortizationScheduleTool(new AmortizationService());
  await assert.rejects(() => amortization({ principal: 100000, annualInterestRate: 10, termMonths: 1000000000 }));
  check(true, 'Amortization tool bounds schedule size before calculation');

  // Real PostgreSQL + MCP transport integration. All test resources belong to one temporary user.
  let inserted = false;
  const mcpServer = createMcpServer(userId, { llm: validModel });
  const client = new Client({ name: 'radar-contract-test', version: '1.0.0' });
  try {
    await pool.query('INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)', [userId, 'Radar integration test', userId + '@boreas.test', 'unused-test-password-hash']);
    inserted = true;
    await pool.query('INSERT INTO financial_profiles(user_id,monthly_income,monthly_expenses,current_savings,current_debt,credit_score) VALUES($1,30000,10000,50000,2000,720)', [userId]);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await mcpServer.connect(serverTransport);
    await client.connect(clientTransport);
    const registry = await client.listTools();
    check(registry.tools.some(item => item.name === 'getDecisionInsights'), 'MCP registry exposes decision radar with input schema');
    const result = CallToolResultSchema.parse(await client.callTool({ name: 'getDecisionInsights', arguments: { userId: randomUUID(), personalize: false } }));
    const content = result.content.find(item => item.type === 'text');
    assert.ok(content?.type === 'text');
    const owned = decisionInsightsOutputSchema.parse(JSON.parse(content.text));
    check(!result.isError && owned.signals.find(signal => signal.id === 'protected-margin')?.value === 18000, 'MCP substitutes spoofed userId with its authenticated subject');
    const dynamicModel: LLMClient = { generate: async messages => {
      const catalog = JSON.parse(messages.find(message => message.role === 'user')!.content);
      return JSON.stringify({ signalOrder: catalog.signals.map((signal: { id: string }) => signal.id).reverse(), nextStepOrder: catalog.nextSteps.map((step: { index: number }) => step.index) });
    } };
    const viaClient = await requestDecisionInsights(userId, dynamicModel, 'Ver mi ahorro');
    check(viaClient.transport === 'mcp' && viaClient.source === 'ai', 'Agent MCP client completes initialize and real tools/call with validated AI output');
    check(viaClient.signals[0].id === 'current-savings' && viaClient.signals[0].value === 50000, 'End-to-end MCP composition retains PostgreSQL values');
    if (process.env.BOREAS_TEST_GEMINI === '1') {
      if (!process.env.GEMINI_API_KEY) console.log('GEMINI_DIAGNOSTIC: missing key; rules fallback is active.');
      else {
        const started = Date.now();
        const gemini = new GeminiClient();
        const diagnosedModel: LLMClient = { generate: async messages => {
          try { return await gemini.generate(messages); }
          catch (error) {
            const failure = error as { name?: string; status?: number; code?: number };
            console.log(JSON.stringify({ diagnostic: 'Gemini provider failure', name: failure.name, status: failure.status, code: failure.code }));
            throw error;
          }
        } };
        const live = await requestDecisionInsights(userId, diagnosedModel, 'Prioriza mis metas y el margen mensual');
        console.log(JSON.stringify({ diagnostic: 'Gemini live composition', model: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash', source: live.source, transport: live.transport, elapsedMs: Date.now() - started }));
      }
    }
  } finally {
    await Promise.allSettled([client.close(), mcpServer.close()]);
    if (inserted) {
      await pool.query('DELETE FROM financial_profiles WHERE user_id=$1', [userId]);
      await pool.query('DELETE FROM users WHERE id=$1', [userId]);
    }
    await pool.end();
  }
  console.log('Radar verification: ' + checks + ' checks passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
