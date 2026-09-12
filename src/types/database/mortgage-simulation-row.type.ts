export interface MortgageSimulation {
  id: string;
  user_id: string;
  life_event_id: string | null;
  financial_product_id: string | null;
  property_value: number;
  down_payment: number;
  loan_amount: number;
  term_months: number;
  annual_interest_rate: number;
  monthly_payment: number;
  total_payment: number;
  total_interest: number;
  created_at: Date;
}