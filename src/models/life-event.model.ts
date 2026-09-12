export type LifeEventType = 
| 'FIRST_HOME'
| 'CAR_PURCHASE'
| 'MARRIAGE'
| 'CHILD'
| 'EDUCATION'
| 'TRAVEL';

export type LifeEventStatus = 
| 'ACTIVE'
| 'COMPLETED'
| 'CANCELLED';

export interface LifeEvent {
    id: string,
    userId: string,
    type: LifeEventType,
    title: string,
    status: LifeEventStatus,
    context: Record<string, unknown>,
    createdAt: Date,
    updatedAt: Date;
}