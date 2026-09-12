import { LifeEvent } from '../models/life-event.model';
import { CreateLifeEventDTO } from '../dtos/create-life-event.dto';

export interface ILifeEventService {
  create(data: CreateLifeEventDTO): Promise<LifeEvent>;

  getById(id: string): Promise<LifeEvent | null>;

  getByUser(userId: string): Promise<LifeEvent[]>;
}