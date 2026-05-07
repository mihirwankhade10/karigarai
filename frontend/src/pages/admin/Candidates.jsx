import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Star, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { mockApi } from '../../lib/mockApi';
import {
  KARNATAKA_DISTRICTS,
  TRADE_CATEGORIES,
  FITMENT_CATEGORIES,
} from '../../lib/mockData';
import { useAppStore } from '../../store/appStore';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { CandidateAvatar } from '../../components/ui/CandidateAvatar';
import { FitmentBadge } from '../../components/ui/FitmentBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { fitmentTheme, scoreColor, cn } from '../../lib/utils';

const PAGE_SIZE = 10;

const initialFilters = {
  search: '',
  district: 'all',
  tradeCategory: 'all',
  fitmentCategory: 'all',
  language: 'all',
  dateFrom: '',
  dateTo: '',
};

export default function Candidates() {
  const [filters, setFilters] = useState(initialFilters);
  const [list, setList] = useState(null);
  const [page, setPage] = useState(1);
  const toggleShortlistLocal = useAppStore((s) => s.toggleShortlist);

  const fetchList = (f) => mockApi.getCandidates(f).then((d) => { setList(d); }).catch(() => setList([]));

  useEffect(() => {
    let alive = true;
    setList(null);
    mockApi.getCandidates(filters).then((d) => {
      if (!alive) return;
      setList(d);
      setPage(1);
    }).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [filters]);

  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const reset = () => setFilters(initialFilters);

  const handleToggleShortlist = async (c) => {
    const action = c.shortlisted ? 'remove' : 'add';
    try {
      await mockApi.shortlistCandidate(c.id, action);
      toggleShortlistLocal(c.id); // keep Zustand cache in sync for any other consumers
      fetchList(filters);
    } catch (err) {
      // Refresh anyway in case server state changed
      fetchList(filters);
    }
  };

  const totalPages = list ? Math.max(1, Math.ceil(list.length / PAGE_SIZE)) : 1;
  const pageRows = useMemo(() => {
    if (!list) return [];
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, page]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 md:p-8 max-w-7xl mx-auto"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Candidates</h1>
          <p className="text-sm text-slate-500">
            {list ? `Showing ${pageRows.length} of ${list.length} candidates` : 'Loading...'}
          </p>
        </div>
      </div>

      <Card className="p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or phone..."
              value={filters.search}
              onChange={(e) => update('search', e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filters.district} onChange={(e) => update('district', e.target.value)}>
            <option value="all">All Districts</option>
            {KARNATAKA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
          <Select value={filters.tradeCategory} onChange={(e) => update('tradeCategory', e.target.value)}>
            <option value="all">All Trades</option>
            {TRADE_CATEGORIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
          <Select value={filters.fitmentCategory} onChange={(e) => update('fitmentCategory', e.target.value)}>
            <option value="all">All Fitment</option>
            {FITMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{fitmentTheme(c).label}</option>
            ))}
          </Select>
          <Select value={filters.language} onChange={(e) => update('language', e.target.value)}>
            <option value="all">All Languages</option>
            <option value="kannada">Kannada</option>
            <option value="hindi">Hindi</option>
            <option value="english">English</option>
          </Select>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => update('dateFrom', e.target.value)}
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => update('dateTo', e.target.value)}
          />
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-slate-500">
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {list === null ? (
          <div className="p-10 flex items-center justify-center">
            <LoadingSpinner size={32} />
          </div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No candidates match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">District</th>
                  <th className="px-3 py-3">Trade</th>
                  <th className="px-3 py-3">Lang</th>
                  <th className="px-3 py-3">ACS</th>
                  <th className="px-3 py-3">Fitment</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => {
                  const sc = scoreColor(c.acsScore);
                  const isShort = !!c.shortlisted;
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
                      <td className="px-3 py-3 text-slate-500 text-xs uppercase">{(c.language || '').slice(0, 3)}</td>
                      <td className={cn('px-3 py-3 font-semibold tabular-nums', sc.text)}>{c.acsScore}</td>
                      <td className="px-3 py-3">
                        <FitmentBadge category={c.fitmentCategory} size="sm" showIcon={false} />
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span
                          className={cn(
                            'inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold',
                            c.status === 'flagged'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleToggleShortlist(c)}
                            title={isShort ? 'Remove from shortlist' : 'Shortlist'}
                            className={cn(
                              'h-8 w-8 inline-flex items-center justify-center rounded-lg transition',
                              isShort
                                ? 'text-amber-500 bg-amber-50'
                                : 'text-slate-400 hover:bg-slate-100'
                            )}
                          >
                            <Star className={cn('h-4 w-4', isShort && 'fill-current')} />
                          </button>
                          <Link
                            to={`/admin/candidates/${c.id}`}
                            className="text-brand font-semibold text-xs hover:underline"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {list && list.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
