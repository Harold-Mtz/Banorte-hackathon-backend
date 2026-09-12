import { pool } from '../config/database';
import { User } from '../models/user.model';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}