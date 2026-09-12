import { Request, Response } from "express";
import { IMortgageService } from "../interfaces/mortgage-service.interface";
import { successResponse, errorResponse } from "../utils/response.util";

export class MortgageController {
  constructor(private readonly service: IMortgageService) {}

  simulate = async (req: Request, res: Response) => {
    try {
      const simulation = await this.service.simulate(req.body);
      return res
        .status(201)
        .json(successResponse(simulation, "Simulation created successfully"));
    } catch (err) {
      return res
        .status(400)
        .json(
          errorResponse("MORTGAGE_SIMULATION_FAILED", (err as Error).message),
        );
    }
  };

  getUserSimulations = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params as { userId: string };
      const simulations = await this.service.getUserSimulations(userId);
      return res.status(200).json(successResponse(simulations));
    } catch (err) {
      return res
        .status(500)
        .json(
          errorResponse(
            "MORTGAGE_SIMULATIONS_FETCH_FAILED",
            (err as Error).message,
          ),
        );
    }
  };
}
