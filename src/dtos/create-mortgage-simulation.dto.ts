export interface CreateMortgageSimulationDTO {
  userId: string;
  lifeEventId?: string;
  financialProductId: string;
  propertyValue: number;
  downPayment: number;
  termMonths: number;
}