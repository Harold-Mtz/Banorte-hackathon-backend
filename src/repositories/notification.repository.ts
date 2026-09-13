import { pool } from "../config/database";
import { Notification } from "../models/notification.model";
import { CreateNotificationDTO } from "../dtos/create-notification.dto";

export class NotificationRepository {
  async create(data: CreateNotificationDTO): Promise<Notification> {
    const result = await pool.query(
      `
      INSERT INTO notifications (
        user_id,
        goal_id,
        title,
        message,
        read
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        data.userId,
        data.goalId ?? null,
        data.title,
        data.message,
        data.read ?? false,
      ],
    );

    return this.mapRow(result.rows[0]);
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1
        AND read = FALSE
      ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const result = await pool.query(
      `
      UPDATE notifications
      SET read = TRUE
      WHERE id = $1
      RETURNING *
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<Notification | null> {
    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      goalId: row.goal_id,
      title: row.title,
      message: row.message,
      read: row.read,
      createdAt: row.created_at,
    };
  }
}
