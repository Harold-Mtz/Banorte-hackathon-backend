export interface UIState {
  id: string;
  session_id: string;
  version: number;
  schema: Record<string, unknown>;
  created_at: Date;
}