// Proctoring worker.
//
// Subscribes:    karigar.proctor.submitted (group: proctoring-workers)
// Publishes:     karigar.proctor.complete
// Side effects:  computes integrity score, INSERTs proctor_violations rows,
//                UPDATEs interviews.proctor_flag + proctor_integrity_score,
//                sets Redis status step=proctor-complete.

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { startConsumer, publish } = require('../../lib/kafka');
const { getPool, closePool } = require('../../lib/db');
const { setStatus } = require('../../lib/statusStore');
const { makeLogger } = require('../../lib/logger');

const log = makeLogger('proctor');

const DEDUCT = { critical: 25, high: 15, medium: 8, low: 3 };
const VALID_TYPES = new Set([
  'TAB_SWITCH', 'FULLSCREEN_EXIT', 'NO_FACE', 'MULTIPLE_FACES',
  'FACE_MISMATCH', 'GAZE_AWAY', 'MULTIPLE_BODIES',
]);
const VALID_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function severityForType(type) {
  switch (type) {
    case 'FACE_MISMATCH':
    case 'MULTIPLE_FACES':
    case 'MULTIPLE_BODIES':
      return 'critical';
    case 'NO_FACE':
    case 'FULLSCREEN_EXIT':
      return 'high';
    case 'TAB_SWITCH':
      return 'medium';
    case 'GAZE_AWAY':
    default:
      return 'low';
  }
}

async function handle(body) {
  const { interviewId, violations = [] } = body || {};
  if (!interviewId) return;

  log.info(`processing proctor.submitted for ${interviewId} (${violations.length} violations)`);
  const pool = getPool();

  try {
    let score = 100;
    for (const v of violations) {
      const sev = VALID_SEVERITIES.has(v.severity) ? v.severity : severityForType(v.type);
      score -= DEDUCT[sev] || 0;
    }
    score = Math.max(0, Math.min(100, score));
    const proctorFlag = score < 70 || violations.length >= 3;

    // Insert violations
    for (const v of violations) {
      const type = VALID_TYPES.has(v.type) ? v.type : null;
      if (!type) continue;
      const severity = VALID_SEVERITIES.has(v.severity) ? v.severity : severityForType(v.type);
      await pool.query(
        `INSERT INTO proctor_violations (interview_id, violation_type, severity, timestamp_seconds, snapshot_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          interviewId,
          type,
          severity,
          v.timestamp || v.timestamp_seconds || null,
          v.snapshot_url || v.snapshotUrl || null,
          JSON.stringify(v.metadata || {}),
        ]
      );
    }

    await pool.query(
      `UPDATE interviews
          SET proctor_flag = $1, proctor_integrity_score = $2, updated_at = NOW()
        WHERE id = $3`,
      [proctorFlag, score, interviewId]
    );

    await setStatus(interviewId, { status: 'processing', step: 'proctor-complete', progress: 80 });

    await publish('karigar.proctor.complete', {
      interviewId,
      proctorFlag,
      integrityScore: score,
      violationCount: violations.length,
      timestamp: new Date().toISOString(),
    });

    log.success(`proctoring done for ${interviewId} (score=${score}, flag=${proctorFlag})`);
  } catch (err) {
    log.error(`proctoring failed for ${interviewId}: ${err.message}`);
    // Still publish so fitment proceeds with safe defaults.
    try {
      await publish('karigar.proctor.complete', {
        interviewId, proctorFlag: false, integrityScore: 100, violationCount: 0,
        timestamp: new Date().toISOString(), error: err.message,
      });
    } catch (_) { /* swallow */ }
  }
}

async function main() {
  log.boot('starting proctoring worker');
  process.on('uncaughtException', (e) => log.error(`uncaughtException: ${e.message}`));
  process.on('unhandledRejection', (e) => log.error(`unhandledRejection: ${e?.message || e}`));

  await startConsumer({
    topic: 'karigar.proctor.submitted',
    groupId: 'proctoring-workers',
    instanceId: 'proctor-1',
    handler: handle,
  });
}

main().catch(async (err) => {
  log.error(`fatal: ${err.message}`);
  await closePool().catch(() => {});
  process.exit(1);
});
