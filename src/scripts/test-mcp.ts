import "dotenv/config";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createMcpServer } from "../mcp/server";

async function main() {
  const server = createMcpServer();

  const client = new Client({
    name: "banorte-test-client",
    version: "1.0.0",
  });

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  console.log("\n===== MCP TOOLS =====");

  const toolsResult = await client.listTools();

  for (const tool of toolsResult.tools) {
    console.log(`- ${tool.name}`);
  }

  console.log("\n===== MCP PREQUALIFICATION =====");

  const result = await client.callTool({
    name: "prequalifyCredit",
    arguments: {
      userId: "11111111-1111-1111-1111-111111111111",
      requestedAmount: 500000,
      annualInterestRate: 12,
      termMonths: 60,
    },
  });

  console.dir(result, {
    depth: null,
  });

  await client.close();
  await server.close();
}

main().catch((error) => {
  console.error("MCP test failed:", error);
  process.exit(1);
});