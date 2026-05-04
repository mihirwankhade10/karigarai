import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-12 w-full rounded-xl border bg-white px-4 text-base text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:ring-2',
      error
        ? 'border-danger focus:ring-danger/30'
        : 'border-slate-200 focus:border-brand focus:ring-brand/20',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Label = ({ className, children, required, ...props }) => (
  <label
    className={cn('block text-sm font-medium text-slate-700 mb-1.5', className)}
    {...props}
  >
    {children}
    {required && <span className="text-danger ml-0.5">*</span>}
  </label>
);

export const FieldError = ({ children }) =>
  children ? <p className="mt-1 text-xs text-danger">{children}</p> : null;
