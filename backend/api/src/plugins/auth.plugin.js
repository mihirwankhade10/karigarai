// Authentication helpers. Decorates fastify with `authenticate` and
// `requireRole` preHandlers.
const fp = require('fastify-plugin');

module.exports = fp(async function authPlugin(fastify) {
  fastify.decorate('authenticate', async function authenticate(req, reply) {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });

  fastify.decorate('requireRole', function requireRole(...roles) {
    return async function (req, reply) {
      if (!req.user || !roles.includes(req.user.role)) {
        reply.code(403).send({ error: 'Forbidden', message: 'Insufficient role' });
      }
    };
  });

  fastify.log.info('[plugin] auth helpers ready');
});
