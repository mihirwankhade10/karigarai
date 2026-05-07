// The auth helpers (authenticate, requireRole) are registered as Fastify
// decorators in plugins/auth.plugin.js. This file re-exports a thin shim so
// route files that prefer middleware-style imports can do so consistently.

module.exports = {
  authenticate: (fastify) => fastify.authenticate,
  requireRole: (fastify, ...roles) => fastify.requireRole(...roles),
};
