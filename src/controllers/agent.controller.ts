import { idSchema } from '../domain/validation';
import { Request, Response } from 'express';
import { z } from 'zod';
import { IAgentService } from '../interfaces/agent-service.interface';
import { successResponse, errorResponse } from '../utils/response.util';

const messageSchema = z.object({ message: z.string().trim().min(1).max(4000), sessionId: idSchema.optional() });
const interactionSchema = z.object({ sessionId: idSchema, componentId: z.string().min(1).max(100), action: z.enum(['REFRESH_DASHBOARD','REQUEST_CREDIT_OPTIONS','SELECT_GOAL','REQUEST_CREATE_SAVINGS_GOAL','CONFIRM_CREATE_SAVINGS_GOAL','RECORD_FINANCIAL_MOVEMENT','CONFIRM_RECORD_FINANCIAL_MOVEMENT','UPDATE_MORTGAGE_SIMULATION','UPDATE_GOAL','PAUSE_GOAL','RESUME_GOAL','CANCEL_GOAL','ARCHIVE_GOAL','DELETE_GOAL','CONFIRM_UPDATE_GOAL','CANCEL']), payload: z.record(z.string(), z.unknown()).optional() });
const errors: Record<string, string> = {
  FUTURE_MOVEMENT: 'La fecha del movimiento no puede estar en el futuro.',
  AGENT_SESSION_NOT_FOUND: 'La conversación no está disponible. Inicia una nueva.',
  SAVINGS_GOAL_NOT_FOUND: 'La meta no está disponible para tu usuario.',
  FINANCIAL_PROFILE_NOT_FOUND: 'Aún no tienes un perfil financiero registrado.',
  INSUFFICIENT_SAVINGS: 'El retiro supera el ahorro disponible.',
  INSUFFICIENT_GOAL_SAVINGS: 'El retiro supera el saldo de la meta.',
  GOAL_NOT_ACTIVE: 'Reactiva la meta antes de registrar un movimiento.',
  INVALID_GOAL_MOVEMENT: 'Solo las aportaciones y retiros pueden asociarse a una meta.',
  WITHDRAW_BEFORE_DELETE: 'Retira el saldo de la meta antes de eliminarla.',
  CONFIRMATION_NOT_FOUND: 'La confirmación ya no está vigente. Vuelve a preparar la operación.',
  CONFIRMATION_EXPIRED: 'La confirmación expiró. Vuelve a preparar la operación.',
  PRODUCT_REQUIRED: 'Selecciona un producto para simular.',
  PRODUCT_LIMITS: 'El monto o el plazo están fuera de los límites del producto.',
  INVALID_MORTGAGE_INPUT: 'Revisa el valor, enganche y plazo de la simulación.',
  'Financial product not found': 'El producto no está disponible para simular.'
};
function fail(res: Response, error: unknown) {
  if (error instanceof z.ZodError) return res.status(400).json(errorResponse('INVALID_INPUT', 'Revisa los datos: montos positivos con hasta dos decimales y fechas válidas.'));
  const code = error instanceof Error ? error.message : '';
  if (errors[code]) return res.status(['AGENT_SESSION_NOT_FOUND','SAVINGS_GOAL_NOT_FOUND','FINANCIAL_PROFILE_NOT_FOUND'].includes(code) ? 404 : 409).json(errorResponse(code, errors[code]));
  console.error('Agent dependency error:', error instanceof Error ? error.message : 'Unknown error');
  return res.status(503).json(errorResponse('AGENT_UNAVAILABLE', 'No pudimos completar la operación. Intenta nuevamente.'));
}
export class AgentController {
  constructor(private readonly service: IAgentService) {}
  processMessage = async (req: Request, res: Response) => {
    if (!req.authUserId) return res.status(401).json(errorResponse('UNAUTHORIZED', 'Inicia sesión.'));
    try {
      const data = messageSchema.parse(req.body);
      return res.json(successResponse(await this.service.processMessage({ ...data, userId: req.authUserId })));
    } catch (error) { return fail(res, error); }
  };
  processInteraction = async (req: Request, res: Response) => {
    if (!req.authUserId) return res.status(401).json(errorResponse('UNAUTHORIZED', 'Inicia sesión.'));
    try {
      const data = interactionSchema.parse(req.body);
      return res.json(successResponse(await this.service.processInteraction({ ...data, payload: data.payload ?? {}, userId: req.authUserId })));
    } catch (error) { return fail(res, error); }
  };
}
