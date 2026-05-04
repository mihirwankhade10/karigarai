import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Select = forwardRef(({ className, children, error, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'h-12 w-full appearance-none rounded-xl border bg-white pl-4 pr-10 text-base text-slate-800 transition focus:outline-none focus:ring-2',
        error
          ? 'border-danger focus:ring-danger/30'
          : 'border-slate-200 focus:border-brand focus:ring-brand/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
  </div>
));
Select.displayName = 'Select';
