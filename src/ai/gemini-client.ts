import {
  GoogleGenAI,
  mcpToTool,
} from "@google/genai";

import {
  LLMClient,
  LLMMessage,
} from "./llm-client.interface";

import { createMcpConnection } from "../mcp/client";

export class GeminiClient implements LLMClient {

  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor() {

    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not configured"
      );
    }

    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    this.model =
      process.env.GEMINI_MODEL ??
      "gemini-3.8-flash";
  }

  /*
   * ==================================================
   * Normal Gemini request
   * ==================================================
   */

  async generate(
    messages: LLMMessage[]
  ): Promise<string> {

    const systemMessages =
      messages
        .filter(
          message =>
            message.role === "system"
        )
        .map(
          message =>
            message.content
        )
        .join("\n");

    const conversation =
      messages
        .filter(
          message =>
            message.role !== "system"
        )
        .map(message => {
          return `${message.role.toUpperCase()}: ${message.content}`;
        })
        .join("\n");

    const response =
      await this.client.models.generateContent({
        model: this.model,

        contents: conversation,

        config: {
          systemInstruction:
            systemMessages ||
            undefined,
        },
      });

    return response.text ?? "";
  }

  /*
   * ==================================================
   * Gemini + MCP
   * ==================================================
   */

  async generateWithMcp(
    userMessage: string,
    userId: string
  ): Promise<string> {

    const {
      client: mcpClient,
      server: mcpServer,
    } = await createMcpConnection();

    try {

      const response =
        await this.client.models.generateContent({
          model: this.model,

          contents: userMessage,

          config: {

            systemInstruction: `
You are a financial assistant for a banking application.

You have access to financial tools through MCP.

Authenticated user ID:
${userId}

IMPORTANT RULES:

- Use MCP tools whenever financial data or calculations are required.
- Never invent financial data or calculation results.
- If a tool requires a userId, always use exactly this authenticated user ID:
  ${userId}

Available capabilities:

1. getFinancialProfile
   Use it when you need information about the user's
   income, expenses, savings, debt or credit score.

2. prequalifyCredit
   Use it when the user asks whether they could qualify
   for a credit or asks how much credit they may obtain.

3. generateAmortizationSchedule
   Use it when the user asks about monthly payments,
   interest, principal, balances or an amortization table.

4. analyzeRefinancing
   Use it when the user asks whether refinancing or
   replacing an existing credit would be beneficial.

If the user has not provided enough information
required by a tool, ask for the missing information.

Respond in Spanish.
            `,

            tools: [
              mcpToTool(mcpClient),
            ],
          },
        });

      return response.text ?? "";

    } finally {

      await mcpClient.close();

      await mcpServer.close();
    }
  }
}