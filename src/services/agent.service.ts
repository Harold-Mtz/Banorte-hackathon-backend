import { randomUUID } from 'crypto';
import { isDeepStrictEqual } from 'node:util';
import { IAgentService } from '../interfaces/agent-service.interface';
import { IFinancialService } from '../interfaces/financial-service.interface';
import { AgentRequestDTO } from '../dtos/agent-request.dto';
import { AgentResponse } from '../responses/agent-response';
import { AgentInteractionDTO } from '../dtos/agent-interaction.dto';
import { LLMClient } from '../ai/llm-client.interface';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import { InteractionRepository } from '../repositories/interaction.repository';
import { SavingsGoalService } from './savings-goal.service';
import { FinancialProductService } from './financial-product.service';
import { FinancialMovementService } from './financial-movement.service';
import { MortgageService } from './mortgage.service';
import { MortgageSimulationRepository } from '../repositories/mortgage-simulation.repository';
import { FinancialProductRepository } from '../repositories/financial-product.repository';
import { createGetFinancialDashboardTool } from '../mcp/tools/get-financial-dashboard.tool';
import { createRecordFinancialMovementTool } from '../mcp/tools/record-financial-movement.tool';
import { createSavingsGoalTool } from '../mcp/tools/create-savings-goal-tool';
import { createGoalManagementTool } from '../mcp/tools/goal-management.tool';
import { createGetCreditProductsTool } from '../mcp/tools/get-credit-products.tool';
import { createSimulateMortgageTool } from '../mcp/tools/simulate-mortgage.tool';
import { goalPlanSchema, movementSchema } from '../domain/validation';
import { withUserTransaction } from '../config/database';
import { UIComponent } from '../types/ui/ui-component.type';
import { AgentSession } from '../models/agent-session.model';
import { DecisionInsightsService, DecisionInsights } from './decision-insights.service';
import { requestDecisionInsights } from '../mcp/decision-insights.client';
import { AmortizationService } from './amortization.service';
import { createGenerateAmortizationScheduleTool } from '../mcp/tools/generate-amortization-schedule.tool';

type Pending = { id: string; action: string; payload: Record<string, unknown>; impact?: Record<string, unknown>; createdAt: string };
const currency = (value: unknown) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value));
export class AgentService implements IAgentService {
  private readonly dashboard;
  private readonly movement;
  private readonly createGoal;
  private readonly manageGoal;
  private readonly products;
  private readonly simulate;
  private readonly decisionInsights;
  private readonly amortization = createGenerateAmortizationScheduleTool(new AmortizationService());
  private readonly messages = new AgentMessageRepository();
  private readonly interactions = new InteractionRepository();

  constructor(financialService: IFinancialService, private readonly llm: LLMClient,
    private readonly sessions: AgentSessionRepository, private readonly goals: SavingsGoalService,
    products: FinancialProductService, movements: FinancialMovementService) {
    this.dashboard = createGetFinancialDashboardTool(movements);
    this.decisionInsights = new DecisionInsightsService(movements);
    this.movement = createRecordFinancialMovementTool(movements);
    this.createGoal = createSavingsGoalTool(goals);
    this.manageGoal = createGoalManagementTool(goals);
    this.products = createGetCreditProductsTool(products);
    this.simulate = createSimulateMortgageTool(new MortgageService(new MortgageSimulationRepository(), new FinancialProductRepository(), financialService));
  }

