import { ILifeEventService } from '../interfaces/life-event-service.interface';
import { LifeEventRepository } from '../repositories/life-event.repository';
import { CreateLifeEventDTO } from '../dtos/create-life-event.dto';
import { LifeEvent } from '../models/life-event.model';

export class LifeEventService implements ILifeEventService {
  constructor(
    private readonly repository: LifeEventRepository
  ) {}

  async create(data: CreateLifeEventDTO): Promise<LifeEvent> {
    return this.repository.create(data);
  }

  async getById(id: string): Promise<LifeEvent | null> {
    return this.repository.findById(id);
  }

  async getByUser(userId: string): Promise<LifeEvent[]> {
    return this.repository.findByUserId(userId);
  }
}