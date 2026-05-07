// Postgres pool used by api/ and workers/. Neon requires SSL.
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30_000,
    });
    pool.on('error', (err) => {
      // unexpected client error \u2014 the pool will recreate the connection
      console.error('[db] pool error:', err.message);
    });
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, closePool };
