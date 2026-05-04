import { Globe } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { cn } from '../../lib/utils';

const LANGS = [
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
];

const codeMap = { kannada: 'kn', hindi: 'hi', english: 'en' };

export const LanguageSwitcher = ({ variant = 'light' }) => {
  const lang = useAppStore((s) => s.selectedLanguage);
  const setLang = useAppStore((s) => s.setLanguage);
  const current = codeMap[lang] || lang;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full p-1 border',
        variant === 'dark'
          ? 'bg-white/10 border-white/15 text-white'
          : 'bg-white border-slate-200 text-slate-700'
      )}
    >
      <Globe className="h-3.5 w-3.5 mx-1.5 opacity-70" />
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={cn(
            'px-2.5 h-7 rounded-full text-xs font-semibold transition',
            current === l.code
              ? variant === 'dark'
                ? 'bg-brand text-white'
                : 'bg-brand text-white'
              : 'opacity-70 hover:opacity-100'
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};
