// STT worker.
//
// Subscribes:    karigar.video.uploaded  (group: stt-workers)
// Publishes:     karigar.transcript.ready
// Side effects:  downloads video, extracts 16kHz mono WAV, calls Sarvam,
//                UPDATEs interviews.transcript, sets Redis status step=transcribing.
//
// Filters out GENERATE_EMBEDDING side-channel events (those are for the fraud worker).

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { startConsumer, publish } = require('../../lib/kafka');
const { getPool, closePool } = require('../../lib/db');
const { setStatus } = require('../../lib/statusStore');
const { videoUrlToWavFile, cleanupTemp } = require('../../lib/audio');
const { transcribe } = require('../../lib/sarvam');
const { makeLogger } = require('../../lib/logger');

const log = makeLogger('stt');

async function handle(body) {
  if (!body || body.type === 'GENERATE_EMBEDDING') {
    return; // not for us
  }

  const { interviewId, candidateId, videoUrl, language } = body;
  if (!interviewId || !videoUrl) {
    log.warn(`skipping malformed message: ${JSON.stringify(body)}`);
    return;
  }

  log.stt(`received video.uploaded for interview ${interviewId}`);
  const pool = getPool();

  let wavPath, videoPath;
  try {
    await setStatus(interviewId, { status: 'processing', step: 'transcribing', progress: 30 });

    log.stt(`downloading video + extracting 16kHz mono WAV...`);
    ({ videoPath, wavPath } = await videoUrlToWavFile(videoUrl, interviewId));

    log.stt(`calling Sarvam saarika:v2 (lang=${language})...`);
    const { transcript } = await transcribe(wavPath, language);

    log.stt(`transcript length: ${transcript.length} chars`);

    await pool.query(
      `UPDATE interviews SET transcript = $1, updated_at = NOW() WHERE id = $2`,
      [transcript, interviewId]
    );

    await publish('karigar.transcript.ready', {
      interviewId,
      candidateId,
      transcript,
      language,
      timestamp: new Date().toISOString(),
    });

    log.success(`transcript stored & published for ${interviewId}`);
  } catch (err) {
    log.error(`STT failed for ${interviewId}: ${err.message}`);
    try {
      await pool.query(
        `UPDATE interviews SET quality_flag = TRUE, status = 'failed', updated_at = NOW() WHERE id = $1`,
        [interviewId]
      );
      await setStatus(interviewId, { status: 'failed', step: 'transcribing', progress: 0, error: err.message });
    } catch (_) { /* swallow */ }
  } finally {
    cleanupTemp(videoPath, wavPath);
  }
}

async function main() {
  log.boot('starting STT worker');
  process.on('uncaughtException', (e) => log.error(`uncaughtException: ${e.message}`));
  process.on('unhandledRejection', (e) => log.error(`unhandledRejection: ${e?.message || e}`));

  await startConsumer({
    topic: 'karigar.video.uploaded',
    groupId: 'stt-workers',
    instanceId: 'stt-1',
    handler: handle,
  });
}

main().catch(async (err) => {
  log.error(`fatal: ${err.message}`);
  await closePool().catch(() => {});
  process.exit(1);
});
