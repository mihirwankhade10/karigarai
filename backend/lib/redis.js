// Redis client (ioredis) used by api/, all workers/, and BullMQ.
//
// Single source of truth: one TCP connection per process (singleton).
// Exposes:
//   getRedis()    \u2192 a thin wrapper that mimics the @upstash/redis SDK
//                  (auto-JSON, options-object .set(...) style) so callers like
//                  statusStore.js don't need to change.
//   getIoredis()  \u2192 the raw ioredis instance, used by BullMQ as `connection`.
//
// Connection: UPSTASH_REDIS_URL = rediss://default:<password>@<endpoint>:6379
// (Upstash gives you this string directly in the Redis details tab.)

const Redis = require('ioredis');

let raw;

function getIoredis() {
  if (!raw) {
    if (!process.env.UPSTASH_REDIS_URL) {
      throw new Error('UPSTASH_REDIS_URL is not set');
    }
    raw = new Redis(process.env.UPSTASH_REDIS_URL, {
      // BullMQ requires both of these for blocking commands.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    raw.on('error', (err) => {
      // ioredis auto-reconnects; just log unexpected errors.
      console.error('[redis] error:', err.message);
    });
  }
  return raw;
}

// Auto-JSON wrapper so existing callers keep working.
function serialize(v) {
  if (v === null || v === undefined) return v;
  return typeof v === 'string' ? v : JSON.stringify(v);
}
function deserialize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}

const wrapped = {
  async set(key, value, opts) {
    const r = getIoredis();
    const v = serialize(value);
    if (opts && opts.ex && opts.nx) return r.set(key, v, 'EX', opts.ex, 'NX');
    if (opts && opts.ex) return r.set(key, v, 'EX', opts.ex);
    if (opts && opts.nx) return r.set(key, v, 'NX');
    return r.set(key, v);
  },
  async get(key) {
    const r = getIoredis();
    return deserialize(await r.get(key));
  },
  async del(...keys) {
    const r = getIoredis();
    const flat = keys.flat();
    if (flat.length === 0) return 0;
    return r.del(...flat);
  },
  async exists(key) {
    const r = getIoredis();
    return r.exists(key);
  },
  async ping() {
    const r = getIoredis();
    return r.ping();
  },
  async quit() {
    if (raw) {
      await raw.quit().catch(() => {});
      raw = null;
    }
  },
};

function getRedis() {
  return wrapped;
}

module.exports = { getRedis, getIoredis };
