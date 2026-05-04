import { motion } from 'framer-motion';
import { scoreColor } from '../../lib/utils';

export const ScoreBar = ({ label, score = 0, max = 100 }) => {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const color = scoreColor(score);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${color.text}`}>{Math.round(score)}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className={`h-full rounded-full ${color.bg}`}
        />
      </div>
    </div>
  );
};
