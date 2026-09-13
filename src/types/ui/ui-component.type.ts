import { UIAction } from './ui-action.type';


export type UIComponentType =
  | 'financial-summary'
  | 'mortgage-capacity'
  | 'mortgage-simulator'
  | 'product-comparison'
  | 'savings-goal-form'
  | 'goal-progress'
  | 'goal-plan-form'
  | 'goal-plan'
  | 'confirmation';

export interface UIComponent {
  id: string;
  type: UIComponentType;

  props: Record<string, unknown>;

  actions?: UIAction[];
}