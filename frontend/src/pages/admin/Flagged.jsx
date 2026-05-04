import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Flag } from 'lucide-react';
import { mockApi } from '../../lib/mockApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CandidateAvatar } from '../../components/ui/CandidateAvatar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

export default function Flagged() {
  const [list, setList] = useState(null);
  const toast = useToast();

  const fetchList = () => mockApi.getFlaggedCandidates().then((d) => setList(d));
  useEffect(() => { fetchList(); }, []);

  const resolve = async (id, resolution) => {
    const r = await mockApi.resolveFlag(id, resolution);
    if (r.success) {
      toast.success(resolution === 'confirm' ? 'Confirmed as fraud' : 'Flag cleared');
      fetchList();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 md:p-8 max-w-7xl mx-auto"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-danger" />
            Flagged Cases
          </h1>
          <p className="text-sm text-slate-500">
            {list ? `${list.length} cases require review` : 'Loading...'}
          </p>
        </div>
        {list && list.length > 0 && (
          <span className="rounded-full bg-danger text-white text-sm font-bold px-4 py-1.5">
            {list.length} pending
          </span>
        )}
      </div>

      <Card className="overflow-hidden">
        {list === null ? (
          <div className="p-10 flex justify-center">
            <LoadingSpinner size={32} />
          </div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
            <p className="text-slate-700 font-semibold">All clear — no pending fraud reviews.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-3 py-3">Trade</th>
                  <th className="px-3 py-3">District</th>
                  <th className="px-3 py-3">Fraud Reason</th>
                  <th className="px-3 py-3">Confidence</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-danger/5">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <CandidateAvatar src={c.photo} name={c.name} size={36} />
                        <div>
                          <Link
                            to={`/admin/candidates/${c.id}`}
                            className="font-semibold text-slate-800 hover:text-brand"
                          >
                            {c.name}
                          </Link>
                          <div className="text-xs text-slate-500">{c.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{c.tradeCategory}</td>
                    <td className="px-3 py-3 text-slate-700">{c.district}</td>
                    <td className="px-3 py-3 max-w-xs">
                      <p className="text-xs text-slate-700 line-clamp-2">{c.fraudReason}</p>
                    </td>
                    <td className="px-3 py-3 font-semibold text-danger tabular-nums">
                      {Math.round((c.fraudSimilarity || 0) * 100)}%
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex flex-wrap items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => resolve(c.id, 'confirm')}
                          className="gap-1"
                        >
                          <Flag className="h-3.5 w-3.5" /> Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => resolve(c.id, 'clear')}
                          className="gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Clear
                        </Button>
                        <Link
                          to={`/admin/candidates/${c.id}`}
                          className="text-xs font-semibold text-brand hover:underline"
                        >
                          View →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