  async processMessage(data: AgentRequestDTO): Promise<AgentResponse> {
    if (data.sessionId) await this.ownedSession(data.userId, data.sessionId);
    const intent = await this.resolveIntent(data.message);
    // MCP/Gemini finish before taking the transaction lock used for session writes.
    // If transport fails, respond() computes the explicit rules fallback from current facts.
    let insights: DecisionInsights | undefined;
    try { insights = await requestDecisionInsights(data.userId, this.llm, data.message); } catch { /* domain fallback */ }
    return withUserTransaction(data.userId, async () => {
      const session = data.sessionId ? await this.ownedSession(data.userId, data.sessionId) : await this.sessions.create(data.userId, undefined, intent);
      await this.messages.create(session.id, 'USER', data.message);
      await this.sessions.updateIntent(session.id, intent);
      session.currentIntent = intent;
      const normalized = data.message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let extras: UIComponent[] = [];
      let message = 'Tu tablero está actualizado con tus datos y movimientos registrados.';
      if (intent === 'SAVINGS_GOAL' || intent === 'GENERAL_GOAL') {
        const existing = session.context.draft as Record<string, unknown> | undefined;
        const draft = this.goalDraft(data.message, /quiero|nueva meta|otro objetivo/i.test(data.message) ? undefined : existing);
        session.context.draft = draft;
        extras = [{ id: 'savings-goal-form', type: 'savings-goal-form', title: 'Dale forma a tu meta', props: draft }];
        message = 'Completa el monto, la fecha y la aportación que quieres destinar. Revisaremos el plan antes de guardarlo.';
      } else if (intent === 'FIRST_HOME' || intent === 'CREDIT_OPTIONS' || intent === 'CAR_PURCHASE') {
        const type = intent === 'FIRST_HOME' ? 'MORTGAGE' : intent === 'CAR_PURCHASE' || /auto|coche|carro/.test(normalized) ? 'AUTO_LOAN' : undefined;
        session.context.creditType = type ?? null;
        extras = await this.creditComponents(type);
        message = 'Consulta las condiciones del catálogo. Las simulaciones son estimaciones y no representan una aprobación.';
        if (type === 'MORTGAGE') {
          const products = await this.products({ type });
          if (products.length) extras.push({ id: 'mortgage-simulator', type: 'mortgage-simulator', title: 'Simulación hipotecaria estimada', props: { products: products.map(product => this.productData(product)) } });
        }
      }
      session.context.extras = extras;
      await this.sessions.updateContext(session.id, session.context);
      return this.respond(session, message, insights);
    });
  }

