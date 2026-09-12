import {pool} from '../config/database';
import { UIState } from '../models/ui-state.model';

export class UIStateRepository {

  async findLatestBySessionId(
    sessionId: string
  ): Promise<UIState | null> {

    const result = await pool.query(
      `
      SELECT *
      FROM ui_states
      WHERE session_id = $1
      ORDER BY version DESC
      LIMIT 1
      `,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      sessionId: row.session_id,
      version: row.version,
      schema: row.schema,
      createdAt: row.created_at
    };
  }

  async create(
    sessionId: string,
    version: number,
    schema: Record<string, unknown>
  ): Promise<UIState> {

    const result = await pool.query(
      `
      INSERT INTO ui_states (
        session_id,
        version,
        schema
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        sessionId,
        version,
        JSON.stringify(schema)
      ]
    );

    const row = result.rows[0];

    return {
      id: row.id,
      sessionId: row.session_id,
      version: row.version,
      schema: row.schema,
      createdAt: row.created_at
    };
  }
}