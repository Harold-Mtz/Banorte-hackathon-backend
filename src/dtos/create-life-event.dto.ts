import { LifeEventType } from '../models/life-event.model';

export interface CreateLifeEventDTO {
  userId: string;
  type: LifeEventType;
  title: string;
  context?: Record<string, unknown>;
}