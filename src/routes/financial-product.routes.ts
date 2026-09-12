import { Router } from "express";
import { FinancialProductController } from "../controllers/financial-product.controller";
import { FinancialProductService } from "../services/financial-product.service";
import { FinancialProductRepository } from "../repositories/financial-product.repository";

const router = Router();

const repository = new FinancialProductRepository();
const service = new FinancialProductService(repository);
const controller = new FinancialProductController(service);

router.get("/", controller.getAll);

export default router;
