// Per-spec, this file lives inside the fraud worker. It re-exports the
// shared lib/face helpers so the worker is self-contained for Docker builds.

const { getEmbedding, getSimilarity, getHuman } = require('../../lib/face');

module.exports = { getEmbedding, getSimilarity, getHuman };
