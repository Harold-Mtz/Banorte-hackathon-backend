import { IAgentService } from '../interfaces/agent-service.interface';
import { IFinancialService } from '../interfaces/financial-service.interface';
import { AgentRequestDTO } from '../dtos/agent-request.dto';
import { AgentResponse } from '../responses/agent-response';
import { randomUUID } from 'crypto';
import { LLMClient } from '../ai/llm-client.interface';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { AgentInteractionDTO } from '../dtos/agent-interaction.dto';
import { SavingsGoalService } from './savings-goal.service';
import { createGetFinancialProfileTool } from '../mcp/tools/get-financial-profile.tool';
import { createGetMortgageProductsTool } from '../mcp/tools/get-mortgage-products.tool';
import { FinancialProductService } from './financial-product.service';
import { FinancialMovementService } from './financial-movement.service';
import { createGetFinancialDashboardTool } from '../mcp/tools/get-financial-dashboard.tool';
import { createRecordFinancialMovementTool } from '../mcp/tools/record-financial-movement.tool';

export class AgentService implements IAgentService {

  constructor(
    private readonly financialService: IFinancialService,
    private readonly llm: LLMClient,
    private readonly sessionRepository: AgentSessionRepository,
    private readonly savingsGoalService: SavingsGoalService,
    financialProductService: FinancialProductService,
    financialMovementService: FinancialMovementService
  ) {
    this.getFinancialProfileTool = createGetFinancialProfileTool(financialService);
    this.getMortgageProductsTool = createGetMortgageProductsTool(financialProductService);
    this.getFinancialDashboardTool = createGetFinancialDashboardTool(financialMovementService);
    this.recordFinancialMovementTool = createRecordFinancialMovementTool(financialMovementService);
  }

  private readonly getFinancialProfileTool: ReturnType<typeof createGetFinancialProfileTool>;
  private readonly getMortgageProductsTool: ReturnType<typeof createGetMortgageProductsTool>;
  private readonly getFinancialDashboardTool: ReturnType<typeof createGetFinancialDashboardTool>;
  private readonly recordFinancialMovementTool: ReturnType<typeof createRecordFinancialMovementTool>;

  
  async processMessage(
  data: AgentRequestDTO
): Promise<AgentResponse> {

  let intent = 'UNKNOWN';
  const localIntent = this.classifyIntentLocally(data.message);

  try {
    const intentResponse = await this.llm.generate([
      {
        role: 'system',
        content: `
You are an intent classifier for a banking application.

Allowed values:

FIRST_HOME
CAR_PURCHASE
SAVINGS_GOAL
MARRIAGE
CHILD
EDUCATION
TRAVEL
UNKNOWN

Return ONLY one value.
        `
      },
      {
        role: 'user',
        content: data.message
      }
    ]);

        intent = intentResponse.trim().toUpperCase();
        if (localIntent === 'SAVINGS_GOAL') intent = localIntent;
        if (intent === 'UNKNOWN') {
          intent = localIntent;
        }
  } catch (error) {
    console.error('LLM intent classification failed:', error);
    intent = this.classifyIntentLocally(data.message);
  }

  const dashboard = await this.getFinancialDashboardTool({ userId: data.userId });
  const financialProfile = await this.getFinancialProfileTool({ userId: data.userId });

  const sessionId = await this.ensureSession(data.userId, data.sessionId, intent);
  const availableMonthlyCash = Number(dashboard.availableMonthlyCash);
  const mortgageProducts = intent === 'FIRST_HOME' ? await this.getMortgageProductsTool() : [];
  if (intent === 'SAVINGS_GOAL') {
    return {
      sessionId,
      message: 'Qué bien. Vamos a aterrizarlo en un plan posible para ti.',
      intent,
      ui: {
        version: '1.0',
        screen: { title: 'Tu meta de ahorro', subtitle: 'Convierte una intención en un plan claro' },
        components: [...this.dashboardComponents(dashboard), {
          id: 'savings-goal-1',
          type: 'savings-goal-form',
          title: 'Dale forma a tu meta',
          description: 'Boreas convierte una intención en un plan que sí puedes seguir.',
          props: {
            targetAmount: Math.max(20000, Math.round(financialProfile.currentSavings * 0.67)),
            targetDate: '2027-06-01',
            initialAmount: 0,
            suggestedMonthlyContribution: Math.max(1000, Math.round(availableMonthlyCash * 0.25)),
            lifeEvent: 'Meta Boreas'
          }
        }]
      }
    };
  }
  if (intent !== 'FIRST_HOME') {
    return { sessionId, message: 'Ya tengo tu panorama financiero. Aquí puedes seguir tu flujo y tus metas.', intent, ui: { version: '1.0', screen: { title: 'Tu panorama financiero' }, components: this.dashboardComponents(dashboard) } };
  }
  const propertyValue = Math.max(1000000, Math.round(availableMonthlyCash * 120));
  const downPayment = Math.min(financialProfile.currentSavings, Math.round(propertyValue * 0.4));

  return {
    sessionId,

    message:
      'Analicé tu situación financiera y preparé una experiencia para ayudarte.',

    intent,

    ui: {
      version: '1.0',

      screen: {
        title:
          intent === 'FIRST_HOME'
            ? 'Tu primera casa'
            : 'Tu experiencia financiera',

        subtitle:
          'Explora tu situación financiera y simula opciones'
      },

      components: [
        ...this.dashboardComponents(dashboard),
        {
          id: 'financial-summary-1',

          type: 'financial-summary',

          title: 'Tu panorama financiero',

          props: {
            monthlyIncome:
              financialProfile.monthlyIncome,

            monthlyExpenses:
              financialProfile.monthlyExpenses,

            currentSavings: financialProfile.currentSavings,
            currentDebt: financialProfile.currentDebt,
            availableMonthlyCash
          }
        },

        {
          id: 'mortgage-simulator-1',

          type: 'mortgage-simulator',

          title: 'Simula tu mensualidad',

          props: {
            propertyValue,

            downPayment:
              financialProfile.currentSavings,

            termMonths: 240,
            estimatedMonthlyPayment: Math.round((propertyValue - downPayment) * 0.0101)
          },

          actions: [
            {
              id: 'update-simulation',

              type:
                'UPDATE_DOWN_PAYMENT',

              label:
                'Actualizar simulación'
            }
          ]
        },
        ...mortgageProducts.map((product, index) => ({ id: `mortgage-product-${index}`, type: 'product-comparison' as const, title: 'Opciones hipotecarias disponibles', props: { products: [{ id: product.id, name: product.name, annualRate: product.interestRate, cat: product.cat, maxTermMonths: product.maximumTermMonths, description: product.description, highlighted: index === 0 }] } }))
      ]
    }
  };
}

