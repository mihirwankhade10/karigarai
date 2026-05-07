// Sarvam AI Speech-to-Text \u2014 saaras:v3 (multilingual, auto-detect).
//
// Endpoint: POST https://api.sarvam.ai/speech-to-text
// Auth header: api-subscription-key
// Multipart fields:
//   file        \u2014 16kHz mono WAV audio (we always feed this format from lib/audio.js)
//   model       \u2014 "saaras:v3"
//   mode        \u2014 "transcribe" (original language) | "translate" | "verbatim" | "translit" | "codemix"
//
// We use mode=transcribe so each candidate's words come back in their own
// language script (Kannada/Hindi/English). saaras:v3 auto-detects language,
// so we no longer need to pass language_code.
//
// We use the REST endpoint directly (axios + form-data) instead of the
// `sarvamai` SDK to keep deps minimal \u2014 the SDK is just a thin wrapper.

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Kept for compatibility with any caller that still passes `language`.
// saaras:v3 doesn't require this; auto-detect handles it.
const LANG_MAP = {
  kannada: 'kn-IN',
  hindi: 'hi-IN',
  english: 'en-IN',
  kn: 'kn-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

async function transcribe(wavPath, _language) {
  const apiUrl = (process.env.SARVAM_API_URL || 'https://api.sarvam.ai').replace(/\/+$/, '');
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error('SARVAM_API_KEY is not set');

  const form = new FormData();
  form.append('file', fs.createReadStream(wavPath), { contentType: 'audio/wav' });
  form.append('model', 'saaras:v3');
  form.append('mode', 'transcribe');

  const res = await axios.post(`${apiUrl}/speech-to-text`, form, {
    headers: {
      ...form.getHeaders(),
      'api-subscription-key': apiKey,
    },
    maxBodyLength: 200 * 1024 * 1024,
    maxContentLength: 200 * 1024 * 1024,
    timeout: 180_000,
  });

  // saaras:v3 response shape: { transcript, language_code, request_id, ... }
  const transcript =
    res.data?.transcript
    || res.data?.transcripts?.[0]?.transcript
    || res.data?.text
    || '';

  const detectedLang = res.data?.language_code || null;
  return { transcript, detectedLang, raw: res.data };
}

module.exports = { transcribe, LANG_MAP };
