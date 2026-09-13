import {
  GoalReminder,
  IGoalReminderRepository,
} from "../interfaces/goal-reminder.interface";

import { GoalNotificationService } from "./goal-notification.service";

export class GoalReminderSchedulerService {
  constructor(
    private readonly goalReminderRepository: IGoalReminderRepository,

    private readonly goalNotificationService: GoalNotificationService,
  ) {}

  async run(): Promise<void> {
    const reminders = await this.goalReminderRepository.findEnabled();

    const now = new Date();

    for (const reminder of reminders) {
      try {
        if (!this.shouldRun(reminder, now)) {
          continue;
        }

        console.log(
          `[Scheduler] Generating notification for goal ${reminder.goalId}`,
        );

        await this.goalNotificationService.generateAndSave(reminder.goalId);

        await this.goalReminderRepository.markAsNotified(reminder.id);

        console.log(
          `[Scheduler] Notification created for goal ${reminder.goalId}`,
        );
      } catch (error) {
        /*
         * IMPORTANT:
         * un reminder fallido no debe detener
         * todos los demás.
         */
        console.error(
          `[Scheduler] Error processing reminder ${reminder.id}:`,
          error,
        );
      }
    }
  }

  private shouldRun(reminder: GoalReminder, now: Date): boolean {
    /*
     * Convertimos "ahora" a la zona horaria
     * elegida por el usuario.
     */
    const local = this.getLocalDateParts(now, reminder.timezone);

    /*
     * PostgreSQL TIME normalmente puede llegar:
     *
     * "18:00:00"
     */
    const [reminderHour, reminderMinute] = reminder.reminderTime
      .split(":")
      .map(Number);

    /*
     * Todavía no es la hora.
     */
    if (local.hour !== reminderHour || local.minute !== reminderMinute) {
      return false;
    }

    /*
     * Verificamos la frecuencia.
     */
    if (reminder.frequency === "WEEKLY") {
      if (local.dayOfWeek !== reminder.dayOfWeek) {
        return false;
      }
    }

    if (reminder.frequency === "MONTHLY") {
      if (local.dayOfMonth !== reminder.dayOfMonth) {
        return false;
      }
    }

    /*
     * Evitamos generar dos notificaciones
     * el mismo día.
     */
    if (reminder.lastNotifiedAt) {
      const lastNotification = this.getLocalDateParts(
        new Date(reminder.lastNotifiedAt),
        reminder.timezone,
      );

      const sameDay =
        local.year === lastNotification.year &&
        local.month === lastNotification.month &&
        local.dayOfMonth === lastNotification.dayOfMonth;

      if (sameDay) {
        return false;
      }
    }

    return true;
  }

  private getLocalDateParts(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,

      year: "numeric",
      month: "numeric",
      day: "numeric",

      hour: "numeric",
      minute: "numeric",

      hourCycle: "h23",

      weekday: "short",
    });

    const parts = formatter.formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;

    const weekday = get("weekday");

    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return {
      year: Number(get("year")),

      month: Number(get("month")),

      dayOfMonth: Number(get("day")),

      hour: Number(get("hour")),

      minute: Number(get("minute")),

      dayOfWeek: dayMap[weekday ?? "Sun"],
    };
  }
}
