// Interview-flow routes:
//   POST /api/interviews/submit       \u2014 multipart video + metadata, kicks pipeline
//   GET  /api/interviews/:id/status   \u2014 polled every 3s by FE, served from Redis
//   POST /api/interviews/ai-respond   \u2014 LangChain reply for Q12
//   GET  /api/interviews/:id/result   \u2014 full result (DB) when complete

const { v4: uuid } = require('uuid');
const { uploadInterviewVideo } = require('../services/cloudinary.service');
const { generateAIResponse } = require('../services/aiResponse.service');
const { setStatus, getStatus, statusKey } = require('../../../lib/statusStore');

const submitSchema = {
  tags: ['Interviews'],
  summary: 'Submit a recorded interview',
  description:
    'Multipart form: video file plus metadata fields (candidateId, optional proctoringSummary as JSON string). Uploads the video to Cloudinary, creates an interviews row, sets the initial Redis status (uploaded), publishes karigar.video.uploaded, and \u2014 if proctoring data was provided \u2014 also publishes karigar.proctor.submitted. The FE then polls /:id/status.',
  consumes: ['multipart/form-data'],
  response: {
    202: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        interviewId: { type: 'string' },
        message: { type: 'string' },
      },
    },
    400: { type: 'object' },
    404: { type: 'object' },
  },
};

const statusSchemaDef = {
  tags: ['Interviews'],
  summary: 'Real-time interview pipeline status',
  description:
    'Frontend polls this endpoint every 3 seconds. Reads ONLY from Redis for sub-50ms responses. When status is "complete", a full result object is embedded.',
  params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
  response: {
    200: { type: 'object' },
    404: { type: 'object' },
  },
};

const aiRespondSchema = {
  tags: ['Interviews'],
  summary: 'Generate friendly AI reply for Q12',
  description:
    'Called only for the closing question (Q12). Takes the candidate\'s question and returns a brief 3-sentence reply in the candidate\'s language.',
  body: {
    type: 'object',
    required: ['candidateId', 'question'],
    properties: {
      candidateId: { type: 'string', format: 'uuid' },
      question: { type: 'string', minLength: 1, maxLength: 500 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        response: { type: 'string' },
        language: { type: 'string' },
      },
    },
    404: { type: 'object' },
  },
};

const resultSchema = {
  tags: ['Interviews'],
  summary: 'Full interview result',
  description:
    'Returns the complete interview result: scores, AI summaries (EN/KN), key observations, fitment, and proctor violations. Used by the candidate result screen.',
  params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
  response: {
    200: { type: 'object' },
    404: { type: 'object' },
  },
};

