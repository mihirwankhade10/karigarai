// Candidate-facing routes:
//   POST /api/candidates/register   \u2014 selfie + form fields, generates 12 questions
//   GET  /api/candidates/:id/questions
//   GET  /api/candidates/:id/status

const { v4: uuid } = require('uuid');
const { uploadSelfie } = require('../services/cloudinary.service');
const { generateQuestions } = require('../services/question.service');
const { setQuestions, getQuestions } = require('../../../lib/statusStore');
const { publish } = require('../../../lib/kafka');

const registerSchema = {
  tags: ['Candidates'],
  summary: 'Register a candidate',
  description:
    'Multipart form: name, phone, district, tradeCategory, language, plus a selfie image file. Uploads the selfie to Cloudinary, persists the candidate, generates 12 trade-specific questions via LangChain, caches them in Redis (24h), and emits a GENERATE_EMBEDDING event so the fraud worker can pre-compute the candidate\'s face embedding.',
  consumes: ['multipart/form-data'],
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        candidateId: { type: 'string' },
        interviewToken: { type: 'string' },
        message: { type: 'string' },
      },
    },
    400: {
      type: 'object',
      properties: { error: { type: 'string' }, message: { type: 'string' } },
    },
    409: {
      type: 'object',
      properties: { error: { type: 'string' }, message: { type: 'string' } },
    },
  },
};

const questionsSchema = {
  tags: ['Candidates'],
  summary: 'Get the 12 generated questions for a candidate',
  description:
    'Returns the 12 interview questions in EN/KN/HI for the given candidate. Cached in Redis after registration for 24 hours; falls back to DB on cache miss.',
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        candidateId: { type: 'string' },
        language: { type: 'string' },
        questions: { type: 'array', items: { type: 'object' } },
      },
    },
    404: {
      type: 'object',
      properties: { error: { type: 'string' }, message: { type: 'string' } },
    },
  },
};

const statusSchema = {
  tags: ['Candidates'],
  summary: 'Candidate progress / interview status',
  description: 'Returns candidate identity and the most recent interview status (if any).',
  params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
  response: {
    200: { type: 'object' },
    404: { type: 'object' },
  },
};

module.exports = async function candidateRoutes(fastify) {
  fastify.post('/register', { schema: registerSchema }, async (req, reply) => {
    // ---- parse multipart ---------------------------------------------------
    const fields = {};
    let selfieBuffer = null;
    try {
      for await (const part of req.parts()) {
        if (part.file) {
          if (part.fieldname === 'selfie') {
            selfieBuffer = await part.toBuffer();
          } else {
            // drain other unexpected files
            await part.toBuffer();
          }
        } else {
          fields[part.fieldname] = part.value;
        }
      }
    } catch (err) {
      return reply.code(400).send({ error: 'BadRequest', message: `multipart parse failed: ${err.message}` });
    }

    const { name, phone, district, tradeCategory, language } = fields;
    if (!name || !phone || !district || !tradeCategory) {
      return reply.code(400).send({
        error: 'BadRequest',
        message: 'name, phone, district, tradeCategory are required',
      });
    }
    if (!selfieBuffer) {
      return reply.code(400).send({ error: 'BadRequest', message: 'selfie file is required' });
    }
    const lang = (language || 'kannada').toLowerCase();

    // ---- duplicate-phone check --------------------------------------------
    const dup = await fastify.db.query(`SELECT id FROM candidates WHERE phone = $1 LIMIT 1`, [phone]);
    if (dup.rowCount > 0) {
      return reply.code(409).send({ error: 'Conflict', message: 'A candidate with this phone already exists.' });
    }

    // ---- upload selfie -----------------------------------------------------
    const candidateId = uuid();
    let selfieUrl;
    try {
      selfieUrl = await uploadSelfie(selfieBuffer, candidateId);
    } catch (err) {
      req.log.error({ err }, 'cloudinary selfie upload failed');
      return reply.code(500).send({ error: 'UploadFailed', message: 'Could not upload selfie' });
    }

    // ---- insert candidate (face_embedding populated later by fraud worker) -
    const interviewToken = uuid();
    await fastify.db.query(
      `INSERT INTO candidates (id, name, phone, district, trade_category, language, selfie_url, interview_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [candidateId, name, phone, district, tradeCategory, lang, selfieUrl, interviewToken]
    );

    // ---- LangChain question generation -------------------------------------
    const { questions, fallback } = await generateQuestions({ trade: tradeCategory, district, language: lang });

    // ---- persist questions -------------------------------------------------
    const insertText = `INSERT INTO interview_questions
        (candidate_id, question_order, question_type, question_text_en, question_text_kn, question_text_hi, difficulty_level, is_ai_question)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;
    for (const q of questions) {
      await fastify.db.query(insertText, [
        candidateId,
        q.order,
        q.type,
        q.question_en,
        q.question_kn,
        q.question_hi,
        q.difficulty_level,
        q.is_ai_question,
      ]);
    }

    // ---- cache questions in Redis -----------------------------------------
    try {
      await setQuestions(candidateId, questions);
    } catch (err) {
      req.log.warn({ err }, 'redis cache of questions failed (non-fatal)');
    }

    // ---- emit GENERATE_EMBEDDING side-channel -----------------------------
    // Fraud worker pre-computes the candidate's face embedding from the
    // selfie at registration time so it has a baseline ready for the later
    // similarity check.
    try {
      await publish('karigar.video.uploaded', {
        type: 'GENERATE_EMBEDDING',
        candidateId,
        selfieUrl,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      req.log.warn({ err }, 'kafka publish GENERATE_EMBEDDING failed (non-fatal)');
    }

    return reply.code(201).send({
      success: true,
      candidateId,
      interviewToken,
      message: fallback
        ? 'Registered. Question generation used fallback bank (LLM unavailable).'
        : 'Registered. 12 personalised questions ready.',
    });
  });

  fastify.get('/:id/questions', { schema: questionsSchema }, async (req, reply) => {
    const { id } = req.params;

    // candidate must exist + we want their language
    const c = await fastify.db.query(
      `SELECT id, language FROM candidates WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (c.rowCount === 0) {
      return reply.code(404).send({ error: 'NotFound', message: 'Candidate not found' });
    }
    const language = c.rows[0].language;

    // try Redis first
    try {
      const cached = await getQuestions(id);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return { candidateId: id, language, questions: cached };
      }
    } catch (err) {
      req.log.warn({ err }, 'redis question cache read failed');
    }

    // DB fallback
    const { rows } = await fastify.db.query(
      `SELECT id, question_order AS order, question_type AS type,
              question_text_en AS question_en, question_text_kn AS question_kn, question_text_hi AS question_hi,
              difficulty_level, is_ai_question
         FROM interview_questions
        WHERE candidate_id = $1
        ORDER BY question_order ASC`,
      [id]
    );

    return { candidateId: id, language, questions: rows };
  });

  fastify.get('/:id/status', { schema: statusSchema }, async (req, reply) => {
    const { id } = req.params;
    const { rows } = await fastify.db.query(
      `SELECT c.id, c.name, c.phone, c.district, c.trade_category, c.language,
              i.id AS interview_id, i.status AS interview_status, i.fitment_category, i.acs_score, i.created_at AS interview_started_at
         FROM candidates c
         LEFT JOIN LATERAL (
           SELECT id, status, fitment_category, acs_score, created_at
             FROM interviews
            WHERE candidate_id = c.id
            ORDER BY created_at DESC
            LIMIT 1
         ) i ON TRUE
        WHERE c.id = $1`,
      [id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'NotFound', message: 'Candidate not found' });
    return rows[0];
  });
};
