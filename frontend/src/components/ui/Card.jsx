import { cn } from '../../lib/utils';

export const Card = ({ className, ...props }) => (
  <div
    className={cn('rounded-2xl bg-white border border-slate-200/70 shadow-sm', className)}
    {...props}
  />
);
export const CardHeader = ({ className, ...props }) => (
  <div className={cn('p-5 border-b border-slate-100', className)} {...props} />
);
export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-semibold text-slate-800', className)} {...props} />
);
export const CardContent = ({ className, ...props }) => (
  <div className={cn('p-5', className)} {...props} />
);
