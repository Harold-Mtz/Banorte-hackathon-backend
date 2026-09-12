import {pool} from '../config/database';
import {
  AgentMessage,
  AgentMessageRole
} from '../models/agent-message.model';

export class AgentMessageRepository {

  async create(
    sessionId: string,
    role: AgentMessageRole,
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<AgentMessage> {

    const result = await pool.query(
      `
      INSERT INTO agent_messages (
        session_id,
        role,
        content,
        metadata
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        sessionId,
        role,
        content,
        JSON.stringify(metadata)
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async findBySessionId(
    sessionId: string
  ): Promise<AgentMessage[]> {

    const result = await pool.query(
      `
      SELECT *
      FROM agent_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
      `,
      [sessionId]
    );

    return result.rows.map(row => this.mapRow(row));
  }

  private mapRow(row: any): AgentMessage {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      metadata: row.metadata ?? {},
      createdAt: row.created_at
    };
  }
}