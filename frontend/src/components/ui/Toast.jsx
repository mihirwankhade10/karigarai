import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-danger" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  info: <Info className="h-5 w-5 text-info" />,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = Math.random().toString(36).slice(2);
      const item = { id, type: 'info', duration: 3000, ...toast };
      setToasts((list) => [...list, item]);
      if (item.duration > 0) {
        setTimeout(() => remove(id), item.duration);
      }
      return id;
    },
    [remove]
  );

  const api = {
    push,
    success: (msg, opts) => push({ message: msg, type: 'success', ...opts }),
    error: (msg, opts) => push({ message: msg, type: 'error', ...opts }),
    info: (msg, opts) => push({ message: msg, type: 'info', ...opts }),
    warning: (msg, opts) => push({ message: msg, type: 'warning', ...opts }),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl bg-white border border-slate-200 shadow-lg px-4 py-3 min-w-[260px]'
              )}
            >
              <div className="mt-0.5">{ICONS[t.type]}</div>
              <div className="flex-1">
                {t.title && <p className="font-semibold text-slate-800 text-sm">{t.title}</p>}
                <p className="text-sm text-slate-600">{t.message}</p>
              </div>
              <button
                onClick={() => remove(t.id)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};
