import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'kn', native: 'ಕನ್ನಡ', roman: 'Kannada', tagline: 'ಕೌಶಲ್ಯ ನಿಮ್ಮದು' },
  { code: 'hi', native: 'हिंदी', roman: 'Hindi', tagline: 'आपका कौशल' },
  { code: 'en', native: 'English', roman: 'English', tagline: 'Your Skills' },
];

export default function LanguageSelect() {
  const navigate = useNavigate();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const { t } = useTranslation();

  const handlePick = (code) => {
    setLanguage(code);
    setTimeout(() => navigate('/register'), 220);
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Karigar<span className="text-brand">AI</span>
            </h1>
            <span className="h-2.5 w-2.5 rounded-full bg-brand inline-block animate-pulse" />
          </div>
          <p className="text-slate-300 font-kannada text-base">ಕೌಶಲ್ಯ ನಿಮ್ಮದು, ಅವಕಾಶ ನಮ್ಮದು</p>
          <p className="text-slate-400 text-sm mt-1">{t('tagline')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-300 text-xs uppercase tracking-widest mb-4"
        >
          {t('selectLanguage')}
        </motion.div>

        <div className="w-full max-w-sm space-y-3">
          {LANGUAGES.map((lang, i) => (
            <motion.button
              key={lang.code}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePick(lang.code)}
              className="group w-full text-left rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand/40 hover:border-l-4 hover:border-l-brand p-5 transition-all flex items-center justify-between"
            >
              <div>
                <div className="text-xl font-semibold text-white">{lang.native}</div>
                <div className="text-xs text-slate-400 mt-0.5">{lang.roman} · {lang.tagline}</div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-brand group-hover:translate-x-1 transition" />
            </motion.button>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="pb-8 px-6 flex items-center justify-center gap-2 text-xs text-slate-400"
      >
        <Shield className="h-3.5 w-3.5" />
        <span>{t('govFooter')}</span>
      </motion.div>
    </div>
  );
}
