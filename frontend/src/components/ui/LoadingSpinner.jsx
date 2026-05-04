import { cn } from '../../lib/utils';

export const LoadingSpinner = ({ size = 32, className, label }) => (
  <div className={cn('inline-flex flex-col items-center gap-2', className)}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      className="animate-spin"
      aria-label="Loading"
    >
      <circle cx="25" cy="25" r="20" stroke="#FFEDD5" strokeWidth="5" fill="none" />
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="#F97316"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="90 200"
      />
    </svg>
    {label && <span className="text-sm text-slate-500">{label}</span>}
  </div>
);
