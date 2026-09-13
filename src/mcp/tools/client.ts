import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { createMcpServer } from "../server";

/** Real MCP protocol within the API process; no public loopback endpoint or secrets in React. */
export async function callDomainTool<T>(
  name: "simulateMortgage" | "createSavingsGoal",
  args: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  const server = createMcpServer();
  const client = new Client({ name: "adaptive-life-agent", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const response = await client.callTool({ name, arguments: args });
    if (response.isError || !Array.isArray(response.content))
      throw new Error("MCP_TOOL_FAILED");
    const text = response.content.find(
      (part: { type: string }) => part.type === "text",
    );
    if (!text || typeof text.text !== "string")
      throw new Error("MCP_INVALID_RESPONSE");
    return schema.parse(JSON.parse(text.text));
  } finally {
    await client.close();
    await server.close();
  }
}
