import { AdaptiveUIResponse } from "../types/ui/adaptive-ui-response.type";
export interface AgentResponse {
  sessionId: string;
  message?: string;
  intent?: string;
  ui: AdaptiveUIResponse;
}