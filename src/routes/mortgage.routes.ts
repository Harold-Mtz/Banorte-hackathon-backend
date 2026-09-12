import { Router } from "express";
import { MortgageController } from "../controllers/mortgage.controller";
import { MortgageService } from "../services/mortgage.service";
import { MortgageSimulationRepository } from "../repositories/mortgage-simulation.repository";
import { FinancialProductRepository } from "../repositories/financial-product.repository";

const router = Router();

const mortgageRepository = new MortgageSimulationRepository();
const productRepository = new FinancialProductRepository();

const tempFinancialService = {
  getAvailableIncome: async (_userId: string) => 20000,
};

const service = new MortgageService(
  mortgageRepository,
  productRepository,
  tempFinancialService,
);
const controller = new MortgageController(service);

router.post("/simulate", controller.simulate);
const userMortgageRouter = Router({ mergeParams: true });
userMortgageRouter.get("/mortgage-simulations", controller.getUserSimulations);

export default router;
export { userMortgageRouter };
