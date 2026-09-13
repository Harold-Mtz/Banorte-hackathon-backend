import { GoalReminderRepository } from "../repositories/goal-reminder.repository";
import { GoalReminderService } from "../services/goal-reminder.service";
import { configureGoalReminderTool } from "../mcp/tools/configure-goal-reminder.tool";
import { pool } from "../config/database";

async function main() {
  const repository = new GoalReminderRepository();

  const service = new GoalReminderService(repository);

  const configureGoalReminder = configureGoalReminderTool(service);

  try {
    const result = await configureGoalReminder({
      // REEMPLAZA ESTO POR UN goal_id REAL
      goalId: "191f08f4-86dc-4fcd-95b8-82816d7ef19b",
      frequency: "WEEKLY",
      dayOfWeek: 0,
      reminderTime: "20:00",
      timezone: "America/Monterrey",
    });

    console.log("Goal reminder configured successfully:");

    console.log(result);
  } catch (error) {
    console.error("Error configuring goal reminder:", error);
  } finally {
    await pool.end();
  }
}

main();
