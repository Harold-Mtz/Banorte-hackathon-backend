import { IAgentService } from '../interfaces/agent-service.interface';
import { IFinancialService } from '../interfaces/financial-service.interface';
import { AgentRequestDTO } from '../dtos/agent-request.dto';
import { AgentResponse } from '../responses/agent-response';
import { randomUUID } from 'crypto';
import { LLMClient } from '../ai/llm-client.interface';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { AgentInteractionDTO } from '../dtos/agent-interaction.dto';
import { SavingsGoalService } from './savings-goal.service';

export class AgentService implements IAgentService {

  constructor(
    private readonly financialService: IFinancialService,
    private readonly llm: LLMClient,
    private readonly sessionRepository: AgentSessionRepository,
    private readonly savingsGoalService: SavingsGoalService
  ) {}

  
  async processMessage(
  data: AgentRequestDTO
): Promise<AgentResponse> {

  let intent = 'UNKNOWN';

  try {
    const intentResponse = await this.llm.generate([
      {
        role: 'system',
        content: `
You are an intent classifier for a banking application.

Allowed values:

FIRST_HOME
CAR_PURCHASE
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
  } catch (error) {
    console.error('LLM intent classification failed:', error);
    intent = this.classifyIntentLocally(data.message);
  }

  const financialProfile =
    await this.financialService.getProfile(
      data.userId
    );

  if (!financialProfile) {
    throw new Error(
      'Financial profile not found'
    );
  }

  const sessionId = await this.ensureSession(data.userId, data.sessionId, intent);
  const availableMonthlyCash = financialProfile.monthlyIncome - financialProfile.monthlyExpenses - financialProfile.currentDebt;
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
        {
          id: 'financial-summary-1',

          type: 'financial-summary',

          title: 'Tu panorama financiero',

          props: {
            monthlyIncome:
              financialProfile.monthlyIncome,

            monthlyExpenses:
              financialProfile.monthlyExpenses,

            currentSavings:
              financialProfile.currentSavings,

            currentDebt:
              financialProfile.currentDebt
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
        }
      ]
    }
  };
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