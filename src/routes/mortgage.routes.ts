import { Router } from "express";

import { MortgageController } from "../controllers/mortgage.controller";

import { MortgageService } from "../services/mortgage.service";
import { FinancialService } from "../services/financial.service";

import { MortgageSimulationRepository } from "../repositories/mortgage-simulation.repository";
import { FinancialProductRepository } from "../repositories/financial-product.repository";
import { FinancialProfileRepository } from "../repositories/financial-profile.repository";

const router = Router();

const mortgageRepository =
  new MortgageSimulationRepository();

const productRepository =
  new FinancialProductRepository();

const financialProfileRepository =
  new FinancialProfileRepository();

const financialService =
  new FinancialService(
    financialProfileRepository,
  );

const service =
  new MortgageService(
    mortgageRepository,
    productRepository,
    financialService,
  );

const controller =
  new MortgageController(service);

router.post(
  "/simulate",
  controller.simulate,
);

const userMortgageRouter =
  Router({
    mergeParams: true,
  });

userMortgageRouter.get(
  "/mortgage-simulations",
  controller.getUserSimulations,
);

export default router;
export { userMortgageRouter };