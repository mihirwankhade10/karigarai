// TTS route — proxies to Sarvam AI text-to-speech (bulbul:v3).
// POST /api/tts  { text, language }
// Returns { audio } (base64-encoded WAV)

const axios = require('axios');

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
          timeout: 15000,
        }
      );

      const audio = response.data?.audios?.[0];
      if (!audio) {
        return reply.code(500).send({ error: 'No audio returned from Sarvam' });
      }

      return { audio };
    } catch (err) {
      req.log.error({ err }, 'Sarvam TTS failed');
      return reply.code(502).send({
        error: 'TTS service error',
        message: err?.response?.data?.message || err.message,
      });
    }
  });
}

module.exports = ttsRoutes;
