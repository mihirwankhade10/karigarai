// Admin dashboard routes. ALL routes require JWT auth via the onRequest hook.
//
// District-based access control: a non-`admin` user whose district is not
// "All Districts" is automatically restricted to candidates in their own
// district, regardless of any `district` query parameter.

const bcrypt = require('bcryptjs');

function applyDistrictScope(req, queryDistrict) {
  // Returns the effective district filter or null for unrestricted.
  if (req.user.role === 'admin' && (req.user.district === 'All Districts' || !req.user.district)) {
    return queryDistrict || null; // admin can freely filter
  }
  // Non-admin or admin scoped to a district: lock to their own district.
  return req.user.district;
}

const csvEscape = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

module.exports = async function adminRoutes(fastify) {
  // Apply auth to every route in this plugin scope.
  fastify.addHook('onRequest', fastify.authenticate);

  // ====================================================================
  // GET /api/admin/candidates  \u2014 paginated, filterable list
  // ====================================================================
  fastify.get('/candidates', {
    schema: {
      tags: ['Admin'],
      summary: 'List candidates with filters and pagination',
      description:
        'Powerful candidate list. Supports filters (district, tradeCategory, fitmentCategory, language, status, shortlisted, fraudFlag, proctorFlag, search by name/phone, dateFrom, dateTo) and pagination. Non-admin users are auto-scoped to their own district.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          district: { type: 'string' },
          tradeCategory: { type: 'string' },
          fitmentCategory: { type: 'string' },
          language: { type: 'string' },
          status: { type: 'string' },
          shortlisted: { type: 'string' },
          fraudFlag: { type: 'string' },
          proctorFlag: { type: 'string' },
          search: { type: 'string' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          page: { type: 'integer', default: 1, minimum: 1 },
          limit: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            candidates: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, async (req) => {
    const q = req.query;
    const params = [];
    const where = [];
    const add = (clause, value) => {
      params.push(value);
      where.push(clause.replace('?', `$${params.length}`));
    };

    const districtFilter = applyDistrictScope(req, q.district);
    if (districtFilter) add('c.district = ?', districtFilter);

    if (q.tradeCategory) add('c.trade_category = ?', q.tradeCategory);
    if (q.fitmentCategory) add('i.fitment_category = ?', q.fitmentCategory);
    if (q.language) add('c.language = ?', q.language);
    if (q.status) add('i.status = ?', q.status);
    if (q.shortlisted === 'true') where.push('i.shortlisted = TRUE');
    if (q.shortlisted === 'false') where.push('(i.shortlisted = FALSE OR i.shortlisted IS NULL)');
    if (q.fraudFlag === 'true') where.push('i.fraud_flag = TRUE');
    if (q.proctorFlag === 'true') where.push('i.proctor_flag = TRUE');
    if (q.search) {
      params.push(`%${q.search}%`);
      params.push(`%${q.search}%`);
      where.push(`(c.name ILIKE $${params.length - 1} OR c.phone ILIKE $${params.length})`);
    }
    if (q.dateFrom) add('c.created_at >= ?', q.dateFrom);
    if (q.dateTo) add('c.created_at <= ?', q.dateTo);

    const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const page = Math.max(1, parseInt(q.page) || 1);
    const limit = Math.min(100, parseInt(q.limit) || 10);
    const offset = (page - 1) * limit;

    const baseFrom = `
      FROM candidates c
      LEFT JOIN LATERAL (
        SELECT id, status, fitment_category, workforce_segment, acs_score,
               relevance_score, clarity_score, skill_confidence_score,
               fraud_flag, proctor_flag, proctor_integrity_score,
               shortlisted, shortlisted_at, created_at AS interview_started_at,
               ai_summary_en, ai_summary_kn
          FROM interviews
         WHERE candidate_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
      ) i ON TRUE
      ${whereSQL}
    `;

    const totalQ = await fastify.db.query(`SELECT COUNT(*) AS n ${baseFrom}`, params);
    const total = parseInt(totalQ.rows[0].n);

    const dataQ = await fastify.db.query(
      `SELECT c.id, c.name, c.phone, c.district, c.trade_category, c.language, c.selfie_url, c.created_at,
              i.id AS interview_id, i.status, i.fitment_category, i.workforce_segment,
              i.acs_score, i.relevance_score, i.clarity_score, i.skill_confidence_score,
              i.fraud_flag, i.proctor_flag, i.proctor_integrity_score,
              i.shortlisted, i.shortlisted_at, i.interview_started_at,
              i.ai_summary_en, i.ai_summary_kn
        ${baseFrom}
        ORDER BY c.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      candidates: dataQ.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  });

  // ====================================================================
  // GET /api/admin/candidates/:id  \u2014 full detail
  // ====================================================================
  fastify.get('/candidates/:id', {
    schema: {
      tags: ['Admin'],
      summary: 'Candidate detail (full)',
      description: 'Returns the candidate, their latest interview, all proctor violations, and all questions.',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      response: { 200: { type: 'object' }, 404: { type: 'object' } },
    },
  }, async (req, reply) => {
    const { id } = req.params;
    const c = await fastify.db.query(
      `SELECT id, name, phone, district, trade_category, language, selfie_url, is_active, created_at
         FROM candidates WHERE id = $1`,
      [id]
    );
    if (c.rowCount === 0) return reply.code(404).send({ error: 'NotFound', message: 'Candidate not found' });

    const candidate = c.rows[0];
    const districtFilter = applyDistrictScope(req, null);
    if (districtFilter && candidate.district !== districtFilter) {
      return reply.code(404).send({ error: 'NotFound', message: 'Candidate not in your scope' });
    }

    const i = await fastify.db.query(
      `SELECT * FROM interviews WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    const interview = i.rows[0] || null;

    let violations = [];
    let questions = [];
    if (interview) {
      const v = await fastify.db.query(
        `SELECT * FROM proctor_violations WHERE interview_id = $1 ORDER BY timestamp_seconds NULLS LAST`,
        [interview.id]
      );
      violations = v.rows;
    }
    const q = await fastify.db.query(
      `SELECT id, question_order, question_type, question_text_en, question_text_kn, question_text_hi,
              difficulty_level, is_ai_question
         FROM interview_questions WHERE candidate_id = $1 ORDER BY question_order ASC`,
      [id]
    );
    questions = q.rows;

    return { candidate, interview, violations, questions };
  });

  // ====================================================================
  // PATCH /api/admin/candidates/:id/shortlist
  // ====================================================================
  fastify.patch('/candidates/:id/shortlist', {
    schema: {
      tags: ['Admin'],
      summary: 'Shortlist or remove a candidate',
      description: 'Body: { action: "shortlist"|"remove", notes?: string }. Updates interviews.shortlisted and writes a shortlist_audit row.',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['shortlist', 'remove'] },
          notes: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' }, 404: { type: 'object' } },
    },
  }, async (req, reply) => {
    const { id } = req.params;
    const { action, notes } = req.body;

    const cand = await fastify.db.query(`SELECT id, district FROM candidates WHERE id = $1`, [id]);
    if (cand.rowCount === 0) return reply.code(404).send({ error: 'NotFound' });
    const districtFilter = applyDistrictScope(req, null);
    if (districtFilter && cand.rows[0].district !== districtFilter) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Candidate not in your scope' });
    }

    const intv = await fastify.db.query(
      `SELECT id FROM interviews WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    if (intv.rowCount === 0) {
      return reply.code(404).send({ error: 'NotFound', message: 'No interview to shortlist' });
    }
    const interviewId = intv.rows[0].id;
    const shortlisted = action === 'shortlist';

    await fastify.db.query(
      `UPDATE interviews
          SET shortlisted = $1,
              shortlisted_by = $2,
              shortlisted_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
              updated_at = NOW()
        WHERE id = $3`,
      [shortlisted, req.user.adminId, interviewId]
    );

    await fastify.db.query(
      `INSERT INTO shortlist_audit (interview_id, admin_id, action, notes) VALUES ($1, $2, $3, $4)`,
      [interviewId, req.user.adminId, action, notes || null]
    );

    return { success: true, interviewId, shortlisted };
  });

  // ====================================================================
  // PATCH /api/admin/interviews/:id/resolve-flag
  // ====================================================================
  fastify.patch('/interviews/:id/resolve-flag', {
    schema: {
      tags: ['Admin'],
      summary: 'Resolve a fraud or proctor flag',
      description:
        'Body: { resolution: "confirmed_fraud"|"cleared"|"manual_review", notes?: string }. confirmed_fraud locks fitment to suspected_fraud; cleared clears both flags; all paths set reviewed_by/at, admin_notes, status="reviewed".',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        required: ['resolution'],
        properties: {
          resolution: { type: 'string', enum: ['confirmed_fraud', 'cleared', 'manual_review'] },
          notes: { type: 'string' },
        },
      },
      response: { 200: { type: 'object' }, 404: { type: 'object' } },
    },
  }, async (req, reply) => {
    const { id } = req.params;
    const { resolution, notes } = req.body;

    const r = await fastify.db.query(
      `SELECT i.id, c.district FROM interviews i JOIN candidates c ON c.id = i.candidate_id WHERE i.id = $1`,
      [id]
    );
    if (r.rowCount === 0) return reply.code(404).send({ error: 'NotFound' });
    const districtFilter = applyDistrictScope(req, null);
    if (districtFilter && r.rows[0].district !== districtFilter) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    let updates = `reviewed_by = $1, reviewed_at = NOW(), admin_notes = $2, status = 'reviewed', updated_at = NOW()`;
    const params = [req.user.adminId, notes || null];
    if (resolution === 'confirmed_fraud') {
      updates += `, fitment_category = 'suspected_fraud', fraud_flag = TRUE`;
    } else if (resolution === 'cleared') {
      updates += `, fraud_flag = FALSE, proctor_flag = FALSE`;
    }
    params.push(id);

    await fastify.db.query(`UPDATE interviews SET ${updates} WHERE id = $${params.length}`, params);

    return { success: true, resolution };
  });

  // ====================================================================
  // GET /api/admin/analytics  \u2014 6 parallel queries
  // ====================================================================
  fastify.get('/analytics', {
    schema: {
      tags: ['Admin'],
      summary: 'Dashboard analytics',
      description:
        'Aggregates: totals, fitment distribution, district breakdown (top 10), 7-day daily intake, language distribution, trade distribution. Non-admin users are auto-scoped to their district.',
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'object' } },
    },
  }, async (req) => {
    const districtFilter = applyDistrictScope(req, null);
    const districtClause = districtFilter ? `WHERE c.district = $1` : '';
    const districtClauseAnd = districtFilter ? `AND c.district = $1` : '';
    const params = districtFilter ? [districtFilter] : [];

    const [totals, fitment, district, daily, language, trade] = await Promise.all([
      fastify.db.query(
        `SELECT
            COUNT(DISTINCT c.id) AS total_candidates,
            COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN c.id END) AS processed,
            COUNT(DISTINCT CASE WHEN i.fitment_category = 'job_ready' THEN c.id END) AS job_ready,
            COUNT(DISTINCT CASE WHEN i.fraud_flag = TRUE OR i.proctor_flag = TRUE THEN c.id END) AS flagged,
            COUNT(DISTINCT CASE WHEN i.shortlisted = TRUE THEN c.id END) AS shortlisted,
            COUNT(DISTINCT CASE WHEN c.created_at::date = CURRENT_DATE THEN c.id END) AS today
           FROM candidates c
           LEFT JOIN interviews i ON i.candidate_id = c.id
           ${districtClause}`,
        params
      ),
      fastify.db.query(
        `SELECT i.fitment_category, COUNT(*) AS count
           FROM interviews i JOIN candidates c ON c.id = i.candidate_id
          WHERE i.fitment_category IS NOT NULL ${districtClauseAnd}
          GROUP BY i.fitment_category
          ORDER BY count DESC`,
        params
      ),
      fastify.db.query(
        districtFilter
          ? `SELECT $1::text AS district, COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE i.fitment_category = 'job_ready') AS job_ready
               FROM candidates c LEFT JOIN interviews i ON i.candidate_id = c.id
              WHERE c.district = $1`
          : `SELECT c.district, COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE i.fitment_category = 'job_ready') AS job_ready
               FROM candidates c LEFT JOIN interviews i ON i.candidate_id = c.id
              GROUP BY c.district
              ORDER BY total DESC
              LIMIT 10`,
        params
      ),
      fastify.db.query(
        `SELECT (CURRENT_DATE - i)::date AS date, 0 AS count
           FROM generate_series(0, 6) AS i
           ORDER BY date ASC`,
        []
      ).then(async (skeleton) => {
        const real = await fastify.db.query(
          `SELECT c.created_at::date AS date, COUNT(*)::int AS count
             FROM candidates c
            WHERE c.created_at >= CURRENT_DATE - INTERVAL '6 days' ${districtClauseAnd}
            GROUP BY c.created_at::date
            ORDER BY date ASC`,
          params
        );
        const map = new Map(real.rows.map((r) => [r.date.toISOString().slice(0, 10), r.count]));
        return {
          rows: skeleton.rows.map((r) => ({
            date: r.date.toISOString().slice(0, 10),
            count: map.get(r.date.toISOString().slice(0, 10)) || 0,
          })),
        };
      }),
      fastify.db.query(
        `SELECT c.language, COUNT(*) AS count
           FROM candidates c ${districtClause}
          GROUP BY c.language ORDER BY count DESC`,
        params
      ),
      fastify.db.query(
        `SELECT c.trade_category, COUNT(*) AS count
           FROM candidates c ${districtClause}
          GROUP BY c.trade_category ORDER BY count DESC`,
        params
      ),
    ]);

    return {
      totals: totals.rows[0],
      fitmentDistribution: fitment.rows,
      districts: district.rows,
      dailyIntake: daily.rows,
      languageDistribution: language.rows,
      tradeDistribution: trade.rows,
    };
  });

  // ====================================================================
  // GET /api/admin/flagged
  // ====================================================================
  fastify.get('/flagged', {
    schema: {
      tags: ['Admin'],
      summary: 'List flagged interviews (fraud or proctoring)',
      description: 'Returns interviews where fraud_flag OR proctor_flag is true, ordered by created_at desc. Includes violation count and snapshot count.',
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'object', properties: { flagged: { type: 'array' } } } },
    },
  }, async (req) => {
    const districtFilter = applyDistrictScope(req, null);
    const params = districtFilter ? [districtFilter] : [];
    const districtClause = districtFilter ? `AND c.district = $1` : '';
    const { rows } = await fastify.db.query(
      `SELECT i.id AS interview_id, i.fraud_flag, i.fraud_reason, i.fraud_similarity,
              i.proctor_flag, i.proctor_integrity_score, i.status, i.created_at,
              c.id AS candidate_id, c.name, c.phone, c.district, c.trade_category, c.selfie_url,
              (SELECT COUNT(*) FROM proctor_violations pv WHERE pv.interview_id = i.id) AS violation_count,
              (SELECT COUNT(*) FROM proctor_violations pv WHERE pv.interview_id = i.id AND pv.snapshot_url IS NOT NULL) AS snapshot_count
         FROM interviews i
         JOIN candidates c ON c.id = i.candidate_id
        WHERE (i.fraud_flag = TRUE OR i.proctor_flag = TRUE) ${districtClause}
        ORDER BY i.created_at DESC`,
      params
    );
    return { flagged: rows };
  });

  // ====================================================================
  // GET /api/admin/shortlisted
  // ====================================================================
  fastify.get('/shortlisted', {
    schema: {
      tags: ['Admin'],
      summary: 'List shortlisted candidates',
      description: 'Returns shortlisted interviews joined with the admin who shortlisted them.',
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'object' } },
    },
  }, async (req) => {
    const districtFilter = applyDistrictScope(req, null);
    const params = districtFilter ? [districtFilter] : [];
    const districtClause = districtFilter ? `AND c.district = $1` : '';
    const { rows } = await fastify.db.query(
      `SELECT i.id AS interview_id, i.shortlisted_at, i.acs_score, i.fitment_category, i.workforce_segment,
              c.id AS candidate_id, c.name, c.phone, c.district, c.trade_category, c.language, c.selfie_url,
              au.id AS admin_id, au.name AS admin_name
         FROM interviews i
         JOIN candidates c ON c.id = i.candidate_id
         LEFT JOIN admin_users au ON au.id = i.shortlisted_by
        WHERE i.shortlisted = TRUE ${districtClause}
        ORDER BY i.shortlisted_at DESC`,
      params
    );
    return { shortlisted: rows };
  });

  // ====================================================================
  // GET /api/admin/export/csv
  // ====================================================================
  fastify.get('/export/csv', {
    schema: {
      tags: ['Admin'],
      summary: 'Export shortlisted candidates as CSV',
      description: 'Streams a RFC-4180 compliant CSV with one row per shortlisted candidate. Headers: Name, Phone, District, Trade, Language, ACS Score, Fitment Category, Workforce Segment, Interview Date.',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    const districtFilter = applyDistrictScope(req, null);
    const params = districtFilter ? [districtFilter] : [];
    const districtClause = districtFilter ? `AND c.district = $1` : '';
    const { rows } = await fastify.db.query(
      `SELECT c.name, c.phone, c.district, c.trade_category, c.language,
              i.acs_score, i.fitment_category, i.workforce_segment, i.shortlisted_at
         FROM interviews i JOIN candidates c ON c.id = i.candidate_id
        WHERE i.shortlisted = TRUE ${districtClause}
        ORDER BY i.shortlisted_at DESC`,
      params
    );

    const headers = ['Name', 'Phone', 'District', 'Trade', 'Language', 'ACS Score', 'Fitment Category', 'Workforce Segment', 'Interview Date'];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push([
        csvEscape(r.name),
        csvEscape(r.phone),
        csvEscape(r.district),
        csvEscape(r.trade_category),
        csvEscape(r.language),
        csvEscape(r.acs_score),
        csvEscape(r.fitment_category),
        csvEscape(r.workforce_segment),
        csvEscape(r.shortlisted_at ? new Date(r.shortlisted_at).toISOString() : ''),
      ].join(','));
    }
    const body = lines.join('\r\n');

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="karigarai-shortlisted.csv"')
      .send(body);
  });

  // ====================================================================
  // GET /api/admin/stats/district/:district
  // ====================================================================
  fastify.get('/stats/district/:district', {
    schema: {
      tags: ['Admin'],
      summary: 'District-specific stats (drill-down)',
      description: 'Totals, fitment breakdown, top trades, daily trend for the specified district.',
      security: [{ bearerAuth: [] }],
      params: { type: 'object', required: ['district'], properties: { district: { type: 'string' } } },
      response: { 200: { type: 'object' }, 403: { type: 'object' } },
    },
  }, async (req, reply) => {
    const { district } = req.params;
    const scope = applyDistrictScope(req, district);
    if (scope && scope !== district) {
      return reply.code(403).send({ error: 'Forbidden', message: 'District out of scope' });
    }

    const [totals, fitment, trades, daily] = await Promise.all([
      fastify.db.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE i.fitment_category = 'job_ready') AS job_ready,
                COUNT(*) FILTER (WHERE i.shortlisted = TRUE) AS shortlisted
           FROM candidates c LEFT JOIN interviews i ON i.candidate_id = c.id
          WHERE c.district = $1`,
        [district]
      ),
      fastify.db.query(
        `SELECT i.fitment_category, COUNT(*) AS count
           FROM interviews i JOIN candidates c ON c.id = i.candidate_id
          WHERE c.district = $1 AND i.fitment_category IS NOT NULL
          GROUP BY i.fitment_category ORDER BY count DESC`,
        [district]
      ),
      fastify.db.query(
        `SELECT c.trade_category, COUNT(*) AS count
           FROM candidates c WHERE c.district = $1
          GROUP BY c.trade_category ORDER BY count DESC LIMIT 10`,
        [district]
      ),
      fastify.db.query(
        `SELECT c.created_at::date AS date, COUNT(*)::int AS count
           FROM candidates c
          WHERE c.district = $1 AND c.created_at >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY c.created_at::date ORDER BY date ASC`,
        [district]
      ),
    ]);

    return {
      district,
      totals: totals.rows[0],
      fitmentDistribution: fitment.rows,
      topTrades: trades.rows,
      dailyTrend: daily.rows,
    };
  });

  // ====================================================================
  // POST /api/admin/users  \u2014 admin role only
  // ====================================================================
  fastify.post('/users', {
    onRequest: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      tags: ['Admin'],
      summary: 'Create a new admin user',
      description: 'Admin role only. Body: { name, email, password, district, role }. Hashes password with bcrypt rounds 10. Returns new user without password_hash.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'email', 'password', 'district', 'role'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          district: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'reviewer', 'district_officer'] },
        },
      },
      response: { 201: { type: 'object' }, 409: { type: 'object' } },
    },
  }, async (req, reply) => {
    const { name, email, password, district, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
      const r = await fastify.db.query(
        `INSERT INTO admin_users (name, email, password_hash, district, role)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, name, email, district, role, is_active, created_at`,
        [name, email, hash, district, role]
      );
      return reply.code(201).send(r.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ error: 'Conflict', message: 'Email already exists' });
      }
      throw err;
    }
  });
};
