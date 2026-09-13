import "dotenv/config";

import { GeminiClient } from "../ai/gemini-client";

async function main() {

  const gemini =
    new GeminiClient();

  const result =
    await gemini.generateWithMcp(
      "¿Me prestan 500 mil pesos a 5 años con una tasa anual de 12%?",
      "11111111-1111-1111-1111-111111111111"
    );

  console.log(
    "\n===== GEMINI + MCP =====\n"
  );

  console.log(result);
}

main().catch(error => {

  console.error(
    "\nGEMINI MCP TEST FAILED\n"
  );

  console.error(error);

  process.exit(1);
});