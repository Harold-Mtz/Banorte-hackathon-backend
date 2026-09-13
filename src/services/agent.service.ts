import { IAgentService } from '../interfaces/agent-service.interface';
import { IFinancialService } from '../interfaces/financial-service.interface';
import { AgentRequestDTO } from '../dtos/agent-request.dto';
import { AgentResponse } from '../responses/agent-response';
import { randomUUID } from 'crypto';
import { LLMClient } from '../ai/llm-client.interface';

export class AgentService implements IAgentService {

  constructor(
    private readonly financialService: IFinancialService,
    private readonly llm: LLMClient
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

  return {
    sessionId:
      data.sessionId ?? randomUUID(),

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

          props: {
            propertyValue: 1800000,

            downPayment:
              financialProfile.currentSavings,

            termMonths: 240
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