  private dashboardComponents(dashboard: Record<string, unknown>) {
    const goals = Array.isArray(dashboard.goals) ? dashboard.goals : [];
    const movements = Array.isArray(dashboard.movements) ? dashboard.movements : [];
    return [
      { id: 'financial-dashboard-1', type: 'financial-dashboard' as const, title: 'Tu tablero financiero', props: dashboard },
      { id: 'goal-dashboard-1', type: 'goal-dashboard' as const, title: 'Tus metas en marcha', props: { goals } },
      { id: 'activity-list-1', type: 'activity-list' as const, title: 'Actividad reciente', props: { movements } }
    ];
  }

  async processInteraction(
    data: AgentInteractionDTO & { userId: string }
  ): Promise<AgentResponse> {
    const session = await this.sessionRepository.findById(data.sessionId);
    if (!session || session.userId !== data.userId) throw new Error('AGENT_SESSION_NOT_FOUND');

    if (data.action === 'UPDATE_MORTGAGE_SIMULATION') {
      const propertyValue = Number(data.payload?.propertyValue) || 0;
      const downPayment = Number(data.payload?.downPayment) || 0;
      const termMonths = Number(data.payload?.termMonths) || 240;
      return { sessionId: session.id, intent: session.currentIntent ?? 'FIRST_HOME', message: 'Actualicé tu escenario con los valores que elegiste.', ui: { version: '1.0', screen: { title: 'Tu primera casa', subtitle: 'Explora tu situación financiera y simula opciones' }, components: [{ id: data.componentId, type: 'mortgage-simulator', title: 'Simula tu mensualidad', props: { propertyValue, downPayment, termMonths, estimatedMonthlyPayment: Math.round((propertyValue - downPayment) * 0.0101) } }] } };
    }

    if (data.action === 'RECORD_FINANCIAL_MOVEMENT' || data.action === 'CONFIRM_RECORD_FINANCIAL_MOVEMENT') {
      const result = await this.recordFinancialMovementTool({ userId: data.userId, goalId: typeof data.payload?.goalId === 'string' ? data.payload.goalId : undefined, type: data.payload?.type as 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE' | 'INCOME', amount: Number(data.payload?.amount), category: typeof data.payload?.category === 'string' ? data.payload.category : undefined, note: typeof data.payload?.note === 'string' ? data.payload.note : undefined, confirm: data.action === 'CONFIRM_RECORD_FINANCIAL_MOVEMENT' });
      const dashboard = await this.getFinancialDashboardTool({ userId: data.userId });
      const impactComponent = result.impact.warning && data.action === 'RECORD_FINANCIAL_MOVEMENT' ? [{ id: 'cashflow-alert-1', type: 'cashflow-alert' as const, title: 'Revisa el impacto de este movimiento', props: { ...result.impact, pendingPayload: data.payload } }] : [];
      return { sessionId: session.id, intent: session.currentIntent ?? 'GENERAL', message: data.action === 'RECORD_FINANCIAL_MOVEMENT' && result.impact.warning ? String(result.impact.warning) : 'Movimiento registrado y tablero actualizado.', ui: { version: '1.0', screen: { title: 'Tu tablero financiero' }, components: [...this.dashboardComponents(dashboard), ...impactComponent] } };
    }

    if (data.action === 'REQUEST_CREATE_SAVINGS_GOAL') return { sessionId: session.id, intent: 'SAVINGS_GOAL', message: 'Tu plan está listo para confirmarse.', ui: { version: '1.0', screen: { title: 'Tu meta de ahorro' }, components: [{ id: 'confirmation-1', type: 'confirmation', title: '¿Guardamos esta meta?', props: { message: 'Revisa tu meta y confirma para continuar.', confirmLabel: 'Sí, crear meta', cancelLabel: 'Ajustar plan', ...data.payload } }] } };
    if (data.action === 'CONFIRM_CREATE_SAVINGS_GOAL') {
      const goal = await this.savingsGoalService.create({ userId: data.userId, name: String(data.payload?.lifeEvent || 'Meta Boreas'), targetAmount: Number(data.payload?.targetAmount) || 0, currentAmount: Number(data.payload?.initialAmount) || 0, monthlyContribution: Number(data.payload?.monthlyContribution) || undefined, targetDate: data.payload?.targetDate ? String(data.payload.targetDate) : undefined });
      return { sessionId: session.id, intent: 'SAVINGS_GOAL', message: 'Tu meta está lista para comenzar.', ui: { version: '1.0', screen: { title: 'Tu meta de ahorro' }, components: [{ id: 'goal-progress-1', type: 'goal-progress', title: 'Tu meta ya está en marcha', props: { targetAmount: goal.targetAmount, currentAmount: goal.currentAmount, monthlyContribution: goal.monthlyContribution, targetDate: goal.targetDate } }] } };
    }
    return this.processMessage({ userId: data.userId, sessionId: data.sessionId, message: 'Quiero continuar con mi plan' });
  }

  private async ensureSession(userId: string, sessionId: string | undefined, intent: string): Promise<string> {
    if (sessionId) {
      const existing = await this.sessionRepository.findById(sessionId);
      if (existing && existing.userId === userId) return existing.id;
    }
    const session = await this.sessionRepository.create(userId, undefined, intent);
    return session.id;
  }

  private classifyIntentLocally(message: string): string {
    const normalizedMessage = message.toLowerCase();

    if (/(ahorr|ahorro|fondo|guardar dinero|crear (una )?meta)/.test(normalizedMessage)) {
      return 'SAVINGS_GOAL';
    }

    if (/(auto|coche|carro|vehículo|vehiculo)/.test(normalizedMessage)) {
      return 'CAR_PURCHASE';
    }

    if (/(casa|vivienda|hipoteca|hogar)/.test(normalizedMessage)) {
      return 'FIRST_HOME';
    }

    if (/(boda|casarme|matrimonio)/.test(normalizedMessage)) {
      return 'MARRIAGE';
    }

    if (/(hijo|bebé|bebe|niño|nino)/.test(normalizedMessage)) {
      return 'CHILD';
    }

    if (/(estudi|universidad|educación|educacion)/.test(normalizedMessage)) {
      return 'EDUCATION';
    }

    if (/(viaje|viajar|vacaciones)/.test(normalizedMessage)) {
      return 'TRAVEL';
    }

    return 'UNKNOWN';
  }
}