import { useEffect, useRef, useState, useCallback } from 'react';
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

const ttsLangFor = (uiLang) => {
  if (uiLang === 'hi' || uiLang === 'hindi') return 'hi-IN';
  if (uiLang === 'en' || uiLang === 'english') return 'en-IN';
  return 'kn-IN';
};

// Pick the best supported recorder mime-type.
function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return null;
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) || null;
}

/** Stop all audio output immediately */
function stopAllAudio(audioRef) {
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
  try {
    if (audioRef?.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  } catch (_) {}
}

/**
 * Speak text. Tries Sarvam TTS via backend (5s timeout), falls back to browser.
 * Respects AbortSignal for cancellation.
 */
async function speakText(text, lang, audioRef, signal) {
  if (!text || signal?.aborted) return;

  // --- Attempt 1: Sarvam AI TTS (5s timeout — fast fail) ---
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s max wait

    // Combine our timeout abort with the external abort signal
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: lang }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (signal?.aborted) return;

    if (res.ok) {
      const data = await res.json();
      if (data.audio && !signal?.aborted) {
        const audioSrc = `data:audio/wav;base64,${data.audio}`;
        return new Promise((resolve) => {
          if (signal?.aborted) return resolve();
          const audio = new Audio(audioSrc);
          audioRef.current = audio;

          const cleanup = () => { audioRef.current = null; resolve(); };
          const fallback = setTimeout(() => { audio.pause(); cleanup(); }, 20000);

          audio.onended = () => { clearTimeout(fallback); cleanup(); };
          audio.onerror = () => { clearTimeout(fallback); cleanup(); };

          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(fallback);
              audio.pause();
              audio.src = '';
              cleanup();
            }, { once: true });
          }

          audio.play().catch(() => { clearTimeout(fallback); cleanup(); });
        });
      }
    }
  } catch (err) {
    if (err.name === 'AbortError' || signal?.aborted) return;
    // Sarvam failed — fall through to browser TTS
    console.log('[TTS] Sarvam failed, using browser fallback');
  }

  if (signal?.aborted) return;

  // --- Attempt 2: Browser Web Speech API ---
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setTimeout(resolve, 2000);
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang === lang) ||
                  voices.find((v) => v.lang.startsWith(lang.split('-')[0]));
    if (match) utterance.voice = match;

    const fallback = setTimeout(() => { window.speechSynthesis.cancel(); resolve(); }, 12000);
    utterance.onend = () => { clearTimeout(fallback); resolve(); };
    utterance.onerror = () => { clearTimeout(fallback); resolve(); };

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(fallback);
        window.speechSynthesis.cancel();
        resolve();
      }, { once: true });
    }

    window.speechSynthesis.speak(utterance);
  });
}


