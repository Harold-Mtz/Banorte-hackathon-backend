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
    user_id: string,
    type: LifeEventType,
    status: LifeEventStatus,
    context: Record<string, unknown>,
    created_at: Date,
    updated_at: Date;
}