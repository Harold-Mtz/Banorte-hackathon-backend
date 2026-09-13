import { UIAction } from './ui-action.type';


export type UIComponentType =
  | 'financial-summary'
  | 'mortgage-capacity'
  | 'mortgage-simulator'
  | 'product-comparison'
  | 'savings-goal-form'
  | 'goal-progress'
  | 'confirmation';

export interface UIComponent {
  id: string;
  type: UIComponentType;

  title?: string;
  description?: string;

  props: Record<string, unknown>;

  actions?: UIAction[];
}