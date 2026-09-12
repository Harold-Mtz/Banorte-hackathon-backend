export interface CreateAgentSessionDTO {
  userId: string;
  lifeEventId?: string;
  currentIntent?: string;
  context?: Record<string, unknown>;
}