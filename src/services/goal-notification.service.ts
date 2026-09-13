import { z } from "zod";

import { LLMClient } from "../ai/llm-client.interface";
import { ISavingsGoalService } from "../interfaces/savings-goal.interface";

import { NotificationService } from "./notification.service";
import { Notification } from "../models/notification.model";

const generatedNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
});

export class GoalNotificationService {
  constructor(
    private readonly savingsGoalService: ISavingsGoalService,
    private readonly llm: LLMClient,
    private readonly notificationService: NotificationService,
  ) {}

  async generateAndSave(goalId: string): Promise<Notification> {
    /*
     * 1. Los cálculos financieros los hace
     *    nuestro backend, NO el LLM.
     */
    const progress = await this.savingsGoalService.getProgress(goalId);

    /*
     * 2. Le damos al LLM únicamente
     *    información ya calculada.
     */
    const prompt = `
You generate short financial goal notifications for a banking application.

Write the notification in Spanish.

IMPORTANT RULES:
- Do not invent amounts, percentages, dates, or financial facts.
- Use only the data provided below.
- Do not shame or pressure the user.
- Keep a supportive and professional tone.
- Keep the message concise.
- Give at most one concrete recommendation.
- Do not claim that a transfer, payment, or savings transaction was performed.
- Do not promise financial results.
- Return ONLY valid JSON.
- Do not use markdown.
- Do not wrap the JSON in code fences.

GOAL DATA:

Goal name: ${progress.name}
Target amount: ${progress.targetAmount}
Current amount: ${progress.currentAmount}
Remaining amount: ${progress.remainingAmount}
Progress percentage: ${progress.progressPercentage}
Monthly contribution planned: ${progress.monthlyContribution ?? "not configured"}
Required monthly contribution: ${progress.requiredMonthlyContribution ?? "not available"}
Months remaining: ${progress.monthsRemaining ?? "not available"}
Status: ${progress.status}
Target date: ${progress.targetDate ?? "not configured"}

Return exactly this structure:

{
  "title": "short notification title",
  "message": "short personalized notification message"
}
`;

    /*
     * 3. Gemini genera solamente
     *    la redacción.
     */
    const response = await this.llm.generate([
      {
        role: "user",
        content: prompt,
      },
    ]);

    /*
     * 4. Validamos la salida del LLM.
     */
    const generated = this.parseLLMResponse(response);

    /*
     * 5. Guardamos la notificación.
     */
    return this.notificationService.createNotification({
      userId: progress.userId,

      goalId: progress.goalId,

      title: generated.title,

      message: generated.message,
    });
  }

  private parseLLMResponse(response: string): {
    title: string;
    message: string;
  } {
    try {
      /*
       * Por seguridad, eliminamos posibles
       * markdown fences aunque se haya pedido
       * al modelo no utilizarlos.
       */
      const cleanResponse = response
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanResponse);

      return generatedNotificationSchema.parse(parsed);
    } catch (error) {
      console.error("Invalid notification response from LLM:", response);

      throw new Error("LLM returned an invalid notification");
    }
  }
}
