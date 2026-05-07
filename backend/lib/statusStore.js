// Redis status key contract for interview pipeline.
//
// Frontend polls /api/interviews/:id/status every 3 seconds; that endpoint
// reads only from Redis. The DB is touched only when status === 'complete'
// and a full result object is needed.
//
// Step values: uploaded \u2192 transcribing \u2192 assessing \u2192 fraud-check \u2192 proctor-complete \u2192 done

const { getRedis } = require('./redis');

const STATUS_TTL_SEC = 60 * 60 * 24; // 24h
const COORD_TTL_SEC = 60 * 60;       // 1h for fitment coordination keys

const statusKey = (interviewId) => `interview:${interviewId}:status`;
const questionsKey = (candidateId) => `interview:${candidateId}:questions`;
const adminSessionKey = (adminId) => `admin:session:${adminId}`;
const fraudCoordKey = (interviewId) => `fitment:${interviewId}:fraud`;
const proctorCoordKey = (interviewId) => `fitment:${interviewId}:proctor`;
const fitmentDoneGuardKey = (interviewId) => `coord:fitment:done:${interviewId}`;

async function setStatus(interviewId, payload) {
  const redis = getRedis();
  const value = {
    updatedAt: new Date().toISOString(),
    ...payload,
  };
  // Upstash Redis SDK auto-serializes objects.
  await redis.set(statusKey(interviewId), value, { ex: STATUS_TTL_SEC });
  return value;
}

async function getStatus(interviewId) {
  const redis = getRedis();
  return redis.get(statusKey(interviewId));
}

async function setQuestions(candidateId, questions) {
  const redis = getRedis();
  await redis.set(questionsKey(candidateId), questions, { ex: STATUS_TTL_SEC });
}

async function getQuestions(candidateId) {
  const redis = getRedis();
  return redis.get(questionsKey(candidateId));
}

module.exports = {
  STATUS_TTL_SEC,
  COORD_TTL_SEC,
  statusKey,
  questionsKey,
  adminSessionKey,
  fraudCoordKey,
  proctorCoordKey,
  fitmentDoneGuardKey,
  setStatus,
  getStatus,
  setQuestions,
  getQuestions,
};