  async processInteraction(data: AgentInteractionDTO & { userId: string }): Promise<AgentResponse> {
    return withUserTransaction(data.userId, async () => {
      const session = await this.ownedSession(data.userId, data.sessionId);
      const payload = data.payload ?? {};
      const receipts = (session.context.receipts ?? {}) as Record<string, string>;
      if (data.action.startsWith('CONFIRM_') && receipts[data.componentId] === data.action) {
        return this.respond(session, 'Esta operación ya fue registrada. No se volvió a aplicar.');
      }
      await this.interactions.create(session.id, data.componentId, data.action, payload);
      let message = 'Tu tablero está actualizado.';
      switch (data.action) {
        case 'REFRESH_DASHBOARD': break;
        case 'REQUEST_CREDIT_OPTIONS':
          session.context.extras = await this.creditComponents();
          message = 'Opciones del catálogo para explorar, sujetas a evaluación.';
          break;
        case 'SELECT_GOAL': {
          const goal = await this.goals.getById(String(payload.goalId));
          if (!goal || goal.userId !== data.userId || goal.status === 'DELETED') throw new Error('SAVINGS_GOAL_NOT_FOUND');
          session.context.selectedGoalId = goal.id;
          message = 'Meta seleccionada: ' + goal.name;
          break;
        }
        case 'REQUEST_CREATE_SAVINGS_GOAL': {
          const plan = goalPlanSchema.parse(payload);
          this.setPending(session, 'CONFIRM_CREATE_SAVINGS_GOAL', plan);
          session.context.draft = plan;
          message = 'Revisa los datos de la meta antes de crearla.';
          break;
        }
        case 'RECORD_FINANCIAL_MOVEMENT': {
          const movement = movementSchema.parse({ ...payload, userId: data.userId, confirm: false });
          const result = await this.movement(movement);
          this.setPending(session, 'CONFIRM_RECORD_FINANCIAL_MOVEMENT', movement, result.impact);
          message = result.impact.warning ?? 'Revisa el movimiento antes de registrarlo.';
          break;
        }
        case 'UPDATE_GOAL':
        case 'PAUSE_GOAL':
        case 'RESUME_GOAL':
        case 'CANCEL_GOAL':
        case 'ARCHIVE_GOAL':
        case 'DELETE_GOAL': {
          const goal = await this.goals.getById(String(payload.goalId));
          if (!goal || goal.userId !== data.userId || goal.status === 'DELETED') throw new Error('SAVINGS_GOAL_NOT_FOUND');
          const statuses: Record<string, string> = { PAUSE_GOAL: 'PAUSED', RESUME_GOAL: 'ACTIVE', CANCEL_GOAL: 'CANCELLED', ARCHIVE_GOAL: 'ARCHIVED', DELETE_GOAL: 'DELETED' };
          const changes = data.action === 'UPDATE_GOAL' ? goalPlanSchema.partial().parse(payload) : { status: statuses[data.action] };
          this.setPending(session, 'CONFIRM_UPDATE_GOAL', { goalId: goal.id, name: goal.name, changes });
          message = 'Confirma el cambio de tu meta. Su historial se conservará.';
          break;
        }
        case 'CONFIRM_CREATE_SAVINGS_GOAL':
        case 'CONFIRM_RECORD_FINANCIAL_MOVEMENT':
        case 'CONFIRM_UPDATE_GOAL': {
          const pending = session.context.pending as Pending | undefined;
          if (!pending || pending.id !== data.componentId || pending.action !== data.action) throw new Error('CONFIRMATION_NOT_FOUND');
          if (Date.now() - Date.parse(pending.createdAt) > 15 * 60 * 1000) throw new Error('CONFIRMATION_EXPIRED');
          // Financial values always come from the stored preview, never from a confirm request.
          if (data.action === 'CONFIRM_CREATE_SAVINGS_GOAL') {
            const plan = goalPlanSchema.parse(pending.payload);
            const goal = await this.createGoal({ ...plan, userId: data.userId });
            await this.manageGoal({ userId: data.userId, goalId: goal.id, changes: { metadata: { category: plan.category, checklist: plan.checklist } } });
            session.context.selectedGoalId = goal.id;
            session.context.extras = [];
            delete session.context.draft;
            message = 'Meta creada. Puedes registrar tu primera aportación.';
          } else if (data.action === 'CONFIRM_RECORD_FINANCIAL_MOVEMENT') {
            const movement = movementSchema.parse({ ...pending.payload, userId: data.userId, confirm: false });
            const preview = await this.movement(movement);
            if (!isDeepStrictEqual(JSON.parse(JSON.stringify(preview.impact)), pending.impact)) {
              this.setPending(session, data.action, movement, preview.impact);
              await this.sessions.updateContext(session.id, session.context);
              return this.respond(session, 'Tu situación cambió desde la vista previa. Revisa el impacto actualizado y confirma otra vez.');
            }
            const result = await this.movement({ ...movement, confirm: true });
            message = 'Movimiento de ' + currency(result.movement?.amount) + ' registrado. El tablero refleja la operación.';
          } else {
            await this.manageGoal({ userId: data.userId, goalId: String(pending.payload.goalId), changes: pending.payload.changes as never });
            message = 'Meta actualizada. Conservamos su historial.';
          }
          receipts[pending.id] = pending.action;
          session.context.receipts = Object.fromEntries(Object.entries(receipts).slice(-50));
          delete session.context.pending;
          break;
        }
        case 'UPDATE_MORTGAGE_SIMULATION': {
          const simulation = await this.simulate({ userId: data.userId, financialProductId: String(payload.productId), propertyValue: Number(payload.propertyValue), downPayment: Number(payload.downPayment), termMonths: Number(payload.termMonths) });
          const amortization = await this.amortization({ principal: simulation.loanAmount, annualInterestRate: simulation.annualInterestRate, termMonths: simulation.termMonths });
          const products = await this.products({ type: 'MORTGAGE' });
          session.context.extras = [...await this.creditComponents('MORTGAGE'), { id: 'mortgage-simulator', type: 'mortgage-simulator', title: 'Simulación hipotecaria estimada', props: { ...simulation, productId: payload.productId, products: products.map(product => this.productData(product)), annualRate: simulation.annualInterestRate, estimatedMonthlyPayment: simulation.monthlyPayment, schedule: amortization.schedule, estimated: true } }];
          message = 'Simulación calculada con la tasa del producto seleccionado. No es una aprobación de crédito.';
          break;
        }
        case 'CANCEL':
          delete session.context.pending;
          message = 'Operación cancelada. No se registró ningún cambio financiero.';
          if (session.context.draft) session.context.extras = [{ id: 'savings-goal-form', type: 'savings-goal-form', title: 'Ajusta tu meta', props: session.context.draft }];
          break;
        default: throw new Error('UNKNOWN_ACTION');
      }
      await this.sessions.updateContext(session.id, session.context);
      return this.respond(session, message);
    });
  }

