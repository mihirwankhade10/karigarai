// Swagger / OpenAPI 3.0 spec + Swagger UI at /docs.
const fp = require('fastify-plugin');
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');

module.exports = fp(async function swaggerPlugin(fastify) {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'KarigarAI API',
        description:
          'AI-powered multilingual video interview and workforce-fitment assessment platform for the Government of Karnataka EDCS. Built for the AI for Bharat Hackathon (Theme 5).',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local development' },
        { url: 'https://karigarai-api.up.railway.app', description: 'Production (Railway)' },
      ],
      tags: [
        { name: 'Auth', description: 'Admin authentication' },
        { name: 'Candidates', description: 'Candidate registration and questions' },
        { name: 'Interviews', description: 'Interview submission, status, results, AI response' },
        { name: 'Admin', description: 'Admin dashboard: candidates, analytics, shortlisting, exports' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
    },
    staticCSP: true,
  });

  fastify.log.info('[plugin] swagger ready at /docs');
});
