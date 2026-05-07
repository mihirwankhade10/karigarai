// Video \u2192 16kHz mono WAV using ffmpeg-static (bundles a portable binary, no
// system ffmpeg required).
//
// Used by the STT worker before posting to Sarvam (which mandates
// 16kHz mono PCM WAV).

const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const axios = require('axios');

ffmpeg.setFfmpegPath(ffmpegPath);

async function downloadToTemp(url, filename) {
  const tmpFile = path.join(os.tmpdir(), filename);
  const response = await axios.get(url, { responseType: 'arraybuffer', maxContentLength: 200 * 1024 * 1024 });
  fs.writeFileSync(tmpFile, response.data);
  return tmpFile;
}

function extractWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

/**
 * Download a video URL and return a path to a 16kHz mono WAV.
 * Caller is responsible for cleaning up both files via cleanupTemp().
 */
async function videoUrlToWavFile(videoUrl, interviewId) {
  const videoPath = await downloadToTemp(videoUrl, `${interviewId}.mp4`);
  const wavPath = path.join(os.tmpdir(), `${interviewId}.wav`);
  await extractWav(videoPath, wavPath);
  return { videoPath, wavPath };
}

function cleanupTemp(...paths) {
  for (const p of paths) {
    if (!p) continue;
    try { fs.unlinkSync(p); } catch (_) { /* ignore */ }
  }
}

module.exports = { videoUrlToWavFile, cleanupTemp, downloadToTemp };
