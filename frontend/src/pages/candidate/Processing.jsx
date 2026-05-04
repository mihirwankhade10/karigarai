import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Upload, Mic, Brain, FileCheck2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mockApi } from '../../lib/mockApi';
import { useAppStore } from '../../store/appStore';

export default function Processing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setResult = useAppStore((s) => s.setInterviewResult);
  const candidateId = useAppStore((s) => s.candidateId);
  const [step, setStep] = useState(0);
  const [uploadPct, setUploadPct] = useState(0);

  const STEPS = [
    { key: 'uploadingVideo', icon: Upload, duration: 2000 },
    { key: 'analysingSpeech', icon: Mic, duration: 2000 },
    { key: 'aiAssessment', icon: Brain, duration: 2000 },
    { key: 'preparingResult', icon: FileCheck2, duration: 1500 },
  ];

  // Animate upload progress in step 0
  useEffect(() => {
    if (step !== 0) return;
    let pct = 0;
    const id = setInterval(() => {
      pct += 5;
      setUploadPct(Math.min(100, pct));
      if (pct >= 100) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [step]);

  // Sequence steps
  useEffect(() => {
    if (step >= STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEPS[step].duration);
    return () => clearTimeout(t);
  }, [step]);

  // After all steps → fetch result
  useEffect(() => {
    if (step < STEPS.length) return;
    let alive = true;
    mockApi.getInterviewResult(`int_${candidateId}`).then((r) => {
      if (!alive) return;
      setResult(r);
      navigate('/result');
    });
    return () => { alive = false; };
  }, [step, navigate, setResult, candidateId]);

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
        <p className="text-center text-sm text-slate-400 mb-10">
          Karigar<span className="text-brand">AI</span>
        </p>

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
                      <p className="text-sm font-semibold text-white">{t(s.key)}</p>
                      {i === 0 && status === 'active' && (
                        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-brand transition-all"
                            style={{ width: `${uploadPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>
      </div>
    </div>
  );
}
