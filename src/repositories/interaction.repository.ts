import {pool} from '../config/database';
import { Interaction } from '../models/interaction.model';

export class InteractionRepository {

  async create(
    sessionId: string,
    componentId: string,
    action: string,
    payload: Record<string, unknown> = {}
  ): Promise<Interaction> {

    const result = await pool.query(
      `
      INSERT INTO interactions (
        session_id,
        component_id,
        action,
        payload
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        sessionId,
        componentId,
        action,
        JSON.stringify(payload)
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async findBySessionId(
    sessionId: string
  ): Promise<Interaction[]> {

    const result = await pool.query(
      `
      SELECT *
      FROM interactions
      WHERE session_id = $1
      ORDER BY created_at ASC
      `,
      [sessionId]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  private mapRow(row: any): Interaction {
    return {
      id: row.id,
      sessionId: row.session_id,
      componentId: row.component_id,
      action: row.action,
      payload: row.payload ?? {},
      createdAt: row.created_at
    };
  }
}