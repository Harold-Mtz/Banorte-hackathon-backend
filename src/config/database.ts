import { Pool } from "pg";
import "dotenv/config";
import { AsyncLocalStorage } from 'node:async_hooks';
import type { PoolClient } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL no está definida en el archivo .env"
  );
}

const connectionPool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

connectionPool.on("error", (error: Error) => {
  console.error(
    "Error inesperado en PostgreSQL:",
    error
  );
});

// Every repository query inside a domain transaction uses the same connection.
const transactionContext = new AsyncLocalStorage<PoolClient>();
export const pool = new Proxy(connectionPool, {
  get(target, property) {
    if (property === 'query') {
      const connection = transactionContext.getStore() ?? target;
      return connection.query.bind(connection);
    }
    const value = Reflect.get(target, property);
    return typeof value === 'function' ? value.bind(target) : value;
  }
});

export async function withUserTransaction<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  if (transactionContext.getStore()) return operation();
  const client = await connectionPool.connect();
  try {
    await client.query('BEGIN');
    // Serialize financial mutations across all sessions of the same user.
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const result = await transactionContext.run(client, operation);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
