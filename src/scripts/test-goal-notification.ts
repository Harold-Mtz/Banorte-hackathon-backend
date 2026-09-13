import { SavingsGoalRepository } from "../repositories/savings-goal.repository";
import { NotificationRepository } from "../repositories/notification.repository";

import { SavingsGoalService } from "../services/savings-goal.service";
import { NotificationService } from "../services/notification.service";
import { GoalNotificationService } from "../services/goal-notification.service";

import { GeminiClient } from "../ai/gemini-client";

import { pool } from "../config/database";

async function main() {
  const savingsGoalRepository = new SavingsGoalRepository();

  const notificationRepository = new NotificationRepository();

  const savingsGoalService = new SavingsGoalService(savingsGoalRepository);

  const notificationService = new NotificationService(notificationRepository);

  const llm = new GeminiClient();

  const goalNotificationService = new GoalNotificationService(
    savingsGoalService,
    llm,
    notificationService,
  );

  try {
    const result = await goalNotificationService.generateAndSave(
      "191f08f4-86dc-4fcd-95b8-82816d7ef19b",
    );

    console.log("AI notification created successfully:");

    console.log(result);
  } catch (error) {
    console.error("Goal notification test failed:", error);
  } finally {
    await pool.end();
  }
}

main();
