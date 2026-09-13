import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import app from '../app';
import { createGenerateAmortizationScheduleTool } from '../mcp/tools/generate-amortization-schedule.tool';
import { AmortizationService } from '../services/amortization.service';
import { createRecordFinancialMovementTool } from '../mcp/tools/record-financial-movement.tool';
import { FinancialMovementService } from '../services/financial-movement.service';
import { FinancialMovementRepository } from '../repositories/financial-movement.repository';
import { FinancialService } from '../services/financial.service';
import { FinancialProfileRepository } from '../repositories/financial-profile.repository';
import { SavingsGoalService } from '../services/savings-goal.service';
import { SavingsGoalRepository } from '../repositories/savings-goal.repository';

async function main() {
  const legacyId = () => { const id = randomUUID(); return id.slice(0,19) + '1' + id.slice(20); };
  const userId = legacyId(), otherId = randomUUID(), productId = legacyId();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  let checks = 0;
  const contractResponses: unknown[] = [];
  const check = (condition: unknown, name: string) => { assert.ok(condition, name); checks++; console.log('PASS ' + name); };
  let token = '', otherToken = '', sessionId = '';
  async function post(path: string, body: unknown, credential = token) {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(credential ? { Authorization: 'Bearer ' + credential } : {}) }, body: JSON.stringify(body) });
    const responseBody = await response.json() as any;
    if (responseBody.data?.ui?.components) contractResponses.push(responseBody);
    return { status: response.status, body: responseBody };
  }
  const component = (response: any, type: string) => response.body.data.ui.components.find((item: any) => item.type === type);
  const dashboard = (response: any) => component(response, 'financial-dashboard').props;
  const interact = (action: string, payload: any = {}, componentId = 'financial-dashboard', credential = token, session = sessionId) => post('/api/agent/interact', { sessionId: session, componentId, action, payload }, credential);
  async function count(table: string) { return Number((await pool.query('SELECT count(*) FROM ' + table + ' WHERE user_id = $1', [userId])).rows[0].count); }
  try {
    const hash = await bcrypt.hash('BoreasTest!2026', 4);
    for (const id of [userId, otherId]) {
      await pool.query('INSERT INTO users(id,name,email,password_hash) VALUES ($1,$2,$3,$4)', [id, 'Boreas integration test', id + '@boreas.test', hash]);
      await pool.query('INSERT INTO financial_profiles(user_id,monthly_income,monthly_expenses,current_savings,current_debt,credit_score) VALUES ($1,30000,10000,50000,2000,720)', [id]);
    }
    await pool.query("INSERT INTO financial_products(id,name,type,interest_rate,cat,minimum_amount,maximum_amount,minimum_term_months,maximum_term_months) VALUES ($1,'Boreas integration test','MORTGAGE',10.5,12.1,100000,5000000,60,240)", [productId]);
    check((await post('/api/agent/message', { message: 'dashboard' }, '')).status === 401, 'Agent rejects missing JWT');
    check((await post('/mcp', {}, '')).status === 401, 'MCP rejects missing JWT');
    check((await post('/api/savings-goals', { userId }, '')).status === 404, 'Legacy mutation route is not exposed');
    check((await post('/api/auth/login', { email: userId + '@boreas.test', password: 'incorrect' })).status === 401, 'Wrong password rejected');
    token = (await post('/api/auth/login', { email: userId + '@boreas.test', password: 'BoreasTest!2026' })).body.data.token;
    otherToken = (await post('/api/auth/login', { email: otherId + '@boreas.test', password: 'BoreasTest!2026' })).body.data.token;
    check(!!token, 'Login issues JWT');
    let response = await post('/api/agent/message', { message: 'Quiero ver mi dashboard financiero', userId: otherId });
    sessionId = response.body.data.sessionId;
    check(dashboard(response).availableMonthlyCash === 18000, 'Dashboard calculates monthly available');
    const initialRadar = component(response, 'decision-insights').props;
    check(['ai','rules'].includes(initialRadar.source) && initialRadar.transport === 'mcp', 'Initial adaptive radar comes through real MCP with an honest source label');
    check((await pool.query('SELECT user_id FROM agent_sessions WHERE id=$1', [sessionId])).rows[0].user_id === userId, 'JWT subject overrides spoofed browser userId');
    check((await post('/api/agent/message', { message: 'dashboard', sessionId }, otherToken)).status === 404, 'Foreign session rejected on message');
    check((await interact('REFRESH_DASHBOARD', {}, 'dashboard', otherToken)).status === 404, 'Foreign session rejected on interaction');
    check((await post('/api/agent/message', { message: { malformed: true } })).status === 400, 'Malformed message validated');
    response = await post('/api/agent/message', { message: 'Quiero ahorrar para un celular de 12000 y aportar 1000 al mes para 2027-12-01', sessionId });
    const draft = component(response, 'savings-goal-form').props;
    check(draft.targetAmount === 12000 && draft.monthlyContribution === 1000 && draft.targetDate === '2027-12-01', 'Goal draft retains supplied numbers and date');
    check(!component(response, 'mortgage-simulator'), 'Savings goal does not fall into mortgage flow');
    response = await interact('REQUEST_CREATE_SAVINGS_GOAL', { name: 'Celular de prueba', targetAmount: 12000, monthlyContribution: 1000, targetDate: '2027-12-01', category: 'Tecnología', checklist: ['Comparar modelos'] });
    check(await count('savings_goals') === 0, 'Goal request does not persist before confirmation');
    const goalConfirmation = component(response, 'confirmation').id;
    const confirmations = await Promise.all([interact('CONFIRM_CREATE_SAVINGS_GOAL', { targetAmount: 1 }, goalConfirmation), interact('CONFIRM_CREATE_SAVINGS_GOAL', {}, goalConfirmation)]);
    check(confirmations.every(item => item.status === 200) && await count('savings_goals') === 1, 'Concurrent repeated goal confirmation creates exactly one goal');
    const goal = dashboard(confirmations[0]).goals[0];
    check(goal.targetAmount === 12000, 'Confirmation ignores altered client amounts');
    check(component(confirmations[0], 'activity-list') && component(confirmations[0], 'goal-dashboard'), 'Confirmation returns complete dashboard');
    const foreignGoalId = randomUUID();
    await pool.query("INSERT INTO savings_goals(id,user_id,name,target_amount) VALUES ($1,$2,'Foreign test goal',10000)", [foreignGoalId, otherId]);
    check((await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'DEPOSIT', amount: 100, goalId: foreignGoalId })).status === 404 && await count('financial_movements') === 0, 'Foreign goal rejected before any movement is written');
    for (const amount of [0, -1, 0.001]) check((await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'DEPOSIT', amount })).status === 400, 'Invalid movement amount rejected: ' + amount);
    check((await interact('CONFIRM_RECORD_FINANCIAL_MOVEMENT', { type: 'DEPOSIT', amount: 100 }, randomUUID())).status === 409, 'Cannot bypass movement preview with confirm action');
    response = await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'DEPOSIT', amount: 2000, goalId: goal.id, category: 'Test', note: 'Contribution test' });
    check(await count('financial_movements') === 0, 'Contribution stays pending');
    const movementConfirmation = component(response, 'cashflow-alert').id;
    const movementResults = await Promise.all([interact('CONFIRM_RECORD_FINANCIAL_MOVEMENT', {}, movementConfirmation), interact('CONFIRM_RECORD_FINANCIAL_MOVEMENT', { amount: 999 }, movementConfirmation)]);
    check(await count('financial_movements') === 1, 'Concurrent movement confirmation writes once');
    check(dashboard(movementResults[0]).goals[0].currentAmount === 2000 && dashboard(movementResults[0]).currentSavings === 52000, 'Contribution updates goal and savings atomically');
    check(dashboard(movementResults[0]).availableMonthlyCash === 18000, 'Savings deposit does not invent monthly income');
    response = await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'INCOME', amount: 1500 });
    response = await interact('CONFIRM_RECORD_FINANCIAL_MOVEMENT', {}, component(response, 'cashflow-alert').id);
    check(dashboard(response).monthlyIncome === 31500 && dashboard(response).availableMonthlyCash === 19500, 'Income updates monthly cash flow');
    response = await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'EXPENSE', amount: 20000, category: 'Test expense', note: 'Risk preview' });
    let alert = component(response, 'cashflow-alert');
    check(alert.props.projectedAvailable === -500 && alert.props.goalImpacts.length > 0 && !!alert.props.warning, 'Risk preview detects negative cash flow and goal delay');
    check(await count('financial_movements') === 2, 'Risk preview does not persist');
    response = await interact('CANCEL');
    check(!component(response, 'cashflow-alert') && await count('financial_movements') === 2, 'Cancel clears alert without mutation');
    response = await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'EXPENSE', amount: 20000 });
    response = await interact('CONFIRM_RECORD_FINANCIAL_MOVEMENT', {}, component(response, 'cashflow-alert').id);
    check(dashboard(response).monthlyExpenses === 30000 && dashboard(response).availableMonthlyCash === -500 && !component(response, 'cashflow-alert'), 'Confirmed expense updates totals and clears alert');
    const refreshedRadar = component(response, 'decision-insights').props;
    const plannedContributions = dashboard(response).goals.filter((item: any) => item.status === 'ACTIVE').reduce((sum: number, item: any) => sum + (item.monthlyContribution || 0), 0);
    check(refreshedRadar.source === 'rules' && refreshedRadar.signals.find((item: any) => item.id === 'protected-margin').value === dashboard(response).availableMonthlyCash - plannedContributions, 'Financial interaction recomputes protected margin from fresh domain facts');
    response = await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'WITHDRAWAL', amount: 500, goalId: goal.id });
    response = await interact('CONFIRM_RECORD_FINANCIAL_MOVEMENT', {}, component(response, 'cashflow-alert').id);
    check(dashboard(response).currentSavings === 51500 && dashboard(response).availableMonthlyCash === -1000 && dashboard(response).goals[0].currentAmount === 1500, 'Withdrawal updates savings, available and linked goal');
    check((await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'WITHDRAWAL', amount: 999999 })).status === 409, 'Cannot overdraw savings');
    response = await interact('PAUSE_GOAL', { goalId: goal.id });
    response = await interact('CONFIRM_UPDATE_GOAL', {}, component(response, 'confirmation').id);
    check(dashboard(response).goals[0].status === 'PAUSED', 'Goal pause requires confirmation and persists');
    check((await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'DEPOSIT', amount: 100, goalId: goal.id })).status === 409, 'Paused goal blocks contribution');
    response = await interact('RESUME_GOAL', { goalId: goal.id });
    response = await interact('CONFIRM_UPDATE_GOAL', {}, component(response, 'confirmation').id);
    check(dashboard(response).goals[0].status === 'ACTIVE', 'Goal can resume');
    response = await interact('UPDATE_GOAL', { goalId: goal.id, name: 'Celular actualizado', targetAmount: 15000, monthlyContribution: 1200 });
    response = await interact('CONFIRM_UPDATE_GOAL', {}, component(response, 'confirmation').id);
    check(dashboard(response).goals[0].targetAmount === 15000 && dashboard(response).goals[0].monthlyContribution === 1200, 'Goal changes persist after confirmation');
    check((await pool.query('SELECT count(*) FROM goal_audit WHERE user_id=$1', [userId])).rows[0].count > 0, 'Goal audit contains lifecycle and balance changes');
    response = await post('/api/agent/message', { sessionId, message: 'Quiero comprar mi primera casa' });
    check(component(response, 'mortgage-simulator').props.estimatedMonthlyPayment === undefined, 'No invented initial mortgage payment');
    check(component(response, 'credit-options').props.products.some((item: any) => item.id === productId && item.annualRate === 10.5), 'Credit uses real catalog rate in percentage points');
    response = await interact('UPDATE_MORTGAGE_SIMULATION', { productId, propertyValue: 1000000, downPayment: 200000, termMonths: 120 }, 'mortgage-simulator');
    const payment = component(response, 'mortgage-simulator').props.estimatedMonthlyPayment;
    const paymentRows = component(response, 'mortgage-simulator').props.schedule;
    check(paymentRows.length === 120 && paymentRows.every((row: any) => row.principal >= 0 && row.interest >= 0), 'Simulator returns the service amortization table for each month');
    check(paymentRows[paymentRows.length - 1].remainingBalance === 0, 'Amortization chart ends at a paid balance');
    const schedule = await createGenerateAmortizationScheduleTool(new AmortizationService())({ principal: 800000, annualInterestRate: 10.5, termMonths: 120 });
    check(Math.abs(payment - schedule.monthlyPayment) <= 0.01, 'Mortgage payment matches amortization at the catalog rate');
    check((await interact('UPDATE_MORTGAGE_SIMULATION', { productId, propertyValue: 1000000, downPayment: 1000000, termMonths: 120 })).status === 409, 'Mortgage rejects invalid down payment');
    response = await post('/api/agent/message', { sessionId, message: 'Quiero comprar un auto' });
    check(response.body.data.intent === 'CAR_PURCHASE' && !component(response, 'mortgage-simulator') && component(response, 'credit-options').props.products.every((item: any) => item.id !== productId), 'Auto flow does not substitute mortgage catalog');
    response = await post('/api/agent/message', { sessionId, message: 'Quiero tener un perro' });
    check(response.body.data.intent === 'GENERAL_GOAL' && !component(response, 'savings-goal-form').props.targetAmount, 'Generic goal does not invent a budget');
    response = await interact('RECORD_FINANCIAL_MOVEMENT', { type: 'INCOME', amount: 50, occurredAt: '2020-01-01T12:00:00Z' });
    response = await interact('CONFIRM_RECORD_FINANCIAL_MOVEMENT', {}, component(response, 'cashflow-alert').id);
    check(dashboard(response).monthlyIncome === 31500, 'Historical income is excluded from current month');
    const recordTool = createRecordFinancialMovementTool(new FinancialMovementService(new FinancialMovementRepository(), new FinancialService(new FinancialProfileRepository()), new SavingsGoalService(new SavingsGoalRepository())));
    await assert.rejects(() => recordTool({ userId, type: 'INCOME', amount: 0 }));
    check(true, 'Direct MCP/domain tool validates Zod input');
    const mcp = await fetch(base + '/mcp', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }) });
    const registered = (await mcp.json() as any).result.tools.map((tool: any) => tool.name);
    check(['getFinancialProfile','getFinancialDashboard','getMortgageProducts','simulateMortgage','generateAmortizationSchedule','recordFinancialMovement','createSavingsGoal','analyzeRefinancing'].every(name => registered.includes(name)), 'All eight priority MCP tools are registered');
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/contract-fixtures.json', JSON.stringify(contractResponses, null, 2));
    console.log('Completed ' + checks + ' integration checks against PostgreSQL.');
  } finally {
    // Only remove random test fixtures created by this run; never touch the demo user.
    try {
    await pool.query('DELETE FROM goal_audit WHERE user_id = ANY($1::uuid[])', [[userId, otherId]]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[userId, otherId]]);
    await pool.query('DELETE FROM financial_products WHERE id = $1', [productId]);
    } finally {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
      await pool.end();
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
