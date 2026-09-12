import { UIComponent } from './ui-component.type';

export interface AdaptiveUIResponse {
  version: '1.0';

  screen: {
    title: string;
    subtitle?: string;
  };

  components: UIComponent[];
}