export default function Interview() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const candidate = useAppStore((s) => s.candidateData);
  const candidateId = useAppStore((s) => s.candidateId);
  const setQuestions = useAppStore((s) => s.setInterviewQuestions);
  const addResponse = useAppStore((s) => s.addInterviewResponse);
  const setInterviewId = useAppStore((s) => s.setInterviewId);
  const lang = useAppStore((s) => s.selectedLanguage);

  const [questions, setLocalQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('loading');
  const [recordStart, setRecordStart] = useState(null);
  const webcamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(null);
  const responsesRef = useRef([]);
  const audioRef = useRef(null);
  const ttsAbortRef = useRef(null);
  const questionsLoadedRef = useRef(false);   // prevent re-fetching
  const submittingRef = useRef(false);         // prevent double submit
  const speakingIdRef = useRef(0);             // unique ID per speaking attempt

  // ----- redirect if no candidate ----------------------------------------
  useEffect(() => {
    if (!candidate || !candidateId) navigate('/');
  }, [candidate, candidateId, navigate]);

  // ----- fetch questions ONCE for this candidate ---------------------------
  useEffect(() => {
    if (!candidateId || questionsLoadedRef.current) return;
    questionsLoadedRef.current = true; // Prevent StrictMode double-fire

    (async () => {
      try {
        const qs = await mockApi.getInterviewQuestions(candidate?.tradeCategory, candidateId);
        setLocalQuestions(qs);
        setQuestions(qs);
        setPhase('speaking');
      } catch (err) {
        questionsLoadedRef.current = false; // allow retry on error
        toast.error(err?.message || t('error'));
      }
    })();
  }, [candidateId]); // minimal deps — runs once

  // ----- TTS: speak the current question -----------------------------------
  useEffect(() => {
    if (phase !== 'speaking' || !questions.length) return;

    // Increment speaking ID to invalidate any previous speaking attempt
    const myId = ++speakingIdRef.current;

    // Cancel any prior speech immediately
    if (ttsAbortRef.current) ttsAbortRef.current.abort();
    stopAllAudio(audioRef);

    const controller = new AbortController();
    ttsAbortRef.current = controller;

    const currentQ = questions[idx];
    const text = currentQ?.[langKeyFor(lang)] || currentQ?.questionEn;
    const ttsLang = ttsLangFor(lang);

    speakText(text, ttsLang, audioRef, controller.signal).then(() => {
      // Only transition if this is still the active speaking attempt
      if (speakingIdRef.current === myId && !controller.signal.aborted) {
        setPhase('ready');
      }
    });

    return () => {
      controller.abort();
      stopAllAudio(audioRef);
    };
  }, [phase, idx, questions, lang]);

  // ----- MediaRecorder management ------------------------------------------
  async function ensureRecorder() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true,
    });

    const mimeType = pickMimeType();
    const opts = mimeType ? { mimeType } : {};
    const rec = new MediaRecorder(stream, opts);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(1000);
    startedAtRef.current = performance.now();
    recorderRef.current = rec;
  }

  function stopRecorder() {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec) return resolve(null);
      const tracks = rec.stream.getTracks();
      rec.onstop = () => {
        for (const trk of tracks) trk.stop();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
        chunksRef.current = [];
        recorderRef.current = null;
        resolve(blob);
      };
      try { rec.stop(); } catch (_) { resolve(null); }
    });
  }

  // ----- record / stop per question ----------------------------------------
  const startRecord = useCallback(async () => {
    // Cancel any speech before recording
    if (ttsAbortRef.current) ttsAbortRef.current.abort();
    stopAllAudio(audioRef);

    try {
      await ensureRecorder();
    } catch (err) {
      toast.error(err?.message || 'Microphone/camera access denied');
      return;
    }
    setRecordStart(performance.now());
    setPhase('recording');
  }, [toast]);

  const stopRecord = useCallback(async () => {
    const startSec = ((recordStart ?? performance.now()) - startedAtRef.current) / 1000;
    const durationSec = Math.max(1, Math.round((performance.now() - recordStart) / 1000));
    responsesRef.current.push({
      questionId: questions[idx]?.id || null,
      startSec: Math.max(0, Math.round(startSec)),
      durationSec,
      skipped: false,
    });
    addResponse({ questionId: questions[idx]?.id, duration: durationSec, recorded: true });
    setPhase('saved');
    toast.success(t('responseSaved'));
    setTimeout(() => advanceOrSubmit(), 600);
  }, [recordStart, questions, idx, addResponse, toast, t]);

  const skip = useCallback(() => {
    if (ttsAbortRef.current) ttsAbortRef.current.abort();
    stopAllAudio(audioRef);

    responsesRef.current.push({
      questionId: questions[idx]?.id || null,
      durationSec: 0,
      skipped: true,
    });
    addResponse({ questionId: questions[idx]?.id, duration: 0, recorded: false, skipped: true });
    advanceOrSubmit();
  }, [questions, idx, addResponse]);

  function advanceOrSubmit() {
    // Cancel ALL speech before advancing
    if (ttsAbortRef.current) ttsAbortRef.current.abort();
    stopAllAudio(audioRef);

    if (idx + 1 < questions.length) {
      // Use functional update + sync phase change to avoid stale state
      setIdx((i) => i + 1);
      setPhase('speaking');
      return;
    }

    // Last question — submit
    submitInterview();
  }

  async function submitInterview() {
    // Prevent double-submit
    if (submittingRef.current) return;
    submittingRef.current = true;

    setPhase('submitting');
    if (ttsAbortRef.current) ttsAbortRef.current.abort();
    stopAllAudio(audioRef);

    const blob = await stopRecorder();
    try {
      const res = await mockApi.submitInterview({
        candidateId,
        video: blob,
        videoFilename: 'interview.webm',
        proctoringSummary: null,
      });
      if (setInterviewId && res.interviewId) setInterviewId(res.interviewId);
      navigate('/processing');
    } catch (err) {
      submittingRef.current = false; // allow retry
      toast.error(err?.message || 'Could not submit interview');
      setPhase('ready');
    }
  }

  // Cleanup on unmount
  useEffect(() => () => {
    try { stopRecorder(); } catch (_) {}
    if (ttsAbortRef.current) ttsAbortRef.current.abort();
    stopAllAudio(audioRef);
  }, []);

  if (phase === 'loading' || !questions.length) {
    return (
      <div className="min-h-screen bg-bg-dark text-white flex items-center justify-center">
        <LoadingSpinner size={40} label={t('loading')} />
      </div>
    );
  }

  const currentQ = questions[idx];
  const qText = currentQ?.[langKeyFor(lang)] || currentQ?.questionEn;
  const progressPct = ((idx + (phase === 'saved' || phase === 'submitting' ? 1 : 0)) / questions.length) * 100;

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
            key={`q-${idx}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
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
            {phase === 'submitting' && (
              <p className="text-xs text-info mt-3">Uploading your interview...</p>
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
            onUserMediaError={() => { /* silent */ }}
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
            {phase === 'submitting' ? (
              <motion.div
                key="submitting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="inline-flex items-center gap-2 text-info font-semibold"
              >
                <LoadingSpinner size={18} /> Submitting...
              </motion.div>
            ) : phase === 'saved' ? (
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
            {phase === 'recording' ? t('tapToStop') : phase === 'submitting' ? '' : t('tapToRecord')}
          </p>
          {phase !== 'submitting' && (
            <button onClick={skip} className="text-xs text-slate-400 underline-offset-4 hover:underline">
              {t('skip')}
            </button>
          )}
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
