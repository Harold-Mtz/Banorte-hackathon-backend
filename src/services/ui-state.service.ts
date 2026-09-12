import { IUIStateService } from '../interfaces/ui-state-service.interface';
import { UIState } from '../models/ui-state.model';
import { UIStateRepository } from '../repositories/ui-state.repository';

export class UIStateService
  implements IUIStateService {

  constructor(
    private readonly repository:
      UIStateRepository
  ) {}

  async create(
    sessionId: string,
    schema: Record<string, unknown>
  ): Promise<UIState> {

    const latest =
      await this.repository.findLatestBySessionId(
        sessionId
      );

    const nextVersion =
      latest ? latest.version + 1 : 1;

    return this.repository.create(
      sessionId,
      nextVersion,
      schema
    );
  }

  async getLatest(
    sessionId: string
  ): Promise<UIState | null> {

    return this.repository.findLatestBySessionId(
      sessionId
    );
  }
}