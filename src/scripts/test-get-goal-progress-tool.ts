import { SavingsGoalRepository } from "../repositories/savings-goal.repository";
import { SavingsGoalService } from "../services/savings-goal.service";
import { createGetGoalProgressTool } from "../mcp/tools/get-goal-progress.tool";
import { pool } from "../config/database";

async function main() {
  const repository = new SavingsGoalRepository();

  const service = new SavingsGoalService(repository);

  const getGoalProgress = createGetGoalProgressTool(service);

  try {
    const result = await getGoalProgress({
      goalId: "191f08f4-86dc-4fcd-95b8-82816d7ef19b",
    });

    console.log("getGoalProgress tool successful:");

    console.log(result);
  } catch (error) {
    console.error("Error executing getGoalProgress:", error);
  } finally {
    await pool.end();
  }
}

main();