  private setPending(session: AgentSession, action: string, payload: Record<string, unknown>, impact?: Record<string, unknown>) {
    session.context.pending = { id: randomUUID(), action, payload, impact, createdAt: new Date().toISOString() };
  }

  private async respond(session: AgentSession, message: string, insights?: DecisionInsights): Promise<AgentResponse> {
    const dashboard = await this.dashboard({ userId: session.userId });
    const components: UIComponent[] = [
      { id: 'decision-insights', type: 'decision-insights', title: 'Radar Boreas', props: { ...this.decisionInsights.fromDashboard(dashboard, insights) } },
      { id: 'financial-dashboard', type: 'financial-dashboard', title: 'Tu tablero financiero', props: { ...dashboard, selectedGoalId: session.context.selectedGoalId } },
      { id: 'goal-dashboard', type: 'goal-dashboard', title: 'Tus metas', props: { goals: dashboard.goals, selectedGoalId: session.context.selectedGoalId } },
      { id: 'activity-list', type: 'activity-list', title: 'Actividad reciente', props: { movements: dashboard.movements } },
      ...((session.context.extras ?? []) as UIComponent[])
    ];
    if (!components.some(component => component.type === 'credit-options')) components.push(...await this.creditComponents());
    const pending = session.context.pending as Pending | undefined;
    if (pending) {
      const movement = pending.action === 'CONFIRM_RECORD_FINANCIAL_MOVEMENT';
      components.unshift({
        id: pending.id, type: movement ? 'cashflow-alert' : 'confirmation',
        title: movement ? 'Confirma tu movimiento' : 'Revisa y confirma',
        props: { ...pending.payload, ...pending.impact, action: pending.action, message: movement ? 'Movimiento pendiente de confirmación.' : pending.action === 'CONFIRM_CREATE_SAVINGS_GOAL' ? 'Crear meta: ' + pending.payload.name : 'Actualizar meta: ' + pending.payload.name, confirmLabel: 'Confirmar', cancelLabel: 'Cancelar' }
      });
    }
    await this.messages.create(session.id, 'ASSISTANT', message);
    return { sessionId: session.id, intent: session.currentIntent ?? 'DASHBOARD', message, ui: { version: '1.0', screen: { title: 'Banorte Boreas' }, components } };
  }

  private async ownedSession(userId: string, id: string) {
    const session = await this.sessions.findById(id);
    if (!session || session.userId !== userId) throw new Error('AGENT_SESSION_NOT_FOUND');
    return session;
  }

