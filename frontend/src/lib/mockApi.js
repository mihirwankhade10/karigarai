import {
  CANDIDATES,
  INTERVIEW_QUESTIONS,
  ANALYTICS,
  ADMIN_USERS,
} from './mockData';

const delay = (min = 800, max = 1500) =>
  new Promise((res) => setTimeout(res, min + Math.random() * (max - min)));

const log = (label, ms, payload) => {
  // Spec note #14 — log all mock API calls with timing
  // eslint-disable-next-line no-console
  console.log(
    `%c[mockApi] %c${label} %c${ms.toFixed(0)}ms`,
    'color:#F97316;font-weight:600',
    'color:#0F172A;font-weight:500',
    'color:#64748B',
    payload || ''
  );
};

const timed = async (label, fn) => {
  const t0 = performance.now();
  await delay();
  const result = await fn();
  log(label, performance.now() - t0, result);
  return result;
};

let nextCandidateId = CANDIDATES.length + 1;
const liveCandidates = [...CANDIDATES];

export const mockApi = {
  // ============= Candidate flow =============
  registerCandidate: (data) =>
    timed('registerCandidate', () => {
      const id = `cand_${String(nextCandidateId++).padStart(3, '0')}`;
      return { candidateId: id, success: true, name: data.name };
    }),

  getInterviewQuestions: (tradeCategory) =>
    timed('getInterviewQuestions', () => {
      const list = INTERVIEW_QUESTIONS[tradeCategory] || INTERVIEW_QUESTIONS.default;
      return list.slice(0, 5);
    }),

  submitInterview: (interviewData) =>
    timed('submitInterview', () => ({
      interviewId: `int_${Date.now()}`,
      status: 'processing',
      candidateId: interviewData.candidateId,
    })),

  getInterviewResult: (interviewId, fallback) =>
    new Promise(async (resolve) => {
      const t0 = performance.now();
      // simulate longer processing — 3s
      await new Promise((r) => setTimeout(r, 3000));
      // pick a random "result" from job_ready or requires_upskilling for demo,
      // unless fallback id provided
      const pool = CANDIDATES.filter(
        (c) => c.fitmentCategory === 'job_ready' || c.fitmentCategory === 'requires_upskilling'
      );
      const result =
        (fallback && CANDIDATES.find((c) => c.id === fallback)) ||
        pool[Math.floor(Math.random() * pool.length)];
      log('getInterviewResult', performance.now() - t0, result);
      resolve(result);
    }),

  // ============= Admin =============
  adminLogin: ({ email, password }) =>
    timed('adminLogin', () => {
      const user = ADMIN_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (!user) return { success: false, error: 'Invalid credentials' };
      const { password: _pw, ...safe } = user;
      return { success: true, user: safe };
    }),

  getCandidates: (filters = {}) =>
    timed('getCandidates', () => {
      let list = [...liveCandidates];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter(
          (c) => c.name.toLowerCase().includes(s) || c.phone.includes(filters.search)
        );
      }
      if (filters.district && filters.district !== 'all') {
        list = list.filter((c) => c.district === filters.district);
      }
      if (filters.tradeCategory && filters.tradeCategory !== 'all') {
        list = list.filter((c) => c.tradeCategory === filters.tradeCategory);
      }
      if (filters.fitmentCategory && filters.fitmentCategory !== 'all') {
        list = list.filter((c) => c.fitmentCategory === filters.fitmentCategory);
      }
      if (filters.language && filters.language !== 'all') {
        list = list.filter((c) => c.language === filters.language);
      }
      if (filters.dateFrom) {
        list = list.filter(
          (c) => new Date(c.interviewDate) >= new Date(filters.dateFrom)
        );
      }
      if (filters.dateTo) {
        list = list.filter(
          (c) => new Date(c.interviewDate) <= new Date(filters.dateTo)
        );
      }
      return list;
    }),

  getCandidateDetail: (id) =>
    timed('getCandidateDetail', () => liveCandidates.find((c) => c.id === id) || null),

  shortlistCandidate: (id, action) =>
    timed('shortlistCandidate', () => {
      const c = liveCandidates.find((c) => c.id === id);
      if (!c) return { success: false };
      return { success: true, id, action };
    }),

  resolveFlag: (id, resolution) =>
    timed('resolveFlag', () => {
      const c = liveCandidates.find((c) => c.id === id);
      if (!c) return { success: false };
      if (resolution === 'confirm') {
        c.fraudFlag = true;
        c.status = 'flagged';
      } else {
        c.fraudFlag = false;
        c.fitmentCategory = 'manual_review';
        c.status = 'complete';
      }
      return { success: true, candidate: { ...c } };
    }),

  getAnalytics: () => timed('getAnalytics', () => ANALYTICS),

  getFlaggedCandidates: () =>
    timed('getFlaggedCandidates', () =>
      liveCandidates.filter((c) => c.fitmentCategory === 'suspected_fraud' || c.status === 'flagged')
    ),
};
