import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { LLMClient } from '../ai/llm-client.interface';
import type { DecisionInsights } from '../services/decision-insights.service';
import { createMcpServer } from './server';
import { decisionInsightsOutputSchema } from './tools/get-decision-insights.tool';

// This is an actual MCP initialize + tools/call roundtrip. The user id comes only
// from the authenticated Agent API, and the MCP registry replaces input userId.
export async function requestDecisionInsights(userId: string, llm: LLMClient, request: string): Promise<DecisionInsights> {
  const server = createMcpServer(userId, { llm });
  const client = new Client({ name: 'boreas-adaptive-ui', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = CallToolResultSchema.parse(await client.callTool({ name: 'getDecisionInsights', arguments: { userId, personalize: true, request: request.slice(0, 1000) } }));
    if (result.isError) throw new Error('DECISION_INSIGHTS_TOOL_FAILED');
    const text = result.content.find(item => item.type === 'text');
    if (!text || text.type !== 'text') throw new Error('DECISION_INSIGHTS_INVALID_OUTPUT');
    return { ...decisionInsightsOutputSchema.parse(JSON.parse(text.text)), transport: 'mcp' };
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
}