  private productData(product: Awaited<ReturnType<typeof this.products>>[number]) {
    return { id: product.id, name: product.name, description: product.description, annualRate: product.interestRate, cat: product.cat, minimumAmount: product.minimumAmount, maximumAmount: product.maximumAmount, minTermMonths: product.minimumTermMonths, maxTermMonths: product.maximumTermMonths, estimated: true };
  }
  private async creditComponents(type?: 'MORTGAGE' | 'AUTO_LOAN' | 'PERSONAL_LOAN'): Promise<UIComponent[]> {
    const products = await this.products({ type });
    return [{ id: 'credit-options', type: 'credit-options', title: 'Crédito para explorar', description: products.length ? 'Condiciones del catálogo; sujeto a evaluación.' : 'No hay productos activos para esta categoría en el catálogo.', props: { products: products.map(product => this.productData(product)) } }];
  }
  private classify(message: string) {
    const text = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/dashboard|tablero|panorama|organizar.*finanzas|ver.*(metas|movimientos|finanzas)/.test(text)) return 'DASHBOARD';
    if (/ahorr|fondo|guardar dinero|crear.*meta/.test(text) && !/credito|prestamo|financia/.test(text)) return 'SAVINGS_GOAL';
    if (/casa|vivienda|hipoteca|inmueble/.test(text)) return 'FIRST_HOME';
    if (/credito|prestamo|financia/.test(text)) return 'CREDIT_OPTIONS';
    if (/comprar.*(auto|coche|carro)/.test(text)) return 'CAR_PURCHASE';
    return 'GENERAL_GOAL';
  }

  private async resolveIntent(message: string) {
    const local = this.classify(message);
    // Explicit savings/credit language takes precedence over model classification.
    if (local !== 'GENERAL_GOAL' || /perro|mascota|gato|celular|computadora|laptop|mudanza|viaje|salud|estudios|boda|negocio/i.test(message)) return local;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const intent = await Promise.race([
        this.llm.generate([
          { role: 'system', content: 'Classify the financial request. Return ONLY GENERAL_GOAL, SAVINGS_GOAL or DASHBOARD. Generic life goals such as pets, phones, moving, travel or health are GENERAL_GOAL. Never provide financial amounts, HTML, recommendations or approvals.' },
          { role: 'user', content: message }
        ]),
        new Promise<string>(resolve => { timer = setTimeout(() => resolve(local), 2500); })
      ]);
      const normalized = intent.trim().toUpperCase();
      return ['GENERAL_GOAL', 'SAVINGS_GOAL', 'DASHBOARD'].includes(normalized) ? normalized : local;
    } catch {
      return local;
    } finally { if (timer) clearTimeout(timer); }
  }
  private goalDraft(message: string, previous?: Record<string, unknown>): Record<string, unknown> {
    const amount = (raw: string) => Number(raw.replace(/,/g, ''));
    const monthly = message.match(/(?:aportar|aportacion(?: mensual)?|mensualmente)\s*(?:de\s*)?\$?\s*([\d,]+(?:\.\d{1,2})?)/i) ?? message.match(/\$?([\d,]+(?:\.\d{1,2})?)\s*(?:al mes|mensuales)/i);
    const targetSource = monthly ? message.replace(monthly[0], '') : message;
    const target = targetSource.match(/(?:meta de|reunir|ahorrar|juntar|cuesta|necesito|por|de)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i) ?? targetSource.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
    const targetDate = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
    const category = /perro|mascota|gato/i.test(message) ? 'Mascota' : /celular|computadora|laptop/i.test(message) ? 'Tecnología' : /viaj|vacacion/i.test(message) ? 'Viaje' : 'Personal';
    const checklist = category === 'Mascota' ? ['Investigar adopción y cuidados', 'Cotizar veterinario y alimento', 'Separar un fondo para imprevistos'] : category === 'Tecnología' ? ['Comparar modelos y precios', 'Revisar garantía y costo total', 'Definir fecha de compra'] : ['Confirmar el costo total', 'Definir aportaciones sostenibles', 'Revisar el avance cada mes'];
    const nameMatch = /para\s+(?!20\d{2}-)(.+?)(?:\s+(?:de|por)\s+\$?\d|,|\.|$)/i.exec(message)
      ?? /quiero\s+(.+?)(?:\s+(?:de|por)\s+\$?\d|,|\.|$)/i.exec(message);
    const name = /^(crear (una )?meta( de ahorro)?|empezar a ahorrar)$/i.test(nameMatch?.[1] ?? '') ? undefined : nameMatch?.[1]?.slice(0, 150);
    return { ...(previous ?? {}), ...(name ? { name } : {}), ...(target ? { targetAmount: amount(target[1]) } : {}), ...(monthly ? { monthlyContribution: amount(monthly[1]) } : {}), ...(targetDate ? { targetDate } : {}), category, checklist };
  }
}
