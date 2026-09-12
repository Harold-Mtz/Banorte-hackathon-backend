import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { FinancialProfileRepository } from "../repositories/financial-profile.repository";
import { FinancialService } from "../services/financial.service";

import {
  createGetFinancialProfileTool,
  getFinancialProfileInputSchema,
} from "./tools/get-financial-profile.tool";

export const createMcpServer = () => {
  const server = new McpServer({
    name: "banorte-adaptive-life",
    version: "1.0.0",
  });

  const repository = new FinancialProfileRepository();

  const financialService = new FinancialService(repository);

  const getFinancialProfile = createGetFinancialProfileTool(financialService);

  server.tool(
    "getFinancialProfile",

    "Obtains the financial profile of a user including income, expenses, savings and current debt.",

    getFinancialProfileInputSchema.shape,

    async ({ userId }) => {
      const result = await getFinancialProfile({
        userId,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    },
  );

  return server;
};
