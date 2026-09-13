import { randomUUID } from 'crypto';

import { IAgentService } from '../interfaces/agent-service.interface';
import { IFinancialService } from '../interfaces/financial-service.interface';
import { ILifeEventService } from '../interfaces/life-event-service.interface';

import { AgentRequestDTO } from '../dtos/agent-request.dto';

import {
  AgentIntent,
  AgentResponse
} from '../responses/agent-response';

import { LLMClient } from '../ai/llm-client.interface';

import {
  isLifeEventType,
  LIFE_EVENT_TYPES,
  LifeEventType
} from '../models/life-event.model';

import { UIComponent } from '../types/ui/ui-component.type';


const LIFE_EVENT_TITLES: Record<LifeEventType, string> = {
  FIRST_HOME: 'Tu primera casa',
  CAR_PURCHASE: 'Tu próximo auto',
  MARRIAGE: 'Planea tu matrimonio',
  CHILD: 'Prepárate para una nueva etapa familiar',
  EDUCATION: 'Invierte en tu educación',
  TRAVEL: 'Planea tu próximo viaje'
};


export class AgentService implements IAgentService {

  constructor(
    private readonly financialService: IFinancialService,
    private readonly lifeEventService: ILifeEventService,
    private readonly llm: LLMClient
  ) {}


  async processMessage(
    data: AgentRequestDTO
  ): Promise<AgentResponse> {

    /*
     * 1. Detectar intención
     */
    const intent =
      await this.detectIntent(data.message);


    /*
     * 2. Obtener perfil financiero
     */
    const financialProfile =
      await this.financialService.getProfile(
        data.userId
      );

    if (!financialProfile) {
      throw new Error(
        'Financial profile not found'
      );
    }


    /*
     * 3. Obtener Life Events del usuario
     */
    const lifeEvents =
      await this.lifeEventService.getByUser(
        data.userId
      );


    /*
     * Buscamos el Life Event activo
     * correspondiente a la intención.
     */
    const activeLifeEvent =
      intent === 'UNKNOWN'
        ? undefined
        : lifeEvents.find(
            event =>
              event.type === intent &&
              event.status === 'ACTIVE'
          );


    /*
     * 4. Componentes base
     */
    const components: UIComponent[] = [
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
            financialProfile.currentDebt,

          creditScore:
            financialProfile.creditScore
        }
      }
    ];


    /*
     * 5. Componentes específicos
     * según intención
     */
    if (
      intent === 'FIRST_HOME' &&
      activeLifeEvent
    ) {
      this.addFirstHomeComponents(
        components,
        activeLifeEvent.context,
        financialProfile.currentSavings
      );
    }


    /*
     * 6. Crear / mantener sessionId
     */
    const sessionId =
      data.sessionId ?? randomUUID();


    /*
     * 7. Respuesta para frontend
     */
    return {
      sessionId,

      message:
        'Analicé tu situación financiera y preparé una experiencia para ayudarte.',

      intent,

      ui: {
        version: '1.0',

        screen: {
          title:
            activeLifeEvent?.title ??
            (
              intent === 'UNKNOWN'
                ? 'Tu experiencia financiera'
                : LIFE_EVENT_TITLES[intent]
            ),

          subtitle:
            'Explora tu situación financiera y simula opciones'
        },

        components
      }
    };
  }


  /*
   * Detecta intención utilizando Gemini.
   *
   * Si Gemini falla o devuelve algo inválido,
   * usamos el clasificador local como fallback.
   */
  private async detectIntent(
    message: string
  ): Promise<AgentIntent> {

    try {
      const intentResponse =
        await this.llm.generate([
          {
            role: 'system',

            content: `
You are an intent classifier for a banking application.

Allowed values:
${LIFE_EVENT_TYPES.join(', ')}, UNKNOWN

Return ONLY one value.
            `.trim()
          },

          {
            role: 'user',
            content: message
          }
        ]);


      const classifiedIntent =
        intentResponse
          .trim()
          .toUpperCase();


      if (
        isLifeEventType(
          classifiedIntent
        )
      ) {
        return classifiedIntent;
      }


      return this.classifyIntentLocally(
        message
      );

    } catch (error) {

      console.error(
        'LLM intent classification failed:',
        error
      );

      return this.classifyIntentLocally(
        message
      );
    }
  }


  /*
   * Agrega componentes relacionados
   * con FIRST_HOME.
   */
  private addFirstHomeComponents(
    components: UIComponent[],
    context: Record<string, unknown>,
    currentSavings: number
  ): void {

    const propertyBudget =
      context['propertyBudget'];

    const preferredTermMonths =
      context['preferredTermMonths'];


    /*
     * No inventamos valores.
     *
     * Si el Life Event no tiene la información
     * necesaria, simplemente no generamos
     * todavía el simulador.
     */
    if (
      typeof propertyBudget !== 'number' ||
      typeof preferredTermMonths !== 'number'
    ) {
      return;
    }


    components.push({
      id: 'mortgage-simulator-1',

      type: 'mortgage-simulator',

      props: {
        propertyValue:
          propertyBudget,

        downPayment:
          currentSavings,

        termMonths:
          preferredTermMonths
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
    });
  }


  /*
   * Fallback local.
   *
   * No reemplaza al LLM.
   * Solo se utiliza si Gemini falla.
   */
  private classifyIntentLocally(
    message: string
  ): AgentIntent {

    const normalizedMessage =
      message.toLowerCase();


    if (
      /(auto|coche|carro|vehículo|vehiculo)/
        .test(normalizedMessage)
    ) {
      return 'CAR_PURCHASE';
    }


    if (
      /(casa|vivienda|hipoteca|hogar)/
        .test(normalizedMessage)
    ) {
      return 'FIRST_HOME';
    }


    if (
      /(boda|casarme|matrimonio)/
        .test(normalizedMessage)
    ) {
      return 'MARRIAGE';
    }


    if (
      /(hijo|bebé|bebe|niño|nino)/
        .test(normalizedMessage)
    ) {
      return 'CHILD';
    }


    if (
      /(estudi|universidad|educación|educacion)/
        .test(normalizedMessage)
    ) {
      return 'EDUCATION';
    }


    if (
      /(viaje|viajar|vacaciones)/
        .test(normalizedMessage)
    ) {
      return 'TRAVEL';
    }


    return 'UNKNOWN';
  }
}