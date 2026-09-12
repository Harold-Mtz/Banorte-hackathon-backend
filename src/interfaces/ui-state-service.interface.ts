import { UIState } from '../models/ui-state.model';

export interface IUIStateService {
  create(
    sessionId: string,
    schema: Record<string, unknown>
  ): Promise<UIState>;

  getLatest(
    sessionId: string
  ): Promise<UIState | null>;
}