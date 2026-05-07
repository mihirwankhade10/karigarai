// Event bus \u2014 BullMQ on Redis.
//
// We pivoted away from Upstash Kafka (deprecated mid-2024) to BullMQ. The API
// surface here matches the previous Kafka helpers exactly, so worker and route
// code is unchanged:
//
//   publish(topic, message)
//   startConsumer({ topic, groupId, instanceId, handler })
//
// Mapping from Kafka concepts:
//   - "topic" stays as a logical channel name (e.g. karigar.video.uploaded)
//   - "groupId" becomes the BullMQ Queue name (each consumer group reads
//     from its own queue, which gives us Kafka-style fan-out without
//     per-message duplication on the broker)
//   - publish(topic, msg) fans out to ALL groups subscribed to that topic
//     based on the static ROUTING table below
//
// Routing is hardcoded because our pipeline topology is fixed. If you add a
// new consumer, add its groupId to the appropriate topic\u2019s array.

const { Queue, Worker, QueueEvents } = require('bullmq');
const { getIoredis } = require('./redis');
const { makeLogger } = require('./logger');

const log = makeLogger('bus');

// topic -> [groupIds that consume from it]
//
// This is the explicit fan-out table. publish('karigar.video.uploaded', msg)
// will enqueue the same message into BOTH the stt-workers queue AND the
// fraud-embed queue, exactly mirroring the original Kafka multi-group
// subscription pattern.
const ROUTING = {
  'karigar.video.uploaded':       ['stt-workers', 'fraud-embed'],
  'karigar.transcript.ready':     ['assessment-workers'],
  'karigar.assessment.complete':  ['fraud-similarity'],
  'karigar.fraud.complete':       ['fitment-fraud'],
  'karigar.proctor.submitted':    ['proctoring-workers'],
  'karigar.proctor.complete':     ['fitment-proctor'],
  'karigar.fitment.complete':     ['notifications'],
  'karigar.notifications':        ['notifications'],
};

const queues = new Map();

function getQueue(name) {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection: getIoredis() }));
  }
  return queues.get(name);
}

const DEFAULT_JOB_OPTS = {
  removeOnComplete: { count: 200 },     // keep last 200 completed for inspection
  removeOnFail:     { count: 1000 },    // keep more failed for debugging
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
};

async function publish(topic, message) {
  const groups = ROUTING[topic];
  if (!groups || groups.length === 0) {
    log.warn(`publish: no consumers registered for topic ${topic}`);
    return;
  }
  const value = typeof message === 'string' ? JSON.parse(message) : message;
  for (const groupId of groups) {
    const q = getQueue(groupId);
    await q.add('msg', value, DEFAULT_JOB_OPTS);
    log.kafka(`-> ${topic} (queue: ${groupId})`);
  }
}

/**
 * Start a worker. The worker reads from the queue named after `groupId`.
 * Handler receives the message body (already deserialized).
 *
 * Note: the `topic` and `instanceId` params are accepted for API compatibility
 * with the previous Kafka helper but only `groupId` is functionally used here.
 */
async function startConsumer({ topic, groupId, instanceId, handler, concurrency = 1 }) {
  const queueName = groupId;
  const worker = new Worker(
    queueName,
    async (job) => {
      try {
        await handler(job.data, { id: job.id, queueName, name: job.name, attempts: job.attemptsMade });
      } catch (err) {
        // Re-throw so BullMQ marks the job as failed and applies retry/backoff.
        // The worker process keeps running even if individual jobs fail.
        log.error(`handler failed on ${queueName} (job ${job.id}): ${err.message}`);
        throw err;
      }
    },
    {
      connection: getIoredis(),
      concurrency,
    }
  );

  worker.on('ready', () => log.boot(`consumer ready: topic=${topic} group=${groupId}`));
  worker.on('failed', (job, err) => {
    log.error(`failed: ${queueName} job=${job?.id} err=${err.message}`);
  });
  worker.on('error', (err) => {
    log.error(`worker error on ${queueName}: ${err.message}`);
  });

  // Keep the process alive (ioredis + worker are async, no need to await).
  // Returning a promise that never resolves matches the old Kafka loop semantics.
  return new Promise(() => {});
}

// Health check used by test-connections.js
async function healthCheck() {
  const q = getQueue('healthcheck');
  await q.add('ping', { ts: Date.now() }, { removeOnComplete: true, removeOnFail: true });
  const counts = await q.getJobCounts('waiting', 'active', 'completed');
  return counts;
}

module.exports = { publish, startConsumer, getQueue, healthCheck, ROUTING };
