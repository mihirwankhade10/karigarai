// Decorates fastify with `kafka.publish(topic, message)`.
const fp = require('fastify-plugin');
const { publish } = require('../../../lib/kafka');

module.exports = fp(async function kafkaPlugin(fastify) {
  fastify.decorate('kafka', {
    publish: async (topic, message) => {
      await publish(topic, message);
    },
  });
  fastify.log.info('[plugin] kafka producer ready');
});