module.exports = async function interviewRoutes(fastify) {
  fastify.post('/submit', { schema: submitSchema }, async (req, reply) => {
    // ---- parse multipart ---------------------------------------------------
    const fields = {};
    let videoBuffer = null;
    try {
      for await (const part of req.parts()) {
        if (part.file) {
          if (part.fieldname === 'video') {
            videoBuffer = await part.toBuffer();
          } else {
            await part.toBuffer();
          }
        } else {
          fields[part.fieldname] = part.value;
        }
      }
    } catch (err) {
      return reply.code(400).send({ error: 'BadRequest', message: `multipart parse failed: ${err.message}` });
    }

    const { candidateId } = fields;
    if (!candidateId) {
      return reply.code(400).send({ error: 'BadRequest', message: 'candidateId is required' });
    }
    if (!videoBuffer) {
      return reply.code(400).send({ error: 'BadRequest', message: 'video file is required' });
    }

    let proctoringSummary = null;
    if (fields.proctoringSummary) {
      try { proctoringSummary = JSON.parse(fields.proctoringSummary); } catch (_) { /* tolerate */ }
    }

    // ---- candidate must exist ---------------------------------------------
    const c = await fastify.db.query(
      `SELECT id, language, trade_category, district FROM candidates WHERE id = $1 LIMIT 1`,
      [candidateId]
    );
    if (c.rowCount === 0) {
      return reply.code(404).send({ error: 'NotFound', message: 'Candidate not found' });
    }
    const candidate = c.rows[0];

    // ---- upload video ------------------------------------------------------
    let videoUrl;
    try {
      videoUrl = await uploadInterviewVideo(videoBuffer, candidateId);
    } catch (err) {
      req.log.error({ err }, 'cloudinary video upload failed');
      return reply.code(500).send({ error: 'UploadFailed', message: 'Could not upload video' });
    }

    const interviewId = uuid();
    await fastify.db.query(
      `INSERT INTO interviews (id, candidate_id, video_url, status)
       VALUES ($1, $2, $3, 'processing')`,
      [interviewId, candidateId, videoUrl]
    );

    // ---- initial Redis status ---------------------------------------------
    await setStatus(interviewId, {
      status: 'processing',
      step: 'uploaded',
      progress: 15,
    });

    // ---- emit pipeline trigger --------------------------------------------
    try {
      await fastify.kafka.publish('karigar.video.uploaded', {
        type: 'PROCESS',
        interviewId,
        candidateId,
        videoUrl,
        language: candidate.language,
        tradeCategory: candidate.trade_category,
        district: candidate.district,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      req.log.error({ err }, 'kafka publish video.uploaded failed');
      return reply.code(500).send({ error: 'PublishFailed', message: 'Could not start pipeline' });
    }

    // ---- proctoring side-channel ------------------------------------------
    if (proctoringSummary) {
      try {
        await fastify.kafka.publish('karigar.proctor.submitted', {
          interviewId,
          candidateId,
          violations: proctoringSummary.violations || [],
          totalViolations: proctoringSummary.totalViolations || (proctoringSummary.violations || []).length,
          tabSwitches: proctoringSummary.tabSwitches || 0,
          fullscreenExits: proctoringSummary.fullscreenExits || 0,
          snapshotUrls: proctoringSummary.snapshotUrls || [],
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        req.log.warn({ err }, 'kafka publish proctor.submitted failed (non-fatal)');
      }
    } else {
      // No client-side proctoring data \u2014 publish a synthetic empty event so
      // the fitment worker still receives a proctor.complete signal.
      try {
        await fastify.kafka.publish('karigar.proctor.submitted', {
          interviewId,
          candidateId,
          violations: [],
          totalViolations: 0,
          tabSwitches: 0,
          fullscreenExits: 0,
          snapshotUrls: [],
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        req.log.warn({ err }, 'synthetic proctor.submitted failed (non-fatal)');
      }
    }

    return reply.code(202).send({
      success: true,
      interviewId,
      message: 'Interview accepted; pipeline started.',
    });
  });

  fastify.get('/:id/status', { schema: statusSchemaDef }, async (req, reply) => {
    const { id } = req.params;
    const cached = await getStatus(id).catch(() => null);
    if (cached) return cached;

    // Redis miss \u2014 last-resort DB peek
    const { rows } = await fastify.db.query(
      `SELECT i.id, i.status, i.fitment_category, i.acs_score, c.name AS candidate_name
         FROM interviews i JOIN candidates c ON c.id = i.candidate_id
        WHERE i.id = $1`,
      [id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'NotFound', message: 'Interview not found' });
    return {
      status: rows[0].status,
      step: rows[0].status === 'complete' ? 'done' : 'unknown',
      fitmentCategory: rows[0].fitment_category,
      acsScore: rows[0].acs_score,
      progress: rows[0].status === 'complete' ? 100 : 50,
    };
  });

  fastify.post('/ai-respond', { schema: aiRespondSchema }, async (req, reply) => {
    const { candidateId, question } = req.body;
    const { rows } = await fastify.db.query(
      `SELECT trade_category, district, language FROM candidates WHERE id = $1`,
      [candidateId]
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'NotFound', message: 'Candidate not found' });

    const text = await generateAIResponse({
      candidateQuestion: question,
      trade: rows[0].trade_category,
      district: rows[0].district,
      language: rows[0].language,
    });

    return { success: true, response: text, language: rows[0].language };
  });

  fastify.get('/:id/result', { schema: resultSchema }, async (req, reply) => {
    const { id } = req.params;
    const r = await fastify.db.query(
      `SELECT i.*, c.name, c.phone, c.district, c.trade_category, c.language, c.selfie_url
         FROM interviews i JOIN candidates c ON c.id = i.candidate_id
        WHERE i.id = $1`,
      [id]
    );
    if (r.rowCount === 0) return reply.code(404).send({ error: 'NotFound', message: 'Interview not found' });

    const v = await fastify.db.query(
      `SELECT id, violation_type, severity, timestamp_seconds, snapshot_url, metadata, created_at
         FROM proctor_violations
        WHERE interview_id = $1
        ORDER BY timestamp_seconds NULLS LAST, created_at ASC`,
      [id]
    );
    const q = await fastify.db.query(
      `SELECT id, question_order, question_type, question_text_en, question_text_kn, question_text_hi, is_ai_question
         FROM interview_questions
        WHERE candidate_id = $1
        ORDER BY question_order ASC`,
      [r.rows[0].candidate_id]
    );

    return { interview: r.rows[0], violations: v.rows, questions: q.rows };
  });
};
