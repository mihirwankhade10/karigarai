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

// Map UI language to BCP-47 lang tag for speechSynthesis
const ttsLangFor = (uiLang) => {
  if (uiLang === 'hi' || uiLang === 'hindi') return 'hi-IN';
  if (uiLang === 'en' || uiLang === 'english') return 'en-IN';
  return 'kn-IN';
};

// Active audio element for cleanup
let activeAudio = null;

/**
 * Try Sarvam AI TTS via backend, fall back to browser speechSynthesis.
 * Returns a Promise that resolves when speaking finishes.
 */
async function speakText(text, lang) {
  if (!text) return;

  // --- Attempt 1: Sarvam AI TTS (natural Indian voice) ---
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: lang }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audio) {
        // Sarvam returns base64-encoded WAV audio
        const audioSrc = `data:audio/wav;base64,${data.audio}`;
        return new Promise((resolve) => {
          const audio = new Audio(audioSrc);
          activeAudio = audio;
          audio.playbackRate = 1.0;
          audio.onended = () => { activeAudio = null; resolve(); };
          audio.onerror = () => { activeAudio = null; resolve(); };
          // Safety timeout
          const fallback = setTimeout(() => { audio.pause(); activeAudio = null; resolve(); }, 20000);
          audio.onended = () => { clearTimeout(fallback); activeAudio = null; resolve(); };
          audio.play().catch(() => { clearTimeout(fallback); activeAudio = null; resolve(); });
        });
      }
    }
  } catch (_) {
    // Sarvam failed — fall through to browser TTS
  }

  // --- Attempt 2: Browser Web Speech API (fallback) ---
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setTimeout(resolve, 2800);
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(lang.split('-')[0]));
    if (match) utterance.voice = match;

    const fallback = setTimeout(() => {
      window.speechSynthesis.cancel();
      resolve();
    }, 15000);

    utterance.onend = () => { clearTimeout(fallback); resolve(); };
    utterance.onerror = () => { clearTimeout(fallback); resolve(); };

    window.speechSynthesis.speak(utterance);
  });
}

// Pick the best supported recorder mime-type. Order from most-compatible
// (Chrome/Edge) to fallbacks. Backend ffmpeg pipeline accepts any of these.
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
  const [phase, setPhase] = useState('loading'); // loading | speaking | ready | recording | saved | submitting
  const [recordStart, setRecordStart] = useState(null);
  const webcamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(null); // performance.now() when MediaRecorder.start() was called
  const responsesRef = useRef([]);   // [{questionId, startSec, durationSec, skipped}]

  // ----- redirect if no candidate ----------------------------------------
  useEffect(() => {
    if (!candidate || !candidateId) navigate('/');
  }, [candidate, candidateId, navigate]);

  // ----- fetch the 12 generated questions for this candidate -------------
  useEffect(() => {
    if (!candidateId) return;
    let alive = true;
    (async () => {
      try {
        // Pass candidateId so mockApi.getInterviewQuestions hits /api/candidates/:id/questions
        const qs = await mockApi.getInterviewQuestions(candidate?.tradeCategory, candidateId);
        if (!alive) return;
        setLocalQuestions(qs);
        setQuestions(qs);
        setPhase('speaking');
      } catch (err) {
        toast.error(err?.message || t('error'));
      }
    })();
    return () => { alive = false; };
  }, [candidateId, candidate?.tradeCategory, setQuestions, t, toast]);

  // ----- speaking: read the question aloud via TTS -------------------------
  useEffect(() => {
    if (phase !== 'speaking' || !questions.length) return;
    let cancelled = false;
    const currentQ = questions[idx];
    const text = currentQ?.[langKeyFor(lang)] || currentQ?.questionEn;
    const ttsLang = ttsLangFor(lang);

    speakText(text, ttsLang).then(() => {
      if (!cancelled) setPhase('ready');
    });

    return () => {
      cancelled = true;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (activeAudio) { activeAudio.pause(); activeAudio = null; }
    };
  }, [phase, idx, questions, lang]);

  // ----- ensure MediaRecorder is started once on first record ------------
  async function ensureRecorder() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') return;

    // Get fresh stream with audio so the MediaRecorder captures sound.
    // (react-webcam's <Webcam audio={false}> doesn't include audio in its stream.)
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
    rec.start(1000); // emit a chunk every second so we never lose data on mid-stream stop
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

  // ----- per-question record/stop ----------------------------------------
  const startRecord = async () => {
    try {
      await ensureRecorder();
    } catch (err) {
      toast.error(err?.message || 'Microphone/camera access denied');
      return;
    }
    setRecordStart(performance.now());
    setPhase('recording');
  };

  const stopRecord = async () => {
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
    setTimeout(() => advanceOrSubmit(), 1200);
  };

  const skip = () => {
    responsesRef.current.push({
      questionId: questions[idx]?.id || null,
      durationSec: 0,
      skipped: true,
    });
    addResponse({ questionId: questions[idx]?.id, duration: 0, recorded: false, skipped: true });
    advanceOrSubmit();
  };

  async function advanceOrSubmit() {
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
      setPhase('speaking');
      return;
    }

    // Last question \u2014 stop recording and submit.
    setPhase('submitting');
    const blob = await stopRecorder();
    try {
      const res = await mockApi.submitInterview({
        candidateId,
        video: blob,
        videoFilename: 'interview.webm',
        proctoringSummary: null, // future: tab-switch / face-presence events
      });
      if (setInterviewId && res.interviewId) setInterviewId(res.interviewId);
      navigate('/processing');
    } catch (err) {
      toast.error(err?.message || 'Could not submit interview');
      setPhase('saved'); // allow retry by clicking next? simplest: go back to ready
    }
  }

  // Stop the recorder and TTS if user navigates away mid-interview.
  useEffect(() => () => {
    try { stopRecorder(); } catch (_) {}
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (activeAudio) { activeAudio.pause(); activeAudio = null; }
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
                <CheckCircle2 className="h-5 w-5" /> {t('responseSaved')} \u2713
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
