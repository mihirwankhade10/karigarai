// Decorates fastify with `db` (pg.Pool) from the shared lib singleton.
const fp = require('fastify-plugin');
const { getPool, closePool } = require('../../../lib/db');

module.exports = fp(async function dbPlugin(fastify) {
  const pool = getPool();
  // Verify connectivity at boot.
  await pool.query('SELECT 1');
  fastify.decorate('db', pool);
  fastify.addHook('onClose', async () => {
    await closePool();
  });
  fastify.log.info('[plugin] db ready');
});
