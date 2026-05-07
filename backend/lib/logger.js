// Lightweight emoji-prefixed logger used by api/ and all workers/.
// Avoids adding a heavy logging dep; Fastify ships its own pino logger for HTTP.

const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const ts = () => new Date().toISOString();

function fmt(level, color, emoji, args) {
  const parts = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a)));
  return `${COLORS.gray}${ts()}${COLORS.reset} ${color}${emoji} [${level}]${COLORS.reset} ${parts.join(' ')}`;
}

function makeLogger(name) {
  const tag = name ? `(${name})` : '';
  return {
    info: (...a) => console.log(fmt('INFO', COLORS.cyan, 'ℹ', [tag, ...a])),
    success: (...a) => console.log(fmt('OK', COLORS.green, '✅', [tag, ...a])),
    warn: (...a) => console.warn(fmt('WARN', COLORS.yellow, '⚠️', [tag, ...a])),
    error: (...a) => console.error(fmt('ERR', COLORS.red, '❌', [tag, ...a])),
    kafka: (...a) => console.log(fmt('KAFKA', COLORS.magenta, '🔥', [tag, ...a])),
    stt: (...a) => console.log(fmt('STT', COLORS.cyan, '🎤', [tag, ...a])),
    assess: (...a) => console.log(fmt('ASSESS', COLORS.cyan, '🧠', [tag, ...a])),
    fraud: (...a) => console.log(fmt('FRAUD', COLORS.cyan, '🛡️', [tag, ...a])),
    fitment: (...a) => console.log(fmt('FITMENT', COLORS.cyan, '📊', [tag, ...a])),
    boot: (...a) => console.log(fmt('BOOT', COLORS.green, '🚀', [tag, ...a])),
  };
}

module.exports = { makeLogger };
