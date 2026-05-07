// Real API client. Replaces mockApi by speaking to the Fastify backend at
// VITE_API_URL. Uses native fetch (no axios dep needed).

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const TOKEN_KEY = 'karigarai_jwt';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function parseError(res) {
  let detail = null;
  try { detail = await res.json(); } catch (_) { detail = await res.text().catch(() => null); }
  const message = (detail && (detail.message || detail.error)) || res.statusText || `HTTP ${res.status}`;
  return new ApiError(message, res.status, detail);
}

function buildHeaders(extra = {}, { json = true } = {}) {
  const h = { ...extra };
  if (json) h['Accept'] = 'application/json';
  const t = tokenStore.get();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function request(path, { method = 'GET', body, headers = {}, isJSON = true, raw = false } = {}) {
  const opts = { method, headers: buildHeaders(headers, { json: !raw }) };
  if (body !== undefined) {
    if (isJSON) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else {
      // FormData \u2014 let the browser set the boundary
      opts.body = body;
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 401) {
    tokenStore.clear();
  }
  if (!res.ok) throw await parseError(res);
  if (raw) return res;
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  postForm: (path, formData) => request(path, { method: 'POST', body: formData, isJSON: false }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  raw: (path) => request(path, { raw: true }),
};

// Helper: convert a base64 dataURL (from react-webcam.getScreenshot) into a Blob.
export async function dataUrlToBlob(dataUrl) {
  const r = await fetch(dataUrl);
  return r.blob();
}

export { ApiError };
