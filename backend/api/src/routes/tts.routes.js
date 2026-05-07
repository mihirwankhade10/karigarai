// TTS route — proxies to Sarvam AI text-to-speech (bulbul:v3).
// POST /api/tts  { text, language }
// Returns { audio } (base64-encoded WAV)
// Includes in-memory cache to avoid repeated Sarvam calls for the same text.

const axios = require('axios');

// Simple in-memory cache: Map<"text|lang", base64Audio>
// Keeps last 100 entries to avoid unbounded memory growth.
const ttsCache = new Map();
const MAX_CACHE = 100;

function cacheKey(text, lang) { return `${lang}|${text}`; }

function cacheSet(key, audio) {
  if (ttsCache.size >= MAX_CACHE) {
    // Evict oldest entry
    const oldest = ttsCache.keys().next().value;
    ttsCache.delete(oldest);
  }
  ttsCache.set(key, audio);
}

async function ttsRoutes(fastify) {
  fastify.post('/', {
    schema: {
      tags: ['TTS'],
      summary: 'Convert text to speech via Sarvam AI',
      body: {
        type: 'object',
        required: ['text', 'language'],
        properties: {
          text: { type: 'string', maxLength: 2500 },
          language: { type: 'string', enum: ['en', 'hi', 'kn', 'en-IN', 'hi-IN', 'kn-IN'] },
        },
      },
    },
  }, async (req, reply) => {
    const { text, language } = req.body;

    // Map to BCP-47 if short code given
    const langMap = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' };
    const targetLang = langMap[language] || language;

    // Check cache first
    const key = cacheKey(text, targetLang);
    if (ttsCache.has(key)) {
      return { audio: ttsCache.get(key), cached: true };
    }

    const apiKey = process.env.SARVAM_API_KEY;
    const apiUrl = (process.env.SARVAM_API_URL || 'https://api.sarvam.ai').replace(/\/+$/, '');

    if (!apiKey) {
      return reply.code(500).send({ error: 'SARVAM_API_KEY not configured' });
    }

    try {
      const response = await axios.post(
        `${apiUrl}/text-to-speech`,
        {
          text,
          target_language_code: targetLang,
          model: 'bulbul:v3',
          speaker: 'ritu',   // natural female Indian voice
          pace: 0.9,
          sample_rate: 24000,
        },
        {
          headers: {
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 25000, // 25s — Sarvam can be slow from US servers
        }
      );

      const audio = response.data?.audios?.[0];
      if (!audio) {
        return reply.code(500).send({ error: 'No audio returned from Sarvam' });
      }

      // Cache the result
      cacheSet(key, audio);

      return { audio };
    } catch (err) {
      req.log.error({ err: { message: err.message, code: err.code } }, 'Sarvam TTS failed');
      return reply.code(502).send({
        error: 'TTS service error',
        message: err?.response?.data?.message || err.message,
      });
    }
  });
}

module.exports = ttsRoutes;
