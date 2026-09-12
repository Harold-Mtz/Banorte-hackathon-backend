export interface Interaction {
  id: string;
  session_id: string;
  component_id: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: Date;
}