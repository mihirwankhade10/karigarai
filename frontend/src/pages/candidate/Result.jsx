import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Share2, RotateCcw, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { fitmentTheme } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { AcsRing } from '../../components/ui/AcsRing';
import { ScoreBar } from '../../components/ui/ScoreBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

const Confetti = () => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        bg: ['#F97316', '#16A34A', '#2563EB', '#FBBF24'][i % 4],
        size: 6 + Math.random() * 8,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-30">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-sm animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            top: '-10%',
            width: p.size,
            height: p.size * 0.5,
            background: p.bg,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default function Result() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const result = useAppStore((s) => s.interviewResult);
  const lang = useAppStore((s) => s.selectedLanguage);
  const reset = useAppStore((s) => s.resetCandidateFlow);
  const toast = useToast();

  useEffect(() => {
    if (!result) navigate('/');
  }, [result, navigate]);

  if (!result) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  const theme = fitmentTheme(result.fitmentCategory);
  const isJobReady = result.fitmentCategory === 'job_ready';
  const summary =
    lang === 'kn' || lang === 'kannada' ? result.aiSummaryKn : result.aiSummaryEn;

  const nextStepsKey = {
    job_ready: 'nextStepsJobReady',
    requires_upskilling: 'nextStepsUpskill',
    manual_review: 'nextStepsReview',
    low_confidence: 'nextStepsRetry',
    suspected_fraud: 'nextStepsReview',
  }[result.fitmentCategory];

  const tryAgain = () => {
    reset();
    navigate('/');
  };

  const share = async () => {
    const shareData = {
      title: 'KarigarAI Result',
      text: `My KarigarAI assessment: ${theme.label} (Score: ${result.acsScore})`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text} — ${shareData.url}`);
        toast.success('Copied to clipboard');
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {isJobReady && <Confetti />}

      <header className="px-4 h-14 flex items-center justify-center border-b border-slate-100">
        <div className="font-bold tracking-tight text-slate-800">
          Karigar<span className="text-brand">AI</span>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
            {t('yourResult')}
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {result.name}
          </h1>
        </motion.div>

        {/* Big fitment badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className={`mx-auto rounded-3xl ring-4 ${theme.ring} ${theme.bg} px-6 py-5 text-center mb-8`}
        >
          <div className="text-4xl mb-1">{theme.icon}</div>
          <div className={`text-xl font-bold ${theme.text}`}>{theme.label}</div>
          <div className="text-sm text-slate-600 mt-1 font-kannada">{theme.labelKn}</div>
        </motion.div>

        {/* ACS ring */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center mb-8"
        >
          <AcsRing score={result.acsScore} size={180} />
          <p className="mt-3 text-sm text-slate-500">{t('acsScore')}</p>
        </motion.div>

        {/* Score breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 space-y-4">
          <ScoreBar label={t('relevance')} score={result.relevanceScore} />
          <ScoreBar label={t('clarity')} score={result.clarityScore} />
          <ScoreBar label={t('skillConfidence')} score={result.skillConfidenceScore} />
        </div>

        {/* AI Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">{t('aiSummary')}</p>
          <blockquote className="text-slate-700 italic leading-relaxed border-l-4 border-brand pl-4">
            "{summary}"
          </blockquote>
        </div>

        {/* Next steps */}
        <div className="bg-brand/5 rounded-2xl border border-brand/20 p-5 mb-8">
          <p className="text-xs uppercase tracking-widest text-brand-700 mb-2 font-semibold">
            {t('nextSteps')}
          </p>
          <p className="text-slate-800 flex items-start gap-2">
            <ArrowRight className="h-4 w-4 mt-1 text-brand shrink-0" />
            <span>{t(nextStepsKey)}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={tryAgain} className="gap-2">
            <RotateCcw className="h-4 w-4" /> {t('tryAgain')}
          </Button>
          <Button onClick={share} className="gap-2">
            <Share2 className="h-4 w-4" /> {t('shareResult')}
          </Button>
        </div>
      </div>
    </div>
  );
}
