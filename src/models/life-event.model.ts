export const LIFE_EVENT_TYPES = [
  'FIRST_HOME',
  'CAR_PURCHASE',
  'MARRIAGE',
  'CHILD',
  'EDUCATION',
  'TRAVEL'
] as const;

export type LifeEventType =
  typeof LIFE_EVENT_TYPES[number];

export function isLifeEventType(
  value: unknown
): value is LifeEventType {
  return (
    typeof value === 'string' &&
    LIFE_EVENT_TYPES.some(
      type => type === value
    )
  );
}

export type LifeEventStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface LifeEvent {
  id: string;
  userId: string;
  type: LifeEventType;
  title: string;
  status: LifeEventStatus;
  context: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}