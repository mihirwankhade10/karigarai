// KarigarAI API server entrypoint.
//
// Boot order:
//   1. dotenv (from backend/.env)
//   2. Fastify with logger
//   3. Security: helmet, cors, rate-limit
//   4. Body parsing: multipart
//   5. Auth: jwt + auth helpers
//   6. Docs: swagger
//   7. App plugins: db, redis, kafka
//   8. Routes
//   9. listen on 0.0.0.0:PORT

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const multipart = require('@fastify/multipart');
const jwt = require('@fastify/jwt');

const dbPlugin = require('./plugins/db.plugin');
const redisPlugin = require('./plugins/redis.plugin');
const kafkaPlugin = require('./plugins/kafka.plugin');
const authPlugin = require('./plugins/auth.plugin');
const swaggerPlugin = require('./plugins/swagger.plugin');

const authRoutes = require('./routes/auth.routes');
const candidateRoutes = require('./routes/candidate.routes');
const interviewRoutes = require('./routes/interview.routes');
const adminRoutes = require('./routes/admin.routes');

async function build() {
  const fastify = Fastify({
    logger: { level: process.env.LOG_LEVEL || 'info' },
    bodyLimit: 110 * 1024 * 1024, // 110MB to allow 100MB videos plus headers
  });

  // Bypass fast-json-stringify and serialize responses with plain JSON.stringify.
  // fast-json-stringify is strict: it omits any field not explicitly declared
  // in the response schema. We keep response schemas for Swagger docs but
  // don\u2019t want them stripping fields at runtime.
  fastify.setSerializerCompiler(() => (data) => JSON.stringify(data));

  // Security
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Swagger UI needs inline scripts
  });

  await fastify.register(cors, {
    origin: (origin, cb) => {
      const allow = process.env.FRONTEND_URL || 'http://localhost:5173';
      // Allow no-origin requests (curl, mobile, server-to-server) and the configured origin.
      if (!origin) return cb(null, true);
      if (origin === allow) return cb(null, true);
      // Allow 127.0.0.1 + localhost variants in dev for convenience.
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      cb(new Error('CORS: origin not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Multipart with 100MB file limit
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024,
      files: 1,
      fields: 20,
    },
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'change-me-in-env',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  });

  // Custom plugins
  await fastify.register(authPlugin);
  await fastify.register(swaggerPlugin);
  await fastify.register(dbPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(kafkaPlugin);

  // Root + health
  fastify.get('/', {
    schema: {
      tags: ['Health'],
      summary: 'API root',
      description: 'Welcome banner with links to /health and /docs.',
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            health: { type: 'string' },
            docs: { type: 'string' },
          },
        },
      },
    },
  }, async () => ({
    name: 'KarigarAI API',
    health: '/health',
    docs: '/docs',
  }));

  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Health probe',
      description: 'Returns liveness info for orchestrators (Docker, Railway).',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' },
            version: { type: 'string' },
          },
        },
      },
    },
  }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'karigarai-api',
    version: '1.0.0',
  }));

  // Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(candidateRoutes, { prefix: '/api/candidates' });
  await fastify.register(interviewRoutes, { prefix: '/api/interviews' });
  await fastify.register(adminRoutes, { prefix: '/api/admin' });

  // Global error handler \u2014 last resort
  fastify.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'unhandled error');
    const status = err.statusCode || 500;
    reply.code(status).send({
      error: err.name || 'InternalServerError',
      message: err.message || 'Something went wrong',
    });
  });

  return fastify;
}

async function start() {
  let app;
  try {
    app = await build();
    const port = Number(process.env.PORT || 3000);
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`API:     http://localhost:${port}`);
    app.log.info(`Swagger: http://localhost:${port}/docs`);
  } catch (err) {
    console.error('failed to start API:', err);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = { build };
