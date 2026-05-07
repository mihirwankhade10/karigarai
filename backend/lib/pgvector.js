// pgvector helpers.
//
// Embeddings must be passed to Postgres as a string literal '[0.1,0.2,...]'
// and cast with $N::vector. Passing a JS array directly fails because
// node-postgres formats it as the Postgres array literal '{0.1,0.2}' which
// pgvector rejects.

function toVectorLiteral(arr) {
  if (!arr) return null;
  const list = Array.from(arr).map((n) => {
    if (Number.isFinite(n)) return n;
    return 0;
  });
  return `[${list.join(',')}]`;
}

module.exports = { toVectorLiteral };
