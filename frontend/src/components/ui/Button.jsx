import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-600 active:scale-[0.98] focus:ring-brand/40 shadow-sm',
        secondary: 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 focus:ring-slate-300',
        ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
        outline: 'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-300',
        success: 'bg-success text-white hover:bg-green-700 focus:ring-success/40',
        danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger/40',
        dark: 'bg-navy-800 text-white hover:bg-navy-700 focus:ring-navy-700',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-14 px-7 text-base',
        xl: 'h-16 px-8 text-lg',
        icon: 'h-10 w-10',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  }
);

export const Button = forwardRef(({ className, variant, size, fullWidth, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, fullWidth }), className)} {...props} />
));
Button.displayName = 'Button';
