import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

export const DemoBadge = () => {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex items-center gap-1.5 rounded-full bg-amber-500/95 text-white text-[11px] font-semibold px-3 py-1.5 shadow-lg backdrop-blur-sm">
        <Sparkles className="h-3 w-3" />
        <span>{t('demoBadge')}</span>
      </div>
    </div>
  );
};
