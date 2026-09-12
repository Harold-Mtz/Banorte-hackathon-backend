export interface UIAction {
  id: string;
  type: string;
  label?: string;
  payload?: Record<string, unknown>;
}