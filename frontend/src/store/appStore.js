import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SEEDED_SHORTLIST } from '../lib/mockData';

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ============= Candidate flow =============
      selectedLanguage: 'kn',
      candidateData: null,
      candidateId: null,
      interviewQuestions: [],
      interviewResponses: [],
      interviewResult: null,

      // ============= Admin =============
      adminUser: null,
      isAdminAuthenticated: false,
      shortlistedIds: SEEDED_SHORTLIST,

      // ============= Actions — candidate =============
      setLanguage: (lang) => set({ selectedLanguage: lang }),
      setCandidate: (data) => set({ candidateData: data }),
      setCandidateId: (id) => set({ candidateId: id }),
      setInterviewQuestions: (qs) => set({ interviewQuestions: qs, interviewResponses: [] }),
      addInterviewResponse: (resp) =>
        set((s) => ({ interviewResponses: [...s.interviewResponses, resp] })),
      setInterviewResult: (r) => set({ interviewResult: r }),
      resetCandidateFlow: () =>
        set({
          candidateData: null,
          candidateId: null,
          interviewQuestions: [],
          interviewResponses: [],
          interviewResult: null,
        }),

      // ============= Actions — admin =============
      loginAdmin: (user) => set({ adminUser: user, isAdminAuthenticated: true }),
      logoutAdmin: () => set({ adminUser: null, isAdminAuthenticated: false }),
      toggleShortlist: (id) =>
        set((s) => ({
          shortlistedIds: s.shortlistedIds.includes(id)
            ? s.shortlistedIds.filter((x) => x !== id)
            : [...s.shortlistedIds, id],
        })),
      isShortlisted: (id) => get().shortlistedIds.includes(id),
    }),
    {
      name: 'karigarai-store',
      partialize: (s) => ({
        selectedLanguage: s.selectedLanguage,
        adminUser: s.adminUser,
        isAdminAuthenticated: s.isAdminAuthenticated,
        shortlistedIds: s.shortlistedIds,
      }),
    }
  )
);
