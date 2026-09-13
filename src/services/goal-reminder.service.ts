import {
  ConfigureGoalReminderData,
  GoalReminder,
  IGoalReminderRepository,
  IGoalReminderService,
} from "../interfaces/goal-reminder.interface";

export class GoalReminderService implements IGoalReminderService {
  constructor(
    private readonly goalReminderRepository: IGoalReminderRepository,
  ) {}

  async configure(data: ConfigureGoalReminderData): Promise<GoalReminder> {
    this.validateConfiguration(data);

    const existingReminder = await this.goalReminderRepository.findByGoalId(
      data.goalId,
    );

    if (existingReminder) {
      const updatedReminder = await this.goalReminderRepository.update(
        existingReminder.id,
        data,
      );

      if (!updatedReminder) {
        throw new Error("Could not update goal reminder");
      }

      return updatedReminder;
    }

    return this.goalReminderRepository.create(data);
  }

  async getByGoalId(goalId: string): Promise<GoalReminder | null> {
    return this.goalReminderRepository.findByGoalId(goalId);
  }

  private validateConfiguration(data: ConfigureGoalReminderData): void {
    if (data.frequency === "WEEKLY" && data.dayOfWeek === undefined) {
      throw new Error("dayOfWeek is required for weekly reminders");
    }

    if (data.frequency === "MONTHLY" && data.dayOfMonth === undefined) {
      throw new Error("dayOfMonth is required for monthly reminders");
    }

    if (
      data.dayOfWeek !== undefined &&
      (data.dayOfWeek < 0 || data.dayOfWeek > 6)
    ) {
      throw new Error("dayOfWeek must be between 0 and 6");
    }

    if (
      data.dayOfMonth !== undefined &&
      (data.dayOfMonth < 1 || data.dayOfMonth > 31)
    ) {
      throw new Error("dayOfMonth must be between 1 and 31");
    }
  }
}
