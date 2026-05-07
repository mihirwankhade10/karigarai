// Smoke-test all three external services. Run with: node test-connections.js
//
// Exit code 0 if all pass, 1 if any fail.

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { getPool, closePool } = require('./lib/db');
const { getRedis, getIoredis } = require('./lib/redis');
const { healthCheck } = require('./lib/kafka');
const cloud = require('./lib/cloudinary');

const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const tag = ok ? '\u001b[32m\u2705\u001b[0m' : '\u001b[31m\u274C\u001b[0m';
  console.log(`${tag} ${name.padEnd(22)} ${detail}`);
}

async function testDb() {
  try {
    const pool = getPool();
    const r = await pool.query('SELECT 1 AS ok');
    record('Postgres (Neon)', r.rows[0].ok === 1, 'SELECT 1 returned 1');
  } catch (err) {
    record('Postgres (Neon)', false, err.message);
  }
}

async function testRedis() {
  try {
    const redis = getRedis();
    const key = 'karigarai:test:ping';
    await redis.set(key, 'pong', { ex: 30 });
    const v = await redis.get(key);
    record('Upstash Redis', v === 'pong', `get ${key} = ${v}`);
  } catch (err) {
    record('Upstash Redis', false, err.message);
  }
}

async function testBullMQ() {
  try {
    const counts = await healthCheck();
    record('BullMQ broker', true, `queue counts: ${JSON.stringify(counts)}`);
  } catch (err) {
    record('BullMQ broker', false, err.message);
  }
}

async function testCloudinary() {
  try {
    const r = await cloud.ping();
    record('Cloudinary', r && r.status === 'ok', `ping=${r && r.status}`);
  } catch (err) {
    record('Cloudinary', false, err.message);
  }
}

async function main() {
  console.log('\nProbing external services...\n');
  await testDb();
  await testRedis();
  await testBullMQ();
  await testCloudinary();

  // Cleanup
  await closePool().catch(() => {});
  try { await getIoredis().quit(); } catch (_) {}

  const failed = results.filter((r) => !r.ok);
  console.log();
  if (failed.length === 0) {
    console.log('\u001b[32m\u2705 All systems ready.\u001b[0m');
  } else {
    console.log(`\u001b[31m\u274C ${failed.length} system(s) failed:\u001b[0m`);
    for (const f of failed) console.log(`   - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
  process.exit(process.exitCode || 0);
}

main();
