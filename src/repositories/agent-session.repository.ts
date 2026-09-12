import { pool } from '../config/database';
import { AgentSession } from '../models/agent-session.model';

export class AgentSessionRepository {

  async create(
    userId: string,
    lifeEventId?: string,
    currentIntent?: string,
    context: Record<string, unknown> = {}
  ): Promise<AgentSession> {

    const result = await pool.query(
      `
      INSERT INTO agent_sessions (
        user_id,
        life_event_id,
        current_intent,
        context
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        userId,
        lifeEventId ?? null,
        currentIntent ?? null,
        JSON.stringify(context)
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<AgentSession | null> {

    const result = await pool.query(
      `
      SELECT *
      FROM agent_sessions
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async updateContext(
    id: string,
    context: Record<string, unknown>
  ): Promise<AgentSession | null> {

    const result = await pool.query(
      `
      UPDATE agent_sessions
      SET
        context = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        JSON.stringify(context)
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async updateIntent(
    id: string,
    currentIntent: string
  ): Promise<AgentSession | null> {

    const result = await pool.query(
      `
      UPDATE agent_sessions
      SET
        current_intent = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id, currentIntent]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: any): AgentSession {
    return {
      id: row.id,
      userId: row.user_id,
      lifeEventId: row.life_event_id,
      status: row.status,
      currentIntent: row.current_intent,
      context: row.context ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}