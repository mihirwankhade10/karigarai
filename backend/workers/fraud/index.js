// Fraud worker.
//
// Subscribes (TWO consumers, separate group IDs in same process):
//   - karigar.video.uploaded       (group: fraud-embed)        \u2192 GENERATE_EMBEDDING side-channel
//   - karigar.assessment.complete  (group: fraud-similarity)   \u2192 similarity check
//
// Publishes:
//   - karigar.fraud.complete (always, even on error, so the pipeline doesn't stall)
//
// pgvector similarity:
//   SELECT id, name, phone, 1 - (face_embedding <=> $1::vector) AS similarity
//     FROM candidates
//    WHERE id <> $2 AND face_embedding IS NOT NULL
//    ORDER BY face_embedding <=> $1::vector
//    LIMIT 5

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { startConsumer, publish } = require('../../lib/kafka');
const { getPool, closePool } = require('../../lib/db');
const { setStatus } = require('../../lib/statusStore');
const { toVectorLiteral } = require('../../lib/pgvector');
const { getEmbedding } = require('./humanServer');
const { makeLogger } = require('../../lib/logger');

const log = makeLogger('fraud');

const SIMILARITY_THRESHOLD = 0.92;

// ===========================================================================
// Branch 1: GENERATE_EMBEDDING \u2014 fired at registration time.
// Pre-computes the candidate's face embedding from the selfie URL so it's
// ready for the later similarity check.
// ===========================================================================
async function handleGenerateEmbedding(body) {
  if (!body || body.type !== 'GENERATE_EMBEDDING') return;

  const { candidateId, selfieUrl } = body;
  if (!candidateId || !selfieUrl) return;

  log.fraud(`generating embedding for candidate ${candidateId}`);
  const pool = getPool();

  try {
    const embedding = await getEmbedding(selfieUrl);
    const literal = toVectorLiteral(embedding);
    await pool.query(
      `UPDATE candidates SET face_embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
      [literal, candidateId]
    );
    log.success(`embedding stored for candidate ${candidateId}`);
  } catch (err) {
    log.error(`embedding failed for candidate ${candidateId}: ${err.message}`);
    // Non-fatal \u2014 the similarity check will simply skip this candidate.
  }
}

// ===========================================================================
// Branch 2: similarity check \u2014 fired after assessment completes.
// Compares the candidate's stored embedding against all other candidates'
// embeddings using pgvector cosine distance.
// ===========================================================================
async function handleSimilarityCheck(body) {
  const { interviewId, candidateId } = body || {};
  if (!interviewId || !candidateId) return;

  log.fraud(`similarity check for interview ${interviewId}`);
  const pool = getPool();

  let fraudFlag = false;
  let fraudReason = null;
  let fraudSimilarity = null;

  try {
    await setStatus(interviewId, { status: 'processing', step: 'fraud-check', progress: 70 });

    // Make sure the candidate has an embedding. If GENERATE_EMBEDDING failed
    // earlier, retry now from selfie_url.
    let cand = await pool.query(
      `SELECT id, name, selfie_url, face_embedding IS NOT NULL AS has_embedding FROM candidates WHERE id = $1`,
      [candidateId]
    );
    if (cand.rowCount === 0) throw new Error('candidate not found');

    if (!cand.rows[0].has_embedding && cand.rows[0].selfie_url) {
      try {
        const e = await getEmbedding(cand.rows[0].selfie_url);
        await pool.query(
          `UPDATE candidates SET face_embedding = $1::vector WHERE id = $2`,
          [toVectorLiteral(e), candidateId]
        );
        cand = await pool.query(
          `SELECT id, name FROM candidates WHERE id = $1`,
          [candidateId]
        );
      } catch (err) {
        log.warn(`could not generate embedding on-the-fly: ${err.message}`);
      }
    }

    // Run similarity query.
    const sim = await pool.query(
      `SELECT id, name, phone, 1 - (face_embedding <=> (
                 SELECT face_embedding FROM candidates WHERE id = $1
              )) AS similarity
         FROM candidates
        WHERE id <> $1
          AND face_embedding IS NOT NULL
        ORDER BY face_embedding <=> (SELECT face_embedding FROM candidates WHERE id = $1)
        LIMIT 5`,
      [candidateId]
    );

    if (sim.rows.length > 0) {
      const top = sim.rows[0];
      const score = parseFloat(top.similarity);
      log.fraud(`top match: ${top.name} similarity=${score.toFixed(4)}`);
      if (score >= SIMILARITY_THRESHOLD) {
        fraudFlag = true;
        fraudSimilarity = score;
        fraudReason = `Face very similar to existing candidate "${top.name}" (phone: ${top.phone}) \u2014 similarity ${score.toFixed(3)}`;
      }
    }

    await pool.query(
      `UPDATE interviews
          SET fraud_flag = $1, fraud_reason = $2, fraud_similarity = $3, updated_at = NOW()
        WHERE id = $4`,
      [fraudFlag, fraudReason, fraudSimilarity, interviewId]
    );
  } catch (err) {
    log.error(`similarity check failed for ${interviewId}: ${err.message}`);
    // Continue \u2014 publish a fraud.complete with fraudFlag=false so fitment proceeds.
  }

  try {
    await publish('karigar.fraud.complete', {
      interviewId,
      candidateId,
      fraudFlag,
      fraudReason,
      fraudSimilarity,
      timestamp: new Date().toISOString(),
    });
    log.success(`fraud check published for ${interviewId} (flag=${fraudFlag})`);
  } catch (err) {
    log.error(`publish fraud.complete failed: ${err.message}`);
  }
}

async function main() {
  log.boot('starting fraud worker (dual subscription)');
  process.on('uncaughtException', (e) => log.error(`uncaughtException: ${e.message}`));
  process.on('unhandledRejection', (e) => log.error(`unhandledRejection: ${e?.message || e}`));

  // Two parallel consumers in the same process so each topic has its own
  // group offset and handler routing stays clean.
  await Promise.all([
    startConsumer({
      topic: 'karigar.video.uploaded',
      groupId: 'fraud-embed',
      instanceId: 'fraud-embed-1',
      handler: handleGenerateEmbedding,
    }),
    startConsumer({
      topic: 'karigar.assessment.complete',
      groupId: 'fraud-similarity',
      instanceId: 'fraud-similarity-1',
      handler: handleSimilarityCheck,
    }),
  ]);
}

main().catch(async (err) => {
  log.error(`fatal: ${err.message}`);
  await closePool().catch(() => {});
  process.exit(1);
});
