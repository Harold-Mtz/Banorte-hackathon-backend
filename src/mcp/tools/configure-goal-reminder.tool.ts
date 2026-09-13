import { z } from "zod";
import { IGoalReminderService } from "../../interfaces/goal-reminder.interface";

export const configureGoalReminderInputSchema = z
  .object({
    goalId: z.string().uuid(),

    enabled: z.boolean().optional(),

    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),

    dayOfWeek: z.number().int().min(0).max(6).optional(),

    dayOfMonth: z.number().int().min(1).max(31).optional(),

    reminderTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "reminderTime must use HH:mm format"),

    timezone: z.string().min(1).default("America/Monterrey"),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "WEEKLY" && data.dayOfWeek === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfWeek"],
        message: "dayOfWeek is required for weekly reminders",
      });
    }

    if (data.frequency === "MONTHLY" && data.dayOfMonth === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfMonth"],
        message: "dayOfMonth is required for monthly reminders",
      });
    }
  });

export type ConfigureGoalReminderInput = z.infer<
  typeof configureGoalReminderInputSchema
>;

export const configureGoalReminderTool = (
  goalReminderService: IGoalReminderService,
) => {
  return async (input: ConfigureGoalReminderInput) => {
    const reminder = await goalReminderService.configure({
      goalId: input.goalId,
      enabled: input.enabled,
      frequency: input.frequency,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      reminderTime: input.reminderTime,
      timezone: input.timezone,
    });

    return {
      id: reminder.id,
      goalId: reminder.goalId,
      enabled: reminder.enabled,
      frequency: reminder.frequency,
      dayOfWeek: reminder.dayOfWeek,
      dayOfMonth: reminder.dayOfMonth,
      reminderTime: reminder.reminderTime,
      timezone: reminder.timezone,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    };
  };
};
