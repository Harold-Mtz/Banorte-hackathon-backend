import { z } from 'zod';
import { LIFE_EVENT_TYPES } from '../models/life-event.model';
import { ILifeEventService } from '../interfaces/life-event-service.interface';
import { LifeEventRepository } from '../repositories/life-event.repository';
import { CreateLifeEventDTO } from '../dtos/create-life-event.dto';
import { LifeEvent } from '../models/life-event.model';

export class LifeEventService implements ILifeEventService {
  constructor(
    private readonly repository: LifeEventRepository
  ) {}

  async create(data: CreateLifeEventDTO): Promise<LifeEvent> {
    const parsed = z.object({userId:z.uuid(),type:z.enum(LIFE_EVENT_TYPES),title:z.string().trim().min(1).max(150),context:z.record(z.string(),z.unknown()).optional()}).parse(data);
    return this.repository.create(parsed);
  }

  async getById(id: string): Promise<LifeEvent | null> {
    return this.repository.findById(id);
  }

  async getByUser(userId: string): Promise<LifeEvent[]> {
    return this.repository.findByUserId(userId);
  }
}