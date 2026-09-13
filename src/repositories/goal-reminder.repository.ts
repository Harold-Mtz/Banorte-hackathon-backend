import { pool } from "../config/database";
import {
  ConfigureGoalReminderData,
  GoalReminder,
} from "../interfaces/goal-reminder.interface";

export class GoalReminderRepository {
  async create(data: ConfigureGoalReminderData): Promise<GoalReminder> {
    const result = await pool.query(
      `
      INSERT INTO goal_reminders (
        goal_id,
        enabled,
        frequency,
        day_of_week,
        day_of_month,
        reminder_time,
        timezone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        data.goalId,
        data.enabled ?? true,
        data.frequency,
        data.dayOfWeek ?? null,
        data.dayOfMonth ?? null,
        data.reminderTime,
        data.timezone,
      ],
    );

    return this.mapRow(result.rows[0]);
  }

  async findByGoalId(goalId: string): Promise<GoalReminder | null> {
    const result = await pool.query(
      `
      SELECT *
      FROM goal_reminders
      WHERE goal_id = $1
      LIMIT 1
      `,
      [goalId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async update(
    id: string,
    data: ConfigureGoalReminderData,
  ): Promise<GoalReminder | null> {
    const result = await pool.query(
      `
      UPDATE goal_reminders
      SET
        enabled = $1,
        frequency = $2,
        day_of_week = $3,
        day_of_month = $4,
        reminder_time = $5,
        timezone = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
      `,
      [
        data.enabled ?? true,
        data.frequency,
        data.dayOfWeek ?? null,
        data.dayOfMonth ?? null,
        data.reminderTime,
        data.timezone,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async findEnabled(): Promise<GoalReminder[]> {
    const result = await pool.query(
      `
      SELECT *
      FROM goal_reminders
      WHERE enabled = TRUE
      `,
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async markAsNotified(id: string): Promise<void> {
    await pool.query(
      `
      UPDATE goal_reminders
      SET
        last_notified_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      `,
      [id],
    );
  }

  private mapRow(row: any): GoalReminder {
    return {
      id: row.id,
      goalId: row.goal_id,
      enabled: row.enabled,
      frequency: row.frequency,
      dayOfWeek: row.day_of_week,
      dayOfMonth: row.day_of_month,
      reminderTime: row.reminder_time,
      timezone: row.timezone,
      lastNotifiedAt: row.last_notified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
