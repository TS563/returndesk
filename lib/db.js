import { Pool } from 'pg';

// One pool per server instance (cached on globalThis so Next.js dev reloads
// don't open a new pool every time). Kept small for serverless hosting.
export const pool =
  globalThis.__returndeskPool ??
  (globalThis.__returndeskPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
  }));

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
