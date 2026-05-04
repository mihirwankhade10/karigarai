import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, CheckCircle2, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { mockApi } from '../../lib/mockApi';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

const langKeyFor = (uiLang) => {
  if (uiLang === 'hi' || uiLang === 'hindi') return 'questionHi';
  if (uiLang === 'en' || uiLang === 'english') return 'questionEn';
  return 'questionKn';
};

export default function Interview() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const candidate = useAppStore((s) => s.candidateData);
  const candidateId = useAppStore((s) => s.candidateId);
  const setQuestions = useAppStore((s) => s.setInterviewQuestions);
  const addResponse = useAppStore((s) => s.addInterviewResponse);
  const lang = useAppStore((s) => s.selectedLanguage);

  const [questions, setLocalQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('loading'); // loading | speaking | ready | recording | saved
  const [recordStart, setRecordStart] = useState(null);
  const webcamRef = useRef(null);

  // No candidate data? send back to start
  useEffect(() => {
    if (!candidate || !candidateId) {
      navigate('/');
    }
  }, [candidate, candidateId, navigate]);

  // Fetch questions
  useEffect(() => {
    if (!candidate?.tradeCategory) return;
    let alive = true;
    (async () => {
      const qs = await mockApi.getInterviewQuestions(candidate.tradeCategory);
      if (!alive) return;
      setLocalQuestions(qs);
      setQuestions(qs);
      setPhase('speaking');
    })();
    return () => { alive = false; };
  }, [candidate?.tradeCategory, setQuestions]);

  // Speaking phase → ready phase after 3s
  useEffect(() => {
    if (phase !== 'speaking') return;
    const t = setTimeout(() => setPhase('ready'), 2800);
    return () => clearTimeout(t);
  }, [phase, idx]);

  const startRecord = () => {
    setRecordStart(Date.now());
    setPhase('recording');
  };

  const stopRecord = () => {
    const duration = Math.max(1, Math.round((Date.now() - recordStart) / 1000));
    addResponse({ questionId: questions[idx]?.id, duration, recorded: true });
    setPhase('saved');
    toast.success(t('responseSaved'));
    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        // submit + go to processing
        mockApi.submitInterview({ candidateId }).then(() => navigate('/processing'));
      } else {
        setIdx((i) => i + 1);
        setPhase('speaking');
      }
    }, 1500);
  };

  const skip = () => {
    addResponse({ questionId: questions[idx]?.id, duration: 0, recorded: false, skipped: true });
    if (idx + 1 >= questions.length) {
      mockApi.submitInterview({ candidateId }).then(() => navigate('/processing'));
    } else {
      setIdx((i) => i + 1);
      setPhase('speaking');
    }
  };

  if (phase === 'loading' || !questions.length) {
    return (
      <div className="min-h-screen bg-bg-dark text-white flex items-center justify-center">
        <LoadingSpinner size={40} label={t('loading')} />
      </div>
    );
  }

  const currentQ = questions[idx];
  const qText = currentQ?.[langKeyFor(lang)] || currentQ?.questionEn;
  const progressPct = ((idx + (phase === 'saved' ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col">
      <header className="px-4 h-14 flex items-center justify-between border-b border-white/5">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/5 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold">{t('interviewTitle')}</div>
        <div className="text-xs text-slate-400">
          {t('questionOf', { current: idx + 1, total: questions.length })}
        </div>
      </header>

      {/* AI avatar */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4 px-6">
        <div className="relative h-32 w-32 mb-5">
          <div
            className={`absolute inset-0 rounded-full ${
              phase === 'speaking'
                ? 'bg-brand/30 animate-pulse-ring'
                : phase === 'recording'
                ? 'bg-danger/30 animate-pulse-ring'
                : 'bg-info/20 animate-pulse-ring'
            }`}
          />
          <div
            className={`absolute inset-2 rounded-full ${
              phase === 'speaking'
                ? 'bg-brand/40 animate-pulse-ring'
                : phase === 'recording'
                ? 'bg-danger/40 animate-pulse-ring'
                : 'bg-info/30 animate-pulse-ring'
            }`}
            style={{ animationDelay: '300ms' }}
          />
          <div
            className={`relative h-32 w-32 rounded-full flex items-center justify-center ${
              phase === 'speaking'
                ? 'bg-brand'
                : phase === 'recording'
                ? 'bg-danger'
                : 'bg-info'
            } shadow-2xl`}
          >
            <Mic className="h-12 w-12 text-white" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={idx + phase}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-center min-h-[80px]"
          >
            <p className="text-xl font-semibold leading-relaxed text-white">{qText}</p>
            {phase === 'speaking' && (
              <p className="text-xs text-slate-400 mt-3">AI is asking you a question...</p>
            )}
            {phase === 'recording' && (
              <p className="text-xs text-danger mt-3 inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                {t('recording')}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Webcam PiP */}
      <div className="px-4 my-2 flex justify-center">
        <div className="relative w-32 h-44 rounded-2xl overflow-hidden bg-black/60 ring-1 ring-white/10 shadow-xl">
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={{ facingMode: 'user' }}
            className="h-full w-full object-cover"
            onUserMediaError={() => {
              // silent fallback — show placeholder
            }}
          />
          {phase === 'recording' && (
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> REC
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-auto pb-8 px-6">
        <div className="flex flex-col items-center gap-4">
          <AnimatePresence mode="wait">
            {phase === 'saved' ? (
              <motion.div
                key="saved"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 text-success font-semibold"
              >
                <CheckCircle2 className="h-5 w-5" /> {t('responseSaved')} ✓
              </motion.div>
            ) : (
              <motion.button
                key="record"
                disabled={phase === 'speaking' || phase === 'loading'}
                onClick={phase === 'recording' ? stopRecord : startRecord}
                whileTap={{ scale: 0.92 }}
                className={`relative h-20 w-20 rounded-full flex items-center justify-center shadow-2xl transition disabled:opacity-50 ${
                  phase === 'recording' ? 'bg-white' : 'bg-danger'
                }`}
              >
                {phase === 'recording' ? (
                  <Square className="h-7 w-7 text-danger fill-danger" />
                ) : (
                  <Mic className="h-8 w-8 text-white" />
                )}
                {phase === 'recording' && (
                  <span className="absolute inset-0 rounded-full ring-4 ring-danger/40 animate-pulse-ring" />
                )}
              </motion.button>
            )}
          </AnimatePresence>
          <p className="text-xs text-slate-400">
            {phase === 'recording' ? t('tapToStop') : t('tapToRecord')}
          </p>
          <button onClick={skip} className="text-xs text-slate-400 underline-offset-4 hover:underline">
            {t('skip')}
          </button>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{t('questionOf', { current: idx + 1, total: questions.length })}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-brand"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
