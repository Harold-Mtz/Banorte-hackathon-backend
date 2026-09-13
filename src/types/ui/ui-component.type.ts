import { UIAction } from './ui-action.type';


export type UIComponentType =
  | 'financial-summary'
  | 'mortgage-capacity'
  | 'mortgage-simulator'
  | 'product-comparison'
  | 'savings-goal-form'
  | 'goal-progress'
  | 'confirmation'
  | 'financial-dashboard'
  | 'goal-dashboard'
  | 'activity-list'
  | 'cashflow-alert'
  | 'credit-options';

export interface UIComponent {
  id: string;
  type: UIComponentType;

  title?: string;
  description?: string;

  props: Record<string, unknown>;

  actions?: UIAction[];
}