// Fitment worker \u2014 the pipeline coordinator.
//
// Subscribes (TWO consumers, separate group IDs in same process):
//   - karigar.fraud.complete
//   - karigar.proctor.complete
//
// Coordination via Redis dual-key + an NX-guard:
//   fitment:{id}:fraud    set when fraud.complete arrives
//   fitment:{id}:proctor  set when proctor.complete arrives
//   coord:fitment:done:{id}  NX guard so only one branch wins classification
//
// On both flags present + guard acquired:
//   - SELECT acs_score, fraud_flag, proctor_flag, proctor_integrity_score
//   - apply rules \u2192 fitment_category
//   - UPDATE interviews SET fitment_category, status='complete'
//   - write Redis status:complete with embedded result object
//   - publish karigar.fitment.complete
//   - DEL coordination keys
//
// Rules (priority order):
//   fraud_flag OR (proctor_flag AND integrity<40)         \u2192 suspected_fraud
//   acs >= 75 AND integrity >= 60                          \u2192 job_ready
//   acs >= 50                                              \u2192 requires_upskilling
//   acs >= 30 OR proctor_flag                              \u2192 manual_review
//   else                                                   \u2192 low_confidence

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { startConsumer, publish } = require('../../lib/kafka');
const { getPool, closePool } = require('../../lib/db');
const { getRedis } = require('../../lib/redis');
const {
  setStatus, fraudCoordKey, proctorCoordKey, fitmentDoneGuardKey, COORD_TTL_SEC,
} = require('../../lib/statusStore');
const { makeLogger } = require('../../lib/logger');

const log = makeLogger('fitment');

const POLYTECHNIC = new Set(['Lab Technician', 'Draughtsman', 'Machine Operator']);
const BLUE_COLLAR = new Set(['Electrician', 'Plumber', 'Carpenter', 'Welder', 'Mason']);

function classifySegment(trade) {
  if (POLYTECHNIC.has(trade)) return 'polytechnic';
  if (BLUE_COLLAR.has(trade)) return 'blue_collar';
  return 'semi_skilled';
}

function classifyFitment({ acs, fraudFlag, proctorFlag, integrity }) {
  if (fraudFlag || (proctorFlag && integrity < 40)) return 'suspected_fraud';
  if (acs >= 75 && integrity >= 60) return 'job_ready';
  if (acs >= 50) return 'requires_upskilling';
  if (acs >= 30 || proctorFlag) return 'manual_review';
  return 'low_confidence';
}

async function tryFinalize(interviewId) {
  const redis = getRedis();
  const pool = getPool();

  // Both signals present?
  const [fraudFlag, proctorFlag] = await Promise.all([
    redis.get(fraudCoordKey(interviewId)),
    redis.get(proctorCoordKey(interviewId)),
  ]);
  if (!fraudFlag || !proctorFlag) return;

  // Race guard: only the first branch to set this key wins.
  // Upstash supports nx + ex options on SET.
  const got = await redis.set(fitmentDoneGuardKey(interviewId), '1', { nx: true, ex: 60 });
  if (got !== 'OK') {
    log.info(`guard already held for ${interviewId} \u2014 another branch is finalizing`);
    return;
  }

  log.fitment(`finalizing ${interviewId}`);

  const r = await pool.query(
    `SELECT i.acs_score, i.fraud_flag, i.proctor_flag, i.proctor_integrity_score, i.workforce_segment,
            c.id AS candidate_id, c.name, c.phone, c.district, c.trade_category, c.language, c.selfie_url,
            i.relevance_score, i.clarity_score, i.skill_confidence_score,
            i.ai_summary_en, i.ai_summary_kn, i.key_observations,
            i.fraud_reason, i.fraud_similarity, i.video_url, i.transcript
       FROM interviews i JOIN candidates c ON c.id = i.candidate_id
      WHERE i.id = $1`,
    [interviewId]
  );
  if (r.rowCount === 0) {
    log.error(`interview ${interviewId} not found at finalize`);
    return;
  }
  const row = r.rows[0];

  const acs = parseFloat(row.acs_score) || 0;
  const integrity = row.proctor_integrity_score == null ? 100 : row.proctor_integrity_score;
  const fitment = classifyFitment({
    acs,
    fraudFlag: !!row.fraud_flag,
    proctorFlag: !!row.proctor_flag,
    integrity,
  });
  const segment = row.workforce_segment || classifySegment(row.trade_category);

  await pool.query(
    `UPDATE interviews
        SET fitment_category = $1,
            workforce_segment = $2,
            status = 'complete',
            updated_at = NOW()
      WHERE id = $3`,
    [fitment, segment, interviewId]
  );

  // Build the full result object that the FE result screen expects.
  const result = {
    interviewId,
    candidateId: row.candidate_id,
    name: row.name,
    phone: row.phone,
    district: row.district,
    tradeCategory: row.trade_category,
    language: row.language,
    selfieUrl: row.selfie_url,
    videoUrl: row.video_url,
    acsScore: acs,
    relevanceScore: parseFloat(row.relevance_score),
    clarityScore: parseFloat(row.clarity_score),
    skillConfidenceScore: parseFloat(row.skill_confidence_score),
    fitmentCategory: fitment,
    workforceSegment: segment,
    aiSummaryEn: row.ai_summary_en,
    aiSummaryKn: row.ai_summary_kn,
    keyObservations: row.key_observations || [],
    fraudFlag: !!row.fraud_flag,
    fraudReason: row.fraud_reason,
    fraudSimilarity: row.fraud_similarity ? parseFloat(row.fraud_similarity) : null,
    proctorFlag: !!row.proctor_flag,
    proctorIntegrityScore: integrity,
  };

  await setStatus(interviewId, {
    status: 'complete',
    step: 'done',
    progress: 100,
    fitmentCategory: fitment,
    acsScore: acs,
    result,
  });

  await publish('karigar.fitment.complete', {
    interviewId,
    candidateId: row.candidate_id,
    fitmentCategory: fitment,
    acsScore: acs,
    timestamp: new Date().toISOString(),
  });

  // Clean up coordination keys.
  await Promise.all([
    redis.del(fraudCoordKey(interviewId)),
    redis.del(proctorCoordKey(interviewId)),
  ]).catch(() => { /* ignore */ });

  log.success(`finalized ${row.name} (${interviewId}): ${fitment} (ACS=${acs}, integrity=${integrity})`);
}

async function handleFraudComplete(body) {
  const { interviewId } = body || {};
  if (!interviewId) return;
  const redis = getRedis();
  await redis.set(fraudCoordKey(interviewId), JSON.stringify(body), { ex: COORD_TTL_SEC });
  log.fitment(`fraud.complete arrived for ${interviewId}`);
  await tryFinalize(interviewId);
}

async function handleProctorComplete(body) {
  const { interviewId } = body || {};
  if (!interviewId) return;
  const redis = getRedis();
  await redis.set(proctorCoordKey(interviewId), JSON.stringify(body), { ex: COORD_TTL_SEC });
  log.fitment(`proctor.complete arrived for ${interviewId}`);
  await tryFinalize(interviewId);
}

async function main() {
  log.boot('starting fitment worker (dual subscription)');
  process.on('uncaughtException', (e) => log.error(`uncaughtException: ${e.message}`));
  process.on('unhandledRejection', (e) => log.error(`unhandledRejection: ${e?.message || e}`));

  await Promise.all([
    startConsumer({
      topic: 'karigar.fraud.complete',
      groupId: 'fitment-fraud',
      instanceId: 'fitment-fraud-1',
      handler: handleFraudComplete,
    }),
    startConsumer({
      topic: 'karigar.proctor.complete',
      groupId: 'fitment-proctor',
      instanceId: 'fitment-proctor-1',
      handler: handleProctorComplete,
    }),
  ]);
}

main().catch(async (err) => {
  log.error(`fatal: ${err.message}`);
  await closePool().catch(() => {});
  process.exit(1);
});
