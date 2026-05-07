// Migration runner. Idempotent. Wraps everything in a single transaction so a
// partial failure rolls back fully. Run with: node db/migrate.js
//
// Tables created (in FK order):
//   1. candidates
//   2. admin_users
//   3. interview_questions  (FK -> candidates)
//   4. interviews           (FK -> candidates)
//   5. proctor_violations   (FK -> interviews)
//   6. shortlist_audit      (FK -> interviews, admin_users)

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const { getPool, closePool } = require('../lib/db');
const { makeLogger } = require('../lib/logger');

const log = makeLogger('migrate');

const STATEMENTS = [
  // --- extensions -----------------------------------------------------------
  ['extension: vector', `CREATE EXTENSION IF NOT EXISTS vector;`],
  ['extension: uuid-ossp', `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`],

  // --- candidates -----------------------------------------------------------
  [
    'table: candidates',
    `
    CREATE TABLE IF NOT EXISTS candidates (
      id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name              VARCHAR(255) NOT NULL,
      phone             VARCHAR(15) UNIQUE NOT NULL,
      district          VARCHAR(100) NOT NULL,
      trade_category    VARCHAR(100) NOT NULL,
      language          VARCHAR(20) NOT NULL DEFAULT 'kannada',
      selfie_url        TEXT,
      face_embedding    vector(128),
      interview_token   VARCHAR(255) UNIQUE,
      is_active         BOOLEAN NOT NULL DEFAULT TRUE,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    `,
  ],

  // --- admin_users ----------------------------------------------------------
  [
    'table: admin_users',
    `
    CREATE TABLE IF NOT EXISTS admin_users (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name          VARCHAR(255),
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      district      VARCHAR(100),
      role          VARCHAR(20) NOT NULL DEFAULT 'reviewer'
                    CHECK (role IN ('admin','reviewer','district_officer')),
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      last_login    TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    `,
  ],

  // --- interview_questions --------------------------------------------------
  [
    'table: interview_questions',
    `
    CREATE TABLE IF NOT EXISTS interview_questions (
      id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      candidate_id      UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      question_order    INTEGER NOT NULL,
      question_type     VARCHAR(50) NOT NULL
                        CHECK (question_type IN ('intro','technical','general','situational','closing')),
      question_text_en  TEXT,
      question_text_kn  TEXT,
      question_text_hi  TEXT,
      difficulty_level  INTEGER NOT NULL DEFAULT 1,
      is_ai_question    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    `,
  ],

  // --- interviews -----------------------------------------------------------
  [
    'table: interviews',
    `
    CREATE TABLE IF NOT EXISTS interviews (
      id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      candidate_id              UUID NOT NULL REFERENCES candidates(id),
      video_url                 TEXT,
      transcript                TEXT,
      acs_score                 NUMERIC(5,2),
      relevance_score           NUMERIC(5,2),
      clarity_score             NUMERIC(5,2),
      skill_confidence_score    NUMERIC(5,2),
      fitment_category          VARCHAR(50)
                                CHECK (fitment_category IS NULL OR fitment_category IN
                                  ('job_ready','requires_upskilling','manual_review','low_confidence','suspected_fraud')),
      workforce_segment         VARCHAR(50)
                                CHECK (workforce_segment IS NULL OR workforce_segment IN
                                  ('blue_collar','polytechnic','semi_skilled')),
      ai_summary_en             TEXT,
      ai_summary_kn             TEXT,
      key_observations          JSONB NOT NULL DEFAULT '[]'::jsonb,
      fraud_flag                BOOLEAN NOT NULL DEFAULT FALSE,
      fraud_reason              TEXT,
      fraud_similarity          NUMERIC(5,4),
      quality_flag              BOOLEAN NOT NULL DEFAULT FALSE,
      proctor_flag              BOOLEAN NOT NULL DEFAULT FALSE,
      proctor_integrity_score   INTEGER NOT NULL DEFAULT 100,
      status                    VARCHAR(30) NOT NULL DEFAULT 'pending',
      shortlisted               BOOLEAN NOT NULL DEFAULT FALSE,
      shortlisted_by            UUID,
      shortlisted_at            TIMESTAMPTZ,
      reviewed_by               UUID,
      reviewed_at               TIMESTAMPTZ,
      admin_notes               TEXT,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    `,
  ],

  // --- proctor_violations ---------------------------------------------------
  [
    'table: proctor_violations',
    `
    CREATE TABLE IF NOT EXISTS proctor_violations (
      id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      interview_id      UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
      violation_type    VARCHAR(50) NOT NULL
                        CHECK (violation_type IN
                          ('TAB_SWITCH','FULLSCREEN_EXIT','NO_FACE','MULTIPLE_FACES',
                           'FACE_MISMATCH','GAZE_AWAY','MULTIPLE_BODIES')),
      severity          VARCHAR(20) NOT NULL
                        CHECK (severity IN ('low','medium','high','critical')),
      timestamp_seconds INTEGER,
      snapshot_url      TEXT,
      metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    `,
  ],

  // --- shortlist_audit ------------------------------------------------------
  [
    'table: shortlist_audit',
    `
    CREATE TABLE IF NOT EXISTS shortlist_audit (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      interview_id  UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
      admin_id      UUID NOT NULL REFERENCES admin_users(id),
      action        VARCHAR(20) NOT NULL,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    `,
  ],

  // --- indexes --------------------------------------------------------------
  ['idx: candidates.phone',          `CREATE INDEX IF NOT EXISTS idx_candidates_phone          ON candidates(phone);`],
  ['idx: candidates.district',       `CREATE INDEX IF NOT EXISTS idx_candidates_district       ON candidates(district);`],
  ['idx: candidates.trade_category', `CREATE INDEX IF NOT EXISTS idx_candidates_trade_category ON candidates(trade_category);`],
  ['idx: interviews.candidate_id',   `CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id   ON interviews(candidate_id);`],
  ['idx: interviews.status',         `CREATE INDEX IF NOT EXISTS idx_interviews_status         ON interviews(status);`],
  ['idx: interviews.fitment',        `CREATE INDEX IF NOT EXISTS idx_interviews_fitment        ON interviews(fitment_category);`],
  ['idx: interviews.shortlisted',    `CREATE INDEX IF NOT EXISTS idx_interviews_shortlisted    ON interviews(shortlisted);`],
  ['idx: interviews.fraud_flag',     `CREATE INDEX IF NOT EXISTS idx_interviews_fraud_flag     ON interviews(fraud_flag);`],
  ['idx: interviews.created_at',     `CREATE INDEX IF NOT EXISTS idx_interviews_created_at     ON interviews(created_at);`],
  ['idx: proctor_violations.interview_id', `CREATE INDEX IF NOT EXISTS idx_pv_interview_id ON proctor_violations(interview_id);`],

  // ivfflat: must use DO block because CREATE INDEX IF NOT EXISTS pre-checks
  // catalog by name, which is fine here \u2014 belt and suspenders.
  [
    'idx: candidates.face_embedding (ivfflat)',
    `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_candidates_face_embedding') THEN
        CREATE INDEX idx_candidates_face_embedding ON candidates
          USING ivfflat (face_embedding vector_cosine_ops) WITH (lists = 100);
      END IF;
    END $$;
    `,
  ],
];

async function run() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    log.boot('starting migration...');
    await client.query('BEGIN');

    for (const [label, sql] of STATEMENTS) {
      await client.query(sql);
      log.success(label);
    }

    // Seed default admin (idempotent).
    const email = 'admin@edcs.kar.gov.in';
    const password = 'Admin@123';
    const hash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO admin_users (name, email, password_hash, district, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['Super Admin', email, hash, 'All Districts', 'admin']
    );
    log.success('seed: default admin');

    await client.query('COMMIT');
    log.success('migration complete');

    console.log('\n=== Default admin credentials ===');
    console.log(`  email:    ${email}`);
    console.log(`  password: ${password}`);
    console.log('==================================\n');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log.error(`migration failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
}

run();
