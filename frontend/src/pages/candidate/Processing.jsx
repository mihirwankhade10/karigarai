import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Upload, Mic, Brain, ShieldCheck, FileCheck2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mockApi } from '../../lib/mockApi';
import { useAppStore } from '../../store/appStore';

// Map backend pipeline step \u2192 step index in our 5-step UI.
const STEP_INDEX = {
  uploaded: 0,
  transcribing: 1,
  assessing: 2,
  'fraud-check': 3,
  'proctor-complete': 3,
  done: 4,
  failed: 4,
};

export default function Processing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setResult = useAppStore((s) => s.setInterviewResult);
  const interviewId = useAppStore((s) => s.interviewId);
  const candidateId = useAppStore((s) => s.candidateId);

  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(15);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const STEPS = [
    { key: 'uploadingVideo', icon: Upload },
    { key: 'analysingSpeech', icon: Mic },
    { key: 'aiAssessment', icon: Brain },
    { key: 'integrityCheck', icon: ShieldCheck, fallbackLabel: 'Integrity check' },
    { key: 'preparingResult', icon: FileCheck2 },
  ];

  useEffect(() => {
    if (!interviewId) {
      navigate('/');
      return undefined;
    }

    let alive = true;
    let lastRealStep = -1;
    let stallCount = 0;       // how many polls returned the same step
    const STALL_THRESHOLD = 2; // after 2 stalls (6s), simulate progress

    // Simulated progress timer — advances through steps if backend workers aren't running
    let simTimer = null;
    let simStep = 0;
    const simStepDurations = [2500, 3000, 3500, 2500, 2000]; // ms per step

    function startSimulation(fromStep) {
      simStep = fromStep;
      const advance = () => {
        if (!alive) return;
        simStep++;
        if (simStep >= STEPS.length) {
          // Simulation complete — try to fetch real result, else navigate with whatever we have
          setStep(STEPS.length - 1);
          setProgress(100);
          (async () => {
            try {
              const result = await mockApi.getInterviewResult(interviewId);
              if (result) setResult(result);
            } catch (_) {
              // No real result available — that's OK for demo
            }
            setTimeout(() => alive && navigate('/result'), 600);
          })();
          return;
        }
        setStep(simStep);
        setProgress(Math.round(((simStep + 1) / STEPS.length) * 100));
        simTimer = setTimeout(advance, simStepDurations[simStep] || 2500);
      };
      simTimer = setTimeout(advance, simStepDurations[simStep] || 2500);
    }

    const poll = async () => {
      try {
        const status = await mockApi.getInterviewStatus(interviewId);
        if (!alive) return;
        if (!status) { stallCount++; return; }

        const nextStep = STEP_INDEX[status.step] ?? step;

        if (nextStep > lastRealStep) {
          lastRealStep = nextStep;
          stallCount = 0;
          // Clear simulation if backend is actually progressing
          if (simTimer) { clearTimeout(simTimer); simTimer = null; }
        } else {
          stallCount++;
        }

        setStep(nextStep);
        if (status.progress != null) setProgress(Number(status.progress));

        if (status.status === 'failed') {
          setError(status.error || 'Pipeline failed');
          clearInterval(pollRef.current);
        }
        if (status.status === 'complete') {
          clearInterval(pollRef.current);
          if (simTimer) clearTimeout(simTimer);
          const result = status.result
            ? mapEmbeddedResult(status.result)
            : await mockApi.getInterviewResult(interviewId);
          setResult(result);
          setTimeout(() => navigate('/result'), 400);
        }

        // If pipeline is stalled, start simulating
        if (stallCount >= STALL_THRESHOLD && !simTimer) {
          clearInterval(pollRef.current);
          startSimulation(nextStep);
        }
      } catch (err) {
        stallCount++;
        console.warn('[processing] poll failed', err?.message);
        // If we keep failing, start simulation
        if (stallCount >= STALL_THRESHOLD && !simTimer) {
          clearInterval(pollRef.current);
          startSimulation(step);
        }
      }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(pollRef.current);
      if (simTimer) clearTimeout(simTimer);
    };
  }, [interviewId, navigate, setResult, step]);

  return (
    <div className="min-h-screen bg-bg-dark text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-center mb-2"
        >
          {t('processing')}
        </motion.h1>
        <p className="text-center text-sm text-slate-400 mb-2">
          Karigar<span className="text-brand">AI</span>
        </p>
        <p className="text-center text-xs text-slate-500 mb-8">{progress}%</p>

        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const status = i < step ? 'done' : i === step ? 'active' : 'pending';
            return (
              <AnimatePresence key={s.key}>
                {i <= step && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`flex items-center gap-4 rounded-2xl border p-4 ${
                      status === 'done'
                        ? 'bg-success/10 border-success/30'
                        : status === 'active'
                        ? 'bg-white/5 border-brand/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        status === 'done'
                          ? 'bg-success'
                          : status === 'active'
                          ? 'bg-brand'
                          : 'bg-white/10'
                      }`}
                    >
                      {status === 'done' ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : status === 'active' ? (
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5 text-white/70" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {t(s.key, { defaultValue: s.fallbackLabel || s.key })}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function mapEmbeddedResult(r) {
  // The fitment worker writes a complete result object into Redis on
  // completion (see backend/workers/fitment/index.js). Frontend uses
  // candidate-shaped fields via mapInterviewToCandidate \u2014 mirror the
  // few fields used by the result screen.
  return {
    id: r.candidateId,
    interviewId: r.interviewId,
    name: r.name,
    phone: r.phone,
    district: r.district,
    tradeCategory: r.tradeCategory,
    language: r.language,
    photo: r.selfieUrl,
    acsScore: r.acsScore,
    relevanceScore: r.relevanceScore,
    clarityScore: r.clarityScore,
    skillConfidenceScore: r.skillConfidenceScore,
    fitmentCategory: r.fitmentCategory,
    workforceSegment: r.workforceSegment,
    aiSummaryEn: r.aiSummaryEn,
    aiSummaryKn: r.aiSummaryKn,
    keyObservations: r.keyObservations || [],
    fraudFlag: !!r.fraudFlag,
    fraudReason: r.fraudReason,
    fraudSimilarity: r.fraudSimilarity,
    qualityFlag: false,
    proctorFlag: !!r.proctorFlag,
    status: 'complete',
    interviewDate: new Date().toISOString(),
  };
}
