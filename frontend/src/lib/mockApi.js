// Real backend client. Keeps the export name `mockApi` to avoid touching
// every page that already imports it. Methods now hit the Fastify API
// described in backend/api/src/routes/*.routes.js.

import { api, tokenStore, dataUrlToBlob } from './api';

// Map backend interview row \u2192 the candidate-shaped object the FE Result
// screen expects (camelCase, scores numeric, etc.).
function mapInterviewToCandidate(row, candidate = {}) {
  if (!row) return null;
  return {
    id: row.candidate_id || candidate.id,
    interviewId: row.id || row.interview_id,
    name: candidate.name || row.name,
    phone: candidate.phone || row.phone,
    district: candidate.district || row.district,
    tradeCategory: candidate.trade_category || candidate.tradeCategory || row.trade_category,
    language: candidate.language || row.language,
    photo: candidate.selfie_url || candidate.photo || row.selfie_url,
    acsScore: row.acs_score != null ? Number(row.acs_score) : null,
    relevanceScore: row.relevance_score != null ? Number(row.relevance_score) : null,
    clarityScore: row.clarity_score != null ? Number(row.clarity_score) : null,
    skillConfidenceScore: row.skill_confidence_score != null ? Number(row.skill_confidence_score) : null,
    fitmentCategory: row.fitment_category,
    workforceSegment: row.workforce_segment,
    aiSummaryEn: row.ai_summary_en,
    aiSummaryKn: row.ai_summary_kn,
    keyObservations: row.key_observations || [],
    fraudFlag: !!row.fraud_flag,
    fraudReason: row.fraud_reason,
    fraudSimilarity: row.fraud_similarity != null ? Number(row.fraud_similarity) : null,
    faceMatchConfidence: row.fraud_similarity != null ? 1 - Number(row.fraud_similarity) : null,
    qualityFlag: !!row.quality_flag,
    proctorFlag: !!row.proctor_flag,
    proctorIntegrityScore: row.proctor_integrity_score,
    status: row.status,
    interviewDate: row.created_at,
  };
}

// Build a URLSearchParams string, skipping empty/null/'all' values.
function filtersToQuery(filters = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && (v === '' || v === 'all')) continue;
    qs.set(k, v);
  }
  return qs.toString();
}

// Map admin /candidates list row to FE shape. The endpoint already joins
// candidate + latest interview into one row.
function mapAdminListRow(r) {
  return {
    id: r.id,
    interviewId: r.interview_id,
    name: r.name,
    phone: r.phone,
    district: r.district,
    tradeCategory: r.trade_category,
    language: r.language,
    photo: r.selfie_url,
    acsScore: r.acs_score != null ? Number(r.acs_score) : null,
    relevanceScore: r.relevance_score != null ? Number(r.relevance_score) : null,
    clarityScore: r.clarity_score != null ? Number(r.clarity_score) : null,
    skillConfidenceScore: r.skill_confidence_score != null ? Number(r.skill_confidence_score) : null,
    fitmentCategory: r.fitment_category,
    workforceSegment: r.workforce_segment,
    aiSummaryEn: r.ai_summary_en,
    aiSummaryKn: r.ai_summary_kn,
    fraudFlag: !!r.fraud_flag,
    proctorFlag: !!r.proctor_flag,
    proctorIntegrityScore: r.proctor_integrity_score,
    shortlisted: !!r.shortlisted,
    status: r.status,
    interviewDate: r.interview_started_at || r.created_at,
  };
}

