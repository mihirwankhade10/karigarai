// Admin authentication: login, logout, me.
const bcrypt = require('bcryptjs');
const { adminSessionKey } = require('../../../lib/statusStore');

const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

const loginSchema = {
  tags: ['Auth'],
  summary: 'Admin login',
  description:
    'Authenticates an admin user. Returns a JWT and the admin profile (without password). The JWT must be sent on subsequent admin requests via `Authorization: Bearer <token>`.',
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', description: 'Admin email' },
      password: { type: 'string', minLength: 6, description: 'Admin password' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        token: { type: 'string' },
        admin: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            district: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
    401: {
      type: 'object',
      properties: { error: { type: 'string' }, message: { type: 'string' } },
    },
  },
};

module.exports = async function authRoutes(fastify) {
  fastify.post('/login', { schema: loginSchema }, async (req, reply) => {
    const { email, password } = req.body;
    const { rows } = await fastify.db.query(
      `SELECT id, name, email, password_hash, district, role
         FROM admin_users
        WHERE email = $1 AND is_active = TRUE
        LIMIT 1`,
      [email]
    );
    if (rows.length === 0) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
    }
    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
    }
    await fastify.db.query(`UPDATE admin_users SET last_login = NOW() WHERE id = $1`, [admin.id]);

    delete admin.password_hash;
    const token = await fastify.jwt.sign({ adminId: admin.id, role: admin.role, district: admin.district });

    try {
      await fastify.redis.set(adminSessionKey(admin.id), admin, { ex: SESSION_TTL_SEC });
    } catch (err) {
      req.log.warn({ err }, 'redis admin session cache failed (non-fatal)');
    }

    return { success: true, token, admin };
  });

  fastify.post('/logout', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Admin logout',
      description: 'Invalidates the admin session in Redis. JWT itself remains valid until expiry.',
      security: [{ bearerAuth: [] }],
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } },
      },
    },
  }, async (req) => {
    try { await fastify.redis.del(adminSessionKey(req.user.adminId)); } catch (_) { /* ignore */ }
    return { success: true };
  });

  fastify.get('/me', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Current admin profile',
      description: 'Returns the authenticated admin from cache (Redis) or DB fallback.',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            district: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const cached = await fastify.redis.get(adminSessionKey(req.user.adminId)).catch(() => null);
    if (cached) return cached;
    const { rows } = await fastify.db.query(
      `SELECT id, name, email, district, role FROM admin_users WHERE id = $1`,
      [req.user.adminId]
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'NotFound', message: 'Admin not found' });
    return rows[0];
  });
};
