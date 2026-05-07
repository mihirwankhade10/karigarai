// Assessment worker.
//
// Subscribes:    karigar.transcript.ready  (group: assessment-workers)
// Publishes:     karigar.assessment.complete
// Side effects:  fetches questions, runs LangChain scoring chain, UPDATEs
//                interviews with all 4 scores + summaries + observations +
//                workforce_segment, sets Redis status step=assessing/scored.

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { startConsumer, publish } = require('../../lib/kafka');
const { getPool, closePool } = require('../../lib/db');
const { setStatus } = require('../../lib/statusStore');
const { score } = require('./chains/scoringChain');
const { makeLogger } = require('../../lib/logger');

const log = makeLogger('assess');

const POLYTECHNIC = new Set(['Lab Technician', 'Draughtsman', 'Machine Operator']);
const BLUE_COLLAR = new Set(['Electrician', 'Plumber', 'Carpenter', 'Welder', 'Mason']);

function classifySegment(trade) {
  if (POLYTECHNIC.has(trade)) return 'polytechnic';
  if (BLUE_COLLAR.has(trade)) return 'blue_collar';
  return 'semi_skilled';
}

async function handle(body) {
  const { interviewId, candidateId, transcript, language } = body || {};
  if (!interviewId || !candidateId) return;

  log.assess(`received transcript.ready for ${interviewId}`);
  const pool = getPool();

  try {
    await setStatus(interviewId, { status: 'processing', step: 'assessing', progress: 50 });

    const c = await pool.query(
      `SELECT trade_category, district FROM candidates WHERE id = $1`,
      [candidateId]
    );
    if (c.rowCount === 0) throw new Error('candidate not found');
    const { trade_category: trade, district } = c.rows[0];

    const q = await pool.query(
      `SELECT question_order, question_text_en
         FROM interview_questions WHERE candidate_id = $1 ORDER BY question_order ASC`,
      [candidateId]
    );
    const questionsBlock = q.rows.map((r) => `Q${r.question_order}: ${r.question_text_en}`).join('\n');

    log.assess(`scoring interview (trade=${trade}, transcript=${(transcript || '').length} chars)...`);
    const result = await score({ transcript, trade, district, language, questions: questionsBlock });

    const segment = classifySegment(trade);

    await pool.query(
      `UPDATE interviews SET
         relevance_score = $1,
         clarity_score = $2,
         skill_confidence_score = $3,
         acs_score = $4,
         ai_summary_en = $5,
         ai_summary_kn = $6,
         key_observations = $7::jsonb,
         workforce_segment = $8,
         quality_flag = $9,
         updated_at = NOW()
        WHERE id = $10`,
      [
        result.relevance_score,
        result.clarity_score,
        result.skill_confidence_score,
        result.acs_score,
        result.ai_summary_en,
        result.ai_summary_kn,
        JSON.stringify(result.key_observations || []),
        segment,
        !!result.fallback,
        interviewId,
      ]
    );

    await publish('karigar.assessment.complete', {
      interviewId,
      candidateId,
      acsScore: result.acs_score,
      timestamp: new Date().toISOString(),
    });

    log.success(`interview ${interviewId} scored: ACS=${result.acs_score}`);
  } catch (err) {
    log.error(`assessment failed for ${interviewId}: ${err.message}`);
    try {
      await pool.query(
        `UPDATE interviews SET quality_flag = TRUE, status = 'failed', updated_at = NOW() WHERE id = $1`,
        [interviewId]
      );
      await setStatus(interviewId, { status: 'failed', step: 'assessing', progress: 0, error: err.message });
    } catch (_) { /* swallow */ }
  }
}

async function main() {
  log.boot('starting assessment worker');
  process.on('uncaughtException', (e) => log.error(`uncaughtException: ${e.message}`));
  process.on('unhandledRejection', (e) => log.error(`unhandledRejection: ${e?.message || e}`));

  await startConsumer({
    topic: 'karigar.transcript.ready',
    groupId: 'assessment-workers',
    instanceId: 'assess-1',
    handler: handle,
  });
}

main().catch(async (err) => {
  log.error(`fatal: ${err.message}`);
  await closePool().catch(() => {});
  process.exit(1);
});
