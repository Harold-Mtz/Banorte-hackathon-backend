import cron from "node-cron";

import { GoalReminderRepository } from "../repositories/goal-reminder.repository";
import { SavingsGoalRepository } from "../repositories/savings-goal.repository";
import { NotificationRepository } from "../repositories/notification.repository";

import { GoalReminderSchedulerService } from "../services/goal-reminder-scheduler.service";
import { SavingsGoalService } from "../services/savings-goal.service";
import { NotificationService } from "../services/notification.service";
import { GoalNotificationService } from "../services/goal-notification.service";

import { GeminiClient } from "../ai/gemini-client";

export const startGoalReminderScheduler = () => {
  /*
   * Repositories
   */
  const goalReminderRepository = new GoalReminderRepository();

  const savingsGoalRepository = new SavingsGoalRepository();

  const notificationRepository = new NotificationRepository();

  /*
   * Services
   */
  const savingsGoalService = new SavingsGoalService(savingsGoalRepository);

  const notificationService = new NotificationService(notificationRepository);

  /*
   * LLM
   */
  const llm = new GeminiClient();

  /*
   * Notification orchestration
   */
  const goalNotificationService = new GoalNotificationService(
    savingsGoalService,
    llm,
    notificationService,
  );

  /*
   * Scheduler service
   */
  const schedulerService = new GoalReminderSchedulerService(
    goalReminderRepository,
    goalNotificationService,
  );

  /*
   * Cada minuto.
   */
  cron.schedule("* * * * *", async () => {
    console.log("[Scheduler] Checking goal reminders...");

    try {
      await schedulerService.run();
    } catch (error) {
      console.error("[Scheduler] Unexpected error:", error);
    }
  });

  console.log("[Scheduler] Goal reminder scheduler started");
};
