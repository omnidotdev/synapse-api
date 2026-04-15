import { Pool } from "pg";

/**
 * Postgres database pool.
 * Read DATABASE_URL from `process.env` directly so the pool reflects
 * the value set by the test preload (which runs after env.config evaluates).
 * @see https://node-postgres.com/apis/pool
 */
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pgPool;
