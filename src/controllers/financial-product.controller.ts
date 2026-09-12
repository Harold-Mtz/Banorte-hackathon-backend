import { Request, Response } from "express";
import { IFinancialProductService } from "../interfaces/financial-product-service.interface";
import { successResponse, errorResponse } from "../utils/response.util";

export class FinancialProductController {
  constructor(private readonly service: IFinancialProductService) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const products = type
        ? await this.service.getByType(type as string)
        : await this.service.getAll();
      return res.status(200).json(successResponse(products));
    } catch (err) {
      return res
        .status(500)
        .json(
          errorResponse(
            "FINANCIAL_PRODUCTS_FETCH_FAILED",
            (err as Error).message,
          ),
        );
    }
  };
}
