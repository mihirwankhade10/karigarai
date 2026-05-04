import { fitmentTheme } from '../../lib/utils';
import { cn } from '../../lib/utils';

export const FitmentBadge = ({ category, size = 'md', showIcon = true, className }) => {
  const t = fitmentTheme(category);
  const sizes = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        t.pill,
        sizes[size],
        className
      )}
    >
      {showIcon && <span aria-hidden>{t.icon}</span>}
      {t.label}
    </span>
  );
};
