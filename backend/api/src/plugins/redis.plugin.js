// Decorates fastify with `redis` (Upstash REST client) from shared lib singleton.
const fp = require('fastify-plugin');
const { getRedis } = require('../../../lib/redis');

module.exports = fp(async function redisPlugin(fastify) {
  const redis = getRedis();
  fastify.decorate('redis', redis);
  fastify.log.info('[plugin] redis ready');
});
