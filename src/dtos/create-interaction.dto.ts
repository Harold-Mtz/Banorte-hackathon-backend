export interface CreateInteractionDTO {
  sessionId: string;
  componentId: string;
  action: string;
  payload?: Record<string, unknown>;
}