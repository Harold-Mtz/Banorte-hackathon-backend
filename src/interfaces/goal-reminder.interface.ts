export type ReminderFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface GoalReminder {
  id: string;

  goalId: string;

  enabled: boolean;

  frequency: ReminderFrequency;

  dayOfWeek: number | null;

  dayOfMonth: number | null;

  reminderTime: string;

  timezone: string;

  lastNotifiedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

export interface ConfigureGoalReminderData {
  goalId: string;

  enabled?: boolean;

  frequency: ReminderFrequency;

  dayOfWeek?: number;

  dayOfMonth?: number;

  reminderTime: string;

  timezone: string;
}

export interface IGoalReminderRepository {
  create(data: ConfigureGoalReminderData): Promise<GoalReminder>;

  findByGoalId(goalId: string): Promise<GoalReminder | null>;

  update(
    id: string,
    data: ConfigureGoalReminderData,
  ): Promise<GoalReminder | null>;

  findEnabled(): Promise<GoalReminder[]>;

  markAsNotified(id: string): Promise<void>;
}

export interface IGoalReminderService {
  configure(data: ConfigureGoalReminderData): Promise<GoalReminder>;

  getByGoalId(goalId: string): Promise<GoalReminder | null>;
}
