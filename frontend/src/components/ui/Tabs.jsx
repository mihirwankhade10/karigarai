import { createContext, useContext } from 'react';
import { cn } from '../../lib/utils';

const TabsCtx = createContext(null);

export const Tabs = ({ value, onChange, children, className }) => (
  <TabsCtx.Provider value={{ value, onChange }}>
    <div className={cn('w-full', className)}>{children}</div>
  </TabsCtx.Provider>
);

export const TabsList = ({ children, className }) => (
  <div
    className={cn(
      'inline-flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200',
      className
    )}
  >
    {children}
  </div>
);

export const TabsTrigger = ({ value, children, className }) => {
  const ctx = useContext(TabsCtx);
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.onChange(value)}
      className={cn(
        'px-4 h-9 rounded-lg text-sm font-medium transition',
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900',
        className
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, className }) => {
  const ctx = useContext(TabsCtx);
  if (ctx.value !== value) return null;
  return <div className={cn('mt-4 animate-fade-in', className)}>{children}</div>;
};