export const mockApi = {
  // ============= Candidate flow =============

  /**
   * Multipart register. `data.photo` is expected to be a base64 dataURL from
   * react-webcam.getScreenshot(); we convert it to a Blob here.
   */
  registerCandidate: async (data) => {
    const fd = new FormData();
    fd.append('name', data.name);
    fd.append('phone', data.phone);
    fd.append('district', data.district);
    fd.append('tradeCategory', data.tradeCategory);
    fd.append('language', data.language || 'kannada');
    if (data.photo) {
      const blob = typeof data.photo === 'string' ? await dataUrlToBlob(data.photo) : data.photo;
      fd.append('selfie', blob, 'selfie.jpg');
    }
    const res = await api.postForm('/api/candidates/register', fd);
    return { candidateId: res.candidateId, success: res.success, name: data.name, interviewToken: res.interviewToken };
  },

  /**
   * Per spec the questions are now per-candidate (12 questions). The legacy
   * signature passed tradeCategory; we now ignore it and read candidateId
   * from the appStore-stored candidate (caller passes candidateId via the
   * second arg, which remains backwards-compatible).
   */
  getInterviewQuestions: async (tradeCategoryOrCandidateId, candidateId) => {
    const id = candidateId || tradeCategoryOrCandidateId;
    const res = await api.get(`/api/candidates/${id}/questions`);
    // Normalise to FE shape: questionEn/Kn/Hi keys
    return (res.questions || []).map((q, i) => ({
      id: q.id || `q_${i + 1}`,
      tradeCategoryId: null,
      questionEn: q.question_en,
      questionKn: q.question_kn,
      questionHi: q.question_hi,
      difficultyLevel: q.difficulty_level,
      order: q.order || q.question_order || i + 1,
      type: q.type || q.question_type,
      isAiQuestion: q.is_ai_question || q.is_ai_question === undefined ? !!q.is_ai_question : false,
    }));
  },

  /**
   * Submit interview multipart. `interviewData.video` must be a Blob
   * (recorded via MediaRecorder in Interview.jsx).
   */
  submitInterview: async (interviewData) => {
    const fd = new FormData();
    fd.append('candidateId', interviewData.candidateId);
    if (interviewData.video) {
      fd.append('video', interviewData.video, interviewData.videoFilename || 'interview.webm');
    }
    if (interviewData.proctoringSummary) {
      fd.append('proctoringSummary', JSON.stringify(interviewData.proctoringSummary));
    }
    const res = await api.postForm('/api/interviews/submit', fd);
    return { interviewId: res.interviewId, status: 'processing', candidateId: interviewData.candidateId };
  },

  /** Real-time status; FE polls this every 3s during Processing. */
  getInterviewStatus: async (interviewId) => api.get(`/api/interviews/${interviewId}/status`),

  /** Full result. FE calls this after status === 'complete'. */
  getInterviewResult: async (interviewId) => {
    const res = await api.get(`/api/interviews/${interviewId}/result`);
    return mapInterviewToCandidate(res.interview, {
      id: res.interview.candidate_id,
      name: res.interview.name,
      phone: res.interview.phone,
      district: res.interview.district,
      trade_category: res.interview.trade_category,
      language: res.interview.language,
      selfie_url: res.interview.selfie_url,
    });
  },

  /** Q12 friendly AI reply. */
  aiRespond: async ({ candidateId, question }) => api.post('/api/interviews/ai-respond', { candidateId, question }),

  // ============= Admin =============

  adminLogin: async ({ email, password }) => {
    try {
      const r = await api.post('/api/auth/login', { email, password });
      if (r.token) tokenStore.set(r.token);
      return { success: true, user: r.admin };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  adminLogout: async () => {
    try { await api.post('/api/auth/logout'); } catch (_) { /* ignore */ }
    tokenStore.clear();
    return { success: true };
  },

  getCandidates: async (filters = {}) => {
    const qs = filtersToQuery({ ...filters, limit: filters.limit || 100 });
    const r = await api.get(`/api/admin/candidates?${qs}`);
    return (r.candidates || []).map(mapAdminListRow);
  },

  getCandidatesPaged: async (filters = {}) => {
    const qs = filtersToQuery(filters);
    const r = await api.get(`/api/admin/candidates?${qs}`);
    return { candidates: (r.candidates || []).map(mapAdminListRow), pagination: r.pagination };
  },

  getCandidateDetail: async (id) => {
    const r = await api.get(`/api/admin/candidates/${id}`);
    return mapInterviewToCandidate(r.interview, r.candidate);
  },

  shortlistCandidate: async (id, action) => {
    const verb = action === 'add' ? 'shortlist' : action === 'remove' ? 'remove' : action;
    const r = await api.patch(`/api/admin/candidates/${id}/shortlist`, { action: verb });
    return { success: r.success, id, action };
  },

  resolveFlag: async (id, resolution) => {
    // Caller may pass the interview id (preferred) or candidate id; we accept
    // both \u2014 if given a candidate id, look up the latest interview.
    let interviewId = id;
    try {
      const detail = await api.get(`/api/admin/candidates/${id}`);
      if (detail?.interview?.id) interviewId = detail.interview.id;
    } catch (_) { /* assume id was already an interview id */ }

    const map = { confirm: 'confirmed_fraud', clear: 'cleared', review: 'manual_review' };
    const realResolution = map[resolution] || resolution;
    const r = await api.patch(`/api/admin/interviews/${interviewId}/resolve-flag`, { resolution: realResolution });
    return { success: r.success, candidate: { id, fraudFlag: realResolution !== 'cleared' } };
  },

  getAnalytics: async () => {
    const a = await api.get('/api/admin/analytics');
    const totals = a.totals || {};
    const dayLabel = (iso) => {
      try { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' }); } catch (_) { return iso; }
    };
    const totalCandidates = parseInt(totals.total_candidates || 0);
    const jobReady = parseInt(totals.job_ready || 0);
    const flagged = parseInt(totals.flagged || 0);
    const today = parseInt(totals.today || 0);
    return {
      // both new (camelCase) and legacy (Count) names so existing pages work unchanged
      totalCandidates,
      jobReady,
      jobReadyCount: jobReady,
      processed: parseInt(totals.processed || 0),
      flagged,
      flaggedCount: flagged,
      shortlisted: parseInt(totals.shortlisted || 0),
      today,
      processedToday: today,
      fitmentDistribution: (a.fitmentDistribution || []).map((f) => ({
        category: f.fitment_category,
        count: parseInt(f.count),
      })),
      languageDistribution: (a.languageDistribution || []).map((l) => ({
        language: l.language,
        count: parseInt(l.count),
      })),
      tradeDistribution: (a.tradeDistribution || []).map((t) => ({
        trade: t.trade_category,
        count: parseInt(t.count),
      })),
      districts: (a.districts || []).map((d) => ({
        district: d.district,
        total: parseInt(d.total),
        jobReady: parseInt(d.job_ready || 0),
      })),
      dailyIntake: (a.dailyIntake || []).map((d) => ({
        date: d.date,
        label: dayLabel(d.date),
        count: parseInt(d.count),
      })),
    };
  },

  getFlaggedCandidates: async () => {
    const r = await api.get('/api/admin/flagged');
    return (r.flagged || []).map((row) => ({
      id: row.candidate_id,
      interviewId: row.interview_id,
      name: row.name,
      phone: row.phone,
      district: row.district,
      tradeCategory: row.trade_category,
      photo: row.selfie_url,
      fraudFlag: !!row.fraud_flag,
      fraudReason: row.fraud_reason,
      fraudSimilarity: row.fraud_similarity != null ? Number(row.fraud_similarity) : null,
      proctorFlag: !!row.proctor_flag,
      proctorIntegrityScore: row.proctor_integrity_score,
      violationCount: parseInt(row.violation_count || 0),
      snapshotCount: parseInt(row.snapshot_count || 0),
      status: row.status,
      interviewDate: row.created_at,
      fitmentCategory: row.fraud_flag ? 'suspected_fraud' : 'manual_review',
    }));
  },

  getShortlisted: async () => {
    const r = await api.get('/api/admin/shortlisted');
    return (r.shortlisted || []).map((row) => ({
      id: row.candidate_id,
      interviewId: row.interview_id,
      name: row.name,
      phone: row.phone,
      district: row.district,
      tradeCategory: row.trade_category,
      language: row.language,
      photo: row.selfie_url,
      acsScore: row.acs_score != null ? Number(row.acs_score) : null,
      fitmentCategory: row.fitment_category,
      workforceSegment: row.workforce_segment,
      shortlistedBy: row.admin_name,
      shortlistedAt: row.shortlisted_at,
    }));
  },

  exportShortlistCsv: () => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/export/csv`;
    const t = tokenStore.get();
    return fetch(url, { headers: t ? { Authorization: `Bearer ${t}` } : {} }).then((r) => r.blob());
  },
};
