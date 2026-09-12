import type { CreateMortgageSimulationDTO } from "../dtos/create-mortgage-simulation.dto";
import type { MortgageSimulation } from "../models/mortgage-simulation.model";

export interface IMortgageService {
  simulate(data: CreateMortgageSimulationDTO): Promise<MortgageSimulation>;
  calculateCapacity(userId: string): Promise<number>;
  getUserSimulations(userId: string): Promise<MortgageSimulation[]>;
}
