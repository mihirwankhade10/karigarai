import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Star, CheckCircle2 } from 'lucide-react';
import { mockApi } from '../../lib/mockApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CandidateAvatar } from '../../components/ui/CandidateAvatar';
import { FitmentBadge } from '../../components/ui/FitmentBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { scoreColor, formatDate, cn } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';

export default function Shortlisted() {
  const [list, setList] = useState(null);
  const toast = useToast();

  const fetchList = () => mockApi.getShortlisted().then(setList).catch((err) => {
    toast.error(err?.message || 'Failed to load shortlist');
    setList([]);
  });
  useEffect(() => { fetchList(); }, []);

  const handleExport = async () => {
    if (!list?.length) {
      toast.warning('No shortlisted candidates to export');
      return;
    }
    try {
      const blob = await mockApi.exportShortlistCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `karigarai-shortlist-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error(err?.message || 'Export failed');
    }
  };

  const remove = async (id) => {
    try {
      await mockApi.shortlistCandidate(id, 'remove');
      toast.success('Removed from shortlist');
      fetchList();
    } catch (err) {
      toast.error(err?.message || 'Failed to remove');
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
            <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
            Shortlisted
          </h1>
          <p className="text-sm text-slate-500">
            {list === null ? 'Loading...' : `${list.length} candidates shortlisted`}
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2" disabled={!list?.length}>
          <Download className="h-4 w-4" /> Export to CSV
        </Button>
      </div>

      <Card className="overflow-hidden">
        {list === null ? (
          <div className="p-10 flex justify-center">
            <LoadingSpinner size={32} />
          </div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Star className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p>No candidates shortlisted yet \u2014 visit a candidate's detail page to add them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">District</th>
                  <th className="px-3 py-3">Trade</th>
                  <th className="px-3 py-3">ACS</th>
                  <th className="px-3 py-3">Fitment</th>
                  <th className="px-3 py-3">Shortlisted</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const sc = scoreColor(c.acsScore);
                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <CandidateAvatar src={c.photo} name={c.name} size={32} />
                          <Link
                            to={`/admin/candidates/${c.id}`}
                            className="font-semibold text-slate-800 hover:text-brand"
                          >
                            {c.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{c.phone}</td>
                      <td className="px-3 py-3 text-slate-700">{c.district}</td>
                      <td className="px-3 py-3 text-slate-700">{c.tradeCategory}</td>
                      <td className={cn('px-3 py-3 font-semibold tabular-nums', sc.text)}>{c.acsScore}</td>
                      <td className="px-3 py-3">
                        <FitmentBadge category={c.fitmentCategory} size="sm" showIcon={false} />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {c.shortlistedAt ? formatDate(c.shortlistedAt) : '\u2014'}
                        {c.shortlistedBy && (
                          <div className="text-[10px]">by {c.shortlistedBy}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => remove(c.id)}
                          className="text-xs text-slate-500 hover:text-danger font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {list && list.length > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {list.length} candidate{list.length !== 1 && 's'} ready for recruiter handoff
        </div>
      )}
    </motion.div>
  );
}
