import { SavingsGoalRepository } from "../repositories/savings-goal.repository";
import { SavingsGoalService } from "../services/savings-goal.service";
import { pool } from "../config/database";

async function main() {
  const repository = new SavingsGoalRepository();

  const service = new SavingsGoalService(repository);

  try {
    const result = await service.getProgress(
      "191f08f4-86dc-4fcd-95b8-82816d7ef19b",
    );

    console.log("Goal progress calculated successfully:");

    console.log(result);
  } catch (error) {
    console.error("Error calculating goal progress:", error);
  } finally {
    await pool.end();
  }
}

main();
