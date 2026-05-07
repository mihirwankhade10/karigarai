// Optional seed: a small canonical question bank for fallback when LangChain
// generation fails for a particular trade. Not strictly required by the API
// (questions are generated per-candidate at registration), but useful for
// LLM-down resilience tests.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { getPool, closePool } = require('../lib/db');
const { makeLogger } = require('../lib/logger');

const log = makeLogger('seed');

// Trade-specific fallback questions used when LangChain output parsing fails.
// Stored as a tiny canonical set per trade. Not user-facing unless LLM fails.
const FALLBACK_QUESTIONS = {
  Electrician: [
    { en: 'Tell us about yourself and your work as an electrician.', kn: '\u0CA8\u0CBF\u0CAE\u0CCD\u0CAE \u0CAC\u0231\u0CC6\u200C\u0C95\u0CCD\u0CB7\u0CA8\u0CCD \u0C95\u0CC6\u0CB2\u0CB8\u0CA6 \u0C95\u0CC1\u0CB0\u0CBF\u0CA4\u0CC1 \u0CA4\u0CBF\u0CB3\u0CBF\u0CB8\u0CBF.', hi: 'apne aur electrician ke kaam ke baare mein bataiye.' },
  ],
  Plumber: [
    { en: 'Describe a difficult plumbing job you completed.', kn: '\u0CA8\u0CC0\u0CB5\u0CC1 \u0CAE\u0CC1\u0C97\u0CBF\u0CB8\u0CBF\u0CA6 \u0C95\u0CB7\u0CCD\u0C9F\u0C95\u0CB0 plumbing \u0C95\u0CC6\u0CB2\u0CB8\u0CA6 \u0CAC\u0231\u0CC6 \u0CA4\u0CBF\u0CB3\u0CBF\u0CB8\u0CBF.', hi: 'ek mushkil plumbing kaam jo aapne kiya, batayein.' },
  ],
};

async function run() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    log.boot('seeding fallback question bank...');
    // The migration already seeds the default admin. This script is a no-op
    // for now but exists as a stable extension point for future seeds.
    log.success('seed complete (fallback bank lives in code, not DB)');
  } catch (err) {
    log.error(`seed failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
}

if (require.main === module) run();

module.exports = { FALLBACK_QUESTIONS };
