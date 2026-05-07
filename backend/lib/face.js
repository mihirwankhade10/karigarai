// Face embedding using @vladmandic/human.
//
// Backend selection:
//   USE_TFJS_NODE=true  \u2192 native @tensorflow/tfjs-node (faster, may need VS Build Tools on Windows)
//   USE_TFJS_NODE=false \u2192 pure JS @tensorflow/tfjs (slower, always installs)
//
// Returns 128-dim embeddings as plain Float32Array \u2014 caller converts to
// pgvector literal via lib/pgvector.js.

const path = require('path');

let tf;
let humanInstance;

function loadTf() {
  if (tf) return tf;
  if (String(process.env.USE_TFJS_NODE).toLowerCase() === 'true') {
    try {
      // eslint-disable-next-line global-require
      tf = require('@tensorflow/tfjs-node');
      console.log('[face] using @tensorflow/tfjs-node (native)');
      return tf;
    } catch (err) {
      console.warn('[face] tfjs-node unavailable, falling back to pure tfjs:', err.message);
    }
  }
  // eslint-disable-next-line global-require
  tf = require('@tensorflow/tfjs');
  console.log('[face] using @tensorflow/tfjs (pure JS)');
  return tf;
}

function getHuman() {
  if (humanInstance) return humanInstance;

  loadTf();
  // eslint-disable-next-line global-require
  const Human = require('@vladmandic/human').default || require('@vladmandic/human');

  // Resolve models dir relative to backend/ root.
  const modelDir = path.resolve(__dirname, '../models/human');

  const config = {
    modelBasePath: 'file://' + modelDir.replace(/\\/g, '/') + '/',
    backend: process.env.USE_TFJS_NODE === 'true' ? 'tensorflow' : 'cpu',
    debug: false,
    cacheModels: true,
    face: {
      enabled: true,
      detector: { rotation: true, return: true },
      mesh: { enabled: true },
      iris: { enabled: false },
      description: { enabled: true },
      emotion: { enabled: false },
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
  };

  humanInstance = new Human(config);
  return humanInstance;
}

async function getEmbedding(imageUrl) {
  const human = getHuman();
  await human.load();

  // @napi-rs/canvas ships prebuilt binaries (no Windows C++ toolchain needed).
  // API is the same subset of the Web Canvas API that human.js consumes.
  // eslint-disable-next-line global-require
  const { loadImage, createCanvas } = require('@napi-rs/canvas');
  const img = await loadImage(imageUrl);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const result = await human.detect(canvas);
  if (!result || !result.face || result.face.length === 0) {
    throw new Error('No face detected in image');
  }
  const embedding = result.face[0].embedding;
  if (!embedding) throw new Error('Face descriptor missing (faceres model not loaded)');
  return embedding; // 128-d Float32Array
}

function getSimilarity(a, b) {
  const human = getHuman();
  return human.similarity(a, b);
}

module.exports = { getEmbedding, getSimilarity, getHuman };
