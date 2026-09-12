import { pool } from '../config/database';
import { LifeEvent } from '../models/life-event.model';
import { CreateLifeEventDTO } from '../dtos/create-life-event.dto';

export class LifeEventRepository {
  async create(data: CreateLifeEventDTO): Promise<LifeEvent> {
    const result = await pool.query(
      `
      INSERT INTO life_events (user_id, type, title, context) VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        data.userId,
        data.type,
        data.title,
        data.context ?? {}
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<LifeEvent | null> {
    const result = await pool.query(
      `SELECT * FROM life_events WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async findByUserId(userId: string): Promise<LifeEvent[]> {
    const result = await pool.query(
      `SELECT * FROM life_events WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  private mapRow(row: any): LifeEvent {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      status: row.status,
      context: row.context ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}