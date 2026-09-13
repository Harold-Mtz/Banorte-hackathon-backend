import { AdaptiveUIResponse } from "../types/ui/adaptive-ui-response.type";
import { LifeEventType } from '../models/life-event.model';

export interface AgentResponse {
  sessionId: string;
  message?: string;
  intent?: string;
  ui: AdaptiveUIResponse;
}

export type AgentIntent =
  | LifeEventType
  | 'UNKNOWN